const router = require('express').Router();
const Equipment = require('../models/Equipment');
const Telemetry = require('../models/Telemetry');
const OperatorSession = require('../models/OperatorSession');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');
const { raiseAlert } = require('../services/alertEngine');

const round2 = (v) => Math.round(v * 100) / 100;

// POST /api/operator/clockin
router.post('/clockin', requireAuth, requireRole('operator', 'admin', 'manager'), async (req, res) => {
  try {
    const { equipmentId } = req.body;
    if (!equipmentId) return res.status(400).json({ message: 'equipmentId is required' });

    let equipment = await Equipment.findOne({ equipmentId });
    if (!equipment) {
      equipment = await Equipment.findById(equipmentId).catch(() => null);
    }
    if (!equipment) return res.status(404).json({ message: `Equipment ${equipmentId} not found` });

    // Check if operator is already clocked into another active session
    const existingActive = await OperatorSession.findOne({
      operatorId: req.user.id,
      status: 'active',
    });
    if (existingActive) {
      return res.status(400).json({
        message: `You are already clocked in to machine ID ${existingActive.equipmentId}. Clock out first.`,
      });
    }

    // Get current telemetry for baseline hours
    const latestTelem = await Telemetry.findOne({ equipmentId: equipment._id }).sort({ timestamp: -1 });

    const session = await OperatorSession.create({
      operatorId: req.user.id,
      equipmentId: equipment._id,
      clockInTime: new Date(),
      status: 'active',
      engineHoursOnClockIn: latestTelem?.engineHoursToday || 0,
      idleHoursOnClockIn: latestTelem?.idleHoursToday || 0,
    });

    equipment.lastOperatorId = req.user.id;
    await equipment.save();

    res.status(201).json({ message: `Successfully clocked in to ${equipment.equipmentId}`, session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/operator/checkout or clockout
router.post('/clockout', requireAuth, requireRole('operator', 'admin', 'manager'), async (req, res) => {
  try {
    const activeSession = await OperatorSession.findOne({
      operatorId: req.user.id,
      status: 'active',
    }).populate('equipmentId');

    if (!activeSession) {
      return res.status(404).json({ message: 'No active clock-in session found for this operator.' });
    }

    const eq = activeSession.equipmentId;
    const latestTelem = await Telemetry.findOne({ equipmentId: eq._id }).sort({ timestamp: -1 });

    activeSession.clockOutTime = new Date();
    activeSession.status = 'completed';
    activeSession.engineHoursOnClockOut = latestTelem?.engineHoursToday || 0;
    activeSession.idleHoursOnClockOut = latestTelem?.idleHoursToday || 0;
    await activeSession.save();

    res.json({ message: `Clocked out of ${eq.equipmentId}`, session: activeSession });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/operator/active — Get active clock-in for currently logged in operator
router.get('/active', requireAuth, async (req, res) => {
  try {
    const activeSession = await OperatorSession.findOne({
      operatorId: req.user.id,
      status: 'active',
    }).populate('equipmentId');

    res.json(activeSession || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/operator/fleet-activity — List all active operators & telemetry cross-reference (for Fleet Manager & Admin)
router.get('/fleet-activity', requireAuth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const activeSessions = await OperatorSession.find({ status: 'active' })
      .populate('operatorId', 'name email')
      .populate({ path: 'equipmentId', populate: { path: 'siteId' } });

    const now = new Date();

    const activityList = await Promise.all(
      activeSessions.map(async (sess) => {
        const eq = sess.equipmentId;
        if (!eq) return null;

        const latestTelem = await Telemetry.findOne({ equipmentId: eq._id }).sort({ timestamp: -1 });

        const clockedHours = (now - new Date(sess.clockInTime)) / (1000 * 60 * 60);
        const engineHoursGained = (latestTelem?.engineHoursToday || 0) - sess.engineHoursOnClockIn;
        const idleHoursGained = (latestTelem?.idleHoursToday || 0) - sess.idleHoursOnClockIn;

        const totalHoursOnClock = Math.max(engineHoursGained + idleHoursGained, 0.1);
        const efficiencyPct = Math.min(Math.round((engineHoursGained / totalHoursOnClock) * 100), 100);

        // Flag voluntary underuse / time wasting: clocked in > 1 hr, efficiency < 30%, or high idle
        const isTimeWasting = clockedHours >= 1.0 && (efficiencyPct < 30 || idleHoursGained > 2.0);

        if (isTimeWasting) {
          raiseAlert(
            eq._id,
            'underuse',
            `Operator ${sess.operatorId?.name || 'Unknown'} clocked in on ${eq.equipmentId} for ${round2(clockedHours)}h but machine idle time is ${round2(idleHoursGained)}h (Efficiency: ${efficiencyPct}%)`,
            'high'
          ).catch(() => {});
        }

        return {
          sessionId: sess._id,
          operator: sess.operatorId,
          equipment: {
            _id: eq._id,
            equipmentId: eq.equipmentId,
            type: eq.type,
            site: eq.siteId?.name || 'Unassigned Depot',
            status: eq.status,
          },
          clockInTime: sess.clockInTime,
          clockedHours: round2(clockedHours),
          engineHoursToday: round2(latestTelem?.engineHoursToday || 0),
          idleHoursToday: round2(latestTelem?.idleHoursToday || 0),
          efficiencyPct,
          isTimeWasting,
        };
      })
    );

    res.json(activityList.filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
