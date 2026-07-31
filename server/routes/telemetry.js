const router = require('express').Router();
const Equipment = require('../models/Equipment');
const Telemetry = require('../models/Telemetry');
const OperatorSession = require('../models/OperatorSession');
const { getIO, TELEMETRY_UPDATE, EQUIPMENT_STATUS } = require('../sockets');
const { checkAndAlert, raiseAlert } = require('../services/alertEngine');
const { computeForecast } = require('../services/forecastService');
const { checkAllRules } = require('../services/alertRules');
const axios = require('axios');

// ML Batch Processor
const mlBatch = [];
const ML_URL = 'http://localhost:8000';

setInterval(async () => {
  if (mlBatch.length === 0) return;
  const batchToProcess = [...mlBatch];
  mlBatch.length = 0;

  try {
    for (const data of batchToProcess) {
      const res = await axios.post(`${ML_URL}/predict`, data.features, { timeout: 3000 });
      if (res.data && res.data.is_anomaly) {
        await raiseAlert(
          data.equipmentObjectId,
          res.data.anomaly_type || 'ml_anomaly',
          `ML Anomaly detected: ${res.data.anomaly_type}`,
          'high'
        );
      }
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
      console.warn('ML Service unreachable, skipping batch:', err.message);
    } else {
      console.error('ML batch processing error:', err.message);
    }
  }
}, 30000);

// Derive equipment status from telemetry values
const deriveStatus = (engineHours, fuelLevel) => {
  if (engineHours >= 10) return 'overdue';
  if (engineHours === 0)  return 'idle';
  return 'active';
};

// POST /api/telemetry/ingest
// Body: { equipmentId (string e.g. "EQX1001"), location, engineHoursToday, idleHoursToday, fuelLevel, engineTemperature, operatorId }
router.post('/ingest', async (req, res) => {
  try {
    const { equipmentId, location, engineHoursToday, idleHoursToday, fuelLevel, engineTemperature, operatorId } = req.body;

    // Resolve string equipmentId -> Equipment document
    const equipment = await Equipment.findOne({ equipmentId });
    if (!equipment) return res.status(404).json({ message: `Equipment ${equipmentId} not found` });

    // Save telemetry record
    const record = await Telemetry.create({
      equipmentId:      equipment._id,
      location,
      engineHoursToday,
      idleHoursToday,
      fuelLevel,
      engineTemperature,
      operatorId:       operatorId || null,
    });

    // Fetch active session if any
    const activeSession = await OperatorSession.findOne({ equipmentId: equipment._id, status: 'active' });

    // Emit telemetry update to all connected clients
    const io = getIO();
    io.emit(TELEMETRY_UPDATE, {
      equipmentId,
      location,
      engineHoursToday,
      idleHoursToday,
      fuelLevel,
      engineTemperature,
      operatorId,
    });

    // Compute new status and emit EQUIPMENT_STATUS only if it changed
    const newStatus = deriveStatus(engineHoursToday, fuelLevel);
    if (equipment.status !== newStatus && equipment.status !== 'unassigned') {
      await Equipment.findByIdAndUpdate(equipment._id, {
        status:          newStatus,
        currentLocation: location,
        lastOperatorId:  operatorId || equipment.lastOperatorId,
      });
      io.emit(EQUIPMENT_STATUS, { equipmentId, status: newStatus });
    } else {
      // Always keep location current
      await Equipment.findByIdAndUpdate(equipment._id, {
        currentLocation: location,
        lastOperatorId:  operatorId || equipment.lastOperatorId,
      });
    }

    // Run alert rules asynchronously — don't block the ingest response
    checkAndAlert(equipment._id, equipmentId, engineHoursToday, idleHoursToday, operatorId)
      .catch(err => console.error('alertEngine error:', err.message));

    // NEW: Deterministic Alert Rules
    try {
      const alerts = checkAllRules(record, equipment, activeSession);
      for (const a of alerts) {
        await raiseAlert(equipment._id, a.type, a.message, a.severity);
      }
    } catch (e) {
      console.error('alertRules error:', e.message);
    }

    // Prepare ML Features
    let idleEngineRatio = idleHoursToday;
    if (engineHoursToday > 0) idleEngineRatio = idleHoursToday / engineHoursToday;
    
    let daysSinceOperatorAssigned = 0;
    if (!operatorId && !equipment.lastOperatorId) {
      daysSinceOperatorAssigned = 1; // Arbitrary fallback if never assigned
    }

    let sessionUtilizationRatio = 0;
    if (activeSession) {
      const sessionStartMs = new Date(activeSession.clockInTime).getTime();
      const nowMs = new Date().getTime();
      const sessionDurationHours = (nowMs - sessionStartMs) / (1000 * 60 * 60);
      if (sessionDurationHours > 0) {
        sessionUtilizationRatio = Math.min(1, engineHoursToday / sessionDurationHours);
      }
    }

    mlBatch.push({
      equipmentObjectId: equipment._id,
      features: {
        engineHoursToday: engineHoursToday || 0,
        idleHoursToday: idleHoursToday || 0,
        idleEngineRatio: idleEngineRatio,
        daysSinceOperatorAssigned: daysSinceOperatorAssigned,
        engineTemperature: engineTemperature || 75,
        sessionUtilizationRatio: sessionUtilizationRatio
      }
    });

    res.status(201).json({ id: record._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/telemetry/forecast — per-site moving-average trend (heuristic, not ML)
router.get('/forecast', async (req, res) => {
  try {
    const windowDays = Math.min(parseInt(req.query.window) || 3, 14);
    const forecasts = await computeForecast(windowDays);
    res.json({ windowDays, forecasts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/telemetry/latest — returns the most recent record per equipment (for Person B's map)
router.get('/latest', async (req, res) => {
  try {
    const latest = await Telemetry.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$equipmentId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
    ]);
    res.json(latest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const Rental = require('../models/Rental');
const { requireAuth } = require('../middleware/auth');

// GET /api/telemetry/:equipmentId — last N records for one equipment
router.get('/:equipmentId', requireAuth, async (req, res) => {
  try {
    const equipment = await Equipment.findOne({ equipmentId: req.params.equipmentId });
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });

    // Customer role authorization check: customer can view equipment they rent
    if (req.user.role === 'customer') {
      const activeRental = await Rental.findOne({
        customerId: req.user.id,
        equipmentId: equipment._id,
      });
      if (!activeRental) {
        return res.status(403).json({ message: 'Access denied. You do not have an active rental for this equipment.' });
      }
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const records = await Telemetry.find({ equipmentId: equipment._id })
      .sort({ timestamp: -1 })
      .limit(limit);
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
