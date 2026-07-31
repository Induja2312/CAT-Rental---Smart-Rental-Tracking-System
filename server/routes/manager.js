const router = require('express').Router();
const Equipment = require('../models/Equipment');
const OperatorSession = require('../models/OperatorSession');
const { requireAuth, requireRole } = require('../middleware/auth');

const guard = [requireAuth, requireRole('manager', 'admin')];

const round2 = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);

// GET /api/manager/equipment
// Returns equipment scoped to the manager's assignedSites.
// Admin gets all equipment (assignedSites is empty in their token).
router.get('/equipment', ...guard, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'manager') {
      filter.siteId = { $in: req.user.assignedSites || [] };
    }

    const equipment = await Equipment.find(filter)
      .populate('siteId', 'name location')
      .populate('lastOperatorId', 'name email')
      .sort({ equipmentId: 1 });

    res.json(equipment.map((eq) => ({
      ...eq.toObject(),
      restTimeHours:      round2(eq.restTimeHours),
      maxWorkHoursPerDay: round2(eq.maxWorkHoursPerDay),
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/manager/sessions/:equipmentId
// Returns completed + active operator sessions for one equipment, newest first.
router.get('/sessions/:equipmentId', ...guard, async (req, res) => {
  try {
    const eq = await Equipment.findOne({ equipmentId: req.params.equipmentId });
    if (!eq) return res.status(404).json({ message: 'Equipment not found' });

    const sessions = await OperatorSession.find({ equipmentId: eq._id })
      .populate('operatorId', 'name email')
      .sort({ clockInTime: -1 })
      .limit(50);

    const result = sessions.map((s) => {
      const durationMs = s.clockOutTime
        ? new Date(s.clockOutTime) - new Date(s.clockInTime)
        : Date.now() - new Date(s.clockInTime);
      const durationHrs = round2(durationMs / 3_600_000);
      const idleUsed = round2(
        (s.idleHoursOnClockOut || 0) - (s.idleHoursOnClockIn || 0)
      );
      return {
        _id:          s._id,
        operator:     s.operatorId,
        clockInTime:  s.clockInTime,
        clockOutTime: s.clockOutTime,
        status:       s.status,
        durationHrs,
        idleUsedHrs:  Math.max(idleUsed, 0),
        engineDeltaHrs: round2(
          Math.max((s.engineHoursOnClockOut || 0) - (s.engineHoursOnClockIn || 0), 0)
        ),
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/manager/list — list available managers and their assigned sites
router.get('/list', ...guard, async (req, res) => {
  try {
    const User = require('../models/User');
    const managers = await User.find({ role: 'manager' }, 'name email assignedSites')
      .populate('assignedSites', 'name location status');
    res.json(managers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
