const router = require('express').Router();
const Equipment = require('../models/Equipment');
const Telemetry = require('../models/Telemetry');
const { getIO, TELEMETRY_UPDATE, EQUIPMENT_STATUS } = require('../sockets');

// Derive equipment status from telemetry values
const deriveStatus = (engineHours, fuelLevel) => {
  if (engineHours >= 10) return 'overdue';
  if (engineHours === 0)  return 'idle';
  return 'active';
};

// POST /api/telemetry/ingest
// Body: { equipmentId (string e.g. "EQX1001"), location, engineHoursToday, idleHoursToday, fuelLevel, operatorId }
router.post('/ingest', async (req, res) => {
  try {
    const { equipmentId, location, engineHoursToday, idleHoursToday, fuelLevel, operatorId } = req.body;

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
      operatorId:       operatorId || null,
    });

    // Emit telemetry update to all connected clients
    const io = getIO();
    io.emit(TELEMETRY_UPDATE, {
      equipmentId,
      location,
      engineHoursToday,
      idleHoursToday,
      fuelLevel,
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

    res.status(201).json({ id: record._id });
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

// GET /api/telemetry/:equipmentId — last N records for one equipment
router.get('/:equipmentId', async (req, res) => {
  try {
    const equipment = await Equipment.findOne({ equipmentId: req.params.equipmentId });
    if (!equipment) return res.status(404).json({ message: 'Not found' });
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
