const router = require('express').Router();
const Equipment = require('../models/Equipment');
const User = require('../models/User');
const Site = require('../models/Site');
const { requireAuth, requireRole } = require('../middleware/auth');

const guard = [requireAuth, requireRole('admin')];

const round2 = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);

// GET /api/admin/equipment
router.get('/equipment', ...guard, async (req, res) => {
  try {
    const equipment = await Equipment.find()
      .populate('siteId', 'name location')
      .populate('lastOperatorId', 'name email role')
      .sort({ equipmentId: 1 });

    const result = equipment.map((eq) => ({
      ...eq.toObject(),
      restTimeHours:      round2(eq.restTimeHours),
      maxWorkHoursPerDay: round2(eq.maxWorkHoursPerDay),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/equipment
router.post('/equipment', ...guard, async (req, res) => {
  try {
    const { equipmentId, type, class: cls, siteId, restTimeHours, maxWorkHoursPerDay } = req.body;
    if (!equipmentId || !type) return res.status(400).json({ message: 'equipmentId and type are required' });

    const eq = await Equipment.create({
      equipmentId,
      type,
      class:              cls || '',
      siteId:             siteId || null,
      restTimeHours:      round2(restTimeHours ?? 8),
      maxWorkHoursPerDay: round2(maxWorkHoursPerDay ?? 10),
    });

    res.status(201).json(eq);
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 500).json({ message: err.message });
  }
});

// PUT /api/admin/equipment/:id
router.put('/equipment/:id', ...guard, async (req, res) => {
  try {
    const { type, class: cls, siteId, restTimeHours, maxWorkHoursPerDay, lastOperatorId, status } = req.body;

    const update = {};
    if (type               !== undefined) update.type               = type;
    if (cls                !== undefined) update.class              = cls;
    if (siteId             !== undefined) update.siteId             = siteId || null;
    if (restTimeHours      !== undefined) update.restTimeHours      = round2(restTimeHours);
    if (maxWorkHoursPerDay !== undefined) update.maxWorkHoursPerDay = round2(maxWorkHoursPerDay);
    if (lastOperatorId     !== undefined) update.lastOperatorId     = lastOperatorId || null;
    if (status             !== undefined) update.status             = status;

    const eq = await Equipment.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('siteId', 'name location')
      .populate('lastOperatorId', 'name email role');

    if (!eq) return res.status(404).json({ message: 'Equipment not found' });
    res.json(eq);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/equipment/:id
router.delete('/equipment/:id', ...guard, async (req, res) => {
  try {
    const eq = await Equipment.findByIdAndDelete(req.params.id);
    if (!eq) return res.status(404).json({ message: 'Equipment not found' });
    res.json({ message: `${eq.equipmentId} deleted` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/managers — list all managers (for assign dropdown)
router.get('/managers', ...guard, async (req, res) => {
  try {
    const managers = await User.find({ role: 'manager' }, 'name email');
    res.json(managers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/sites — list all sites (for dropdowns)
router.get('/sites', ...guard, async (req, res) => {
  try {
    const sites = await Site.find({}, 'name location');
    res.json(sites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
