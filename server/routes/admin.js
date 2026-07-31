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

// GET /api/admin/sites — list all sites (filterable by ?status=pending|active)
router.get('/sites', ...guard, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const sites = await Site.find(filter).populate('submittedBy', 'name email').sort({ createdAt: -1 });
    res.json(sites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/sites
router.post('/sites', ...guard, async (req, res) => {
  try {
    const { name, lat, lng } = req.body;
    if (!name || lat == null || lng == null) return res.status(400).json({ message: 'name, lat and lng are required' });
    const site = await Site.create({ name, location: { lat: +lat, lng: +lng }, status: 'active' });
    res.status(201).json(site);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/sites/:id — edit or approve (set status=active)
router.put('/sites/:id', ...guard, async (req, res) => {
  try {
    const { name, lat, lng, status } = req.body;
    const update = {};
    if (name   !== undefined) update.name   = name;
    if (status !== undefined) update.status = status;
    if (lat    != null)       update['location.lat'] = +lat;
    if (lng    != null)       update['location.lng'] = +lng;
    const site = await Site.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!site) return res.status(404).json({ message: 'Site not found' });
    res.json(site);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/sites/:id
router.delete('/sites/:id', ...guard, async (req, res) => {
  try {
    const site = await Site.findByIdAndDelete(req.params.id);
    if (!site) return res.status(404).json({ message: 'Site not found' });
    res.json({ message: `${site.name} deleted` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const bcrypt = require('bcryptjs');

// GET /api/admin/users — list all users (managers, customers, admins, operators)
router.get('/users', ...guard, async (req, res) => {
  try {
    const filter = {};
    if (req.query.role && req.query.role !== 'all') {
      filter.role = req.query.role;
    }
    const users = await User.find(filter, '-passwordHash')
      .populate('assignedSites', 'name location status')
      .sort({ role: 1, name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/users — create a new manager or customer user
router.post('/users', ...guard, async (req, res) => {
  try {
    const { name, email, password, role, assignedSites } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    const targetRole = role || 'customer';
    if (!['manager', 'customer'].includes(targetRole)) {
      return res.status(400).json({ message: 'Role must be manager or customer' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: targetRole,
      assignedSites: targetRole === 'manager' ? (assignedSites || []) : [],
    });

    const populated = await User.findById(user._id, '-passwordHash')
      .populate('assignedSites', 'name location status');

    res.status(201).json(populated);
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 500).json({ message: err.message });
  }
});

// PUT /api/admin/users/:id — edit user
router.put('/users/:id', ...guard, async (req, res) => {
  try {
    const { name, email, password, role, assignedSites } = req.body;

    const update = {};
    if (name) update.name = name;
    if (email) update.email = email.toLowerCase();
    if (role && ['manager', 'customer'].includes(role)) update.role = role;
    if (assignedSites !== undefined) update.assignedSites = assignedSites;

    if (password && password.trim().length > 0) {
      update.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, select: '-passwordHash' })
      .populate('assignedSites', 'name location status');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/users/:id — delete user
router.delete('/users/:id', ...guard, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `User ${user.name} deleted successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
