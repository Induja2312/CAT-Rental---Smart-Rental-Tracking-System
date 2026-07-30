const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { requireAuth, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Site = require('../models/Site');
const Equipment = require('../models/Equipment');
const Alert = require('../models/Alert');

// Protect all admin routes with requireAuth and requireRole("admin")
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/overview (counts: total equipment, active managers, open alerts)
router.get('/overview', async (req, res) => {
  try {
    const [totalEquipment, activeManagers, openAlerts] = await Promise.all([
      Equipment.countDocuments(),
      User.countDocuments({ role: 'manager' }),
      Alert.countDocuments({ resolved: false }),
    ]);

    res.json({
      totalEquipment,
      activeManagers,
      openAlerts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/sites (helper route to get all available sites for site assignment)
router.get('/sites', async (req, res) => {
  try {
    const sites = await Site.find();
    res.json(sites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/managers (create a manager: name, email, password, assignedSites)
router.post('/managers', async (req, res) => {
  try {
    const { name, email, password, assignedSites } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const manager = await User.create({
      name,
      email,
      passwordHash,
      role: 'manager',
      assignedSites: assignedSites || [],
    });

    const populatedManager = await User.findById(manager._id)
      .select('-passwordHash')
      .populate('assignedSites');

    res.status(201).json(populatedManager);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/admin/managers (list all managers + their assigned sites/equipment)
router.get('/managers', async (req, res) => {
  try {
    const managers = await User.find({ role: 'manager' })
      .select('-passwordHash')
      .populate('assignedSites')
      .lean();

    const allEquipment = await Equipment.find().populate('siteId').lean();

    const managersWithEquipment = managers.map(manager => {
      const siteIds = (manager.assignedSites || []).map(s => s._id.toString());
      const equipment = allEquipment.filter(e => e.siteId && siteIds.includes(e.siteId._id.toString()));
      return {
        ...manager,
        equipment,
      };
    });

    res.json(managersWithEquipment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/managers/:id (edit assigned sites)
router.put('/managers/:id', async (req, res) => {
  try {
    const { assignedSites } = req.body;
    const manager = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'manager' },
      { assignedSites: assignedSites || [] },
      { new: true }
    )
      .select('-passwordHash')
      .populate('assignedSites');

    if (!manager) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    res.json(manager);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/admin/managers/:id (remove manager)
router.delete('/managers/:id', async (req, res) => {
  try {
    const manager = await User.findOneAndDelete({ _id: req.params.id, role: 'manager' });
    if (!manager) {
      return res.status(404).json({ message: 'Manager not found' });
    }
    res.json({ message: 'Manager deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
