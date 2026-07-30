const router = require('express').Router();
const Alert = require('../models/Alert');
const { requireAuth } = require('../middleware/auth');
const { getIO, ALERT_NEW } = require('../sockets');

// GET /api/alerts - Get all alerts (filterable by siteId / resolved status)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { siteId, resolved } = req.query;
    const filter = {};
    if (resolved !== undefined) {
      filter.resolved = resolved === 'true';
    }

    const alerts = await Alert.find(filter)
      .populate({
        path: 'equipmentId',
        populate: { path: 'siteId' },
      })
      .sort({ createdAt: -1 });

    // Optional siteId filter
    let filteredAlerts = alerts;
    if (siteId && siteId !== 'all') {
      filteredAlerts = alerts.filter(
        (a) => a.equipmentId?.siteId?._id?.toString() === siteId.toString()
      );
    }

    res.json(filteredAlerts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching alerts', error: err.message });
  }
});

// PUT /api/alerts/:id/resolve - Mark alert as resolved
router.put('/:id/resolve', requireAuth, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });

    alert.resolved = true;
    await alert.save();

    res.json({ message: 'Alert resolved successfully', alert });
  } catch (err) {
    res.status(500).json({ message: 'Error resolving alert', error: err.message });
  }
});

// POST /api/alerts - Create alert (used by customer/overdue or manual)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { equipmentId, type, message, severity } = req.body;
    if (!equipmentId || !type || !message) {
      return res.status(400).json({ message: 'Missing required alert fields' });
    }

    const alert = await Alert.create({
      equipmentId,
      type,
      message,
      severity: severity || 'medium',
      createdAt: new Date(),
    });

    const populatedAlert = await Alert.findById(alert._id).populate({
      path: 'equipmentId',
      populate: { path: 'siteId' },
    });

    try {
      const io = getIO();
      io.emit(ALERT_NEW, populatedAlert);
    } catch (e) {
      // Socket might not be initialized in test
    }

    res.status(201).json(populatedAlert);
  } catch (err) {
    res.status(500).json({ message: 'Error creating alert', error: err.message });
const Equipment = require('../models/Equipment');
const { getIO, ALERT_NEW } = require('../sockets');

// GET /api/alerts?siteId=&resolved=false
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.resolved !== undefined) filter.resolved = req.query.resolved === 'true';

    if (req.query.siteId) {
      // Collect all equipment on that site, then filter alerts by those ObjectIds
      const equipment = await Equipment.find({ siteId: req.query.siteId }, '_id');
      filter.equipmentId = { $in: equipment.map(e => e._id) };
    }

    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('equipmentId', 'equipmentId type siteId');

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/alerts
// Payload (agreed with Person C): { equipmentId: "EQX1001", type, message, severity }
router.post('/', async (req, res) => {
  try {
    const { equipmentId, type, message, severity } = req.body;

    const equipment = await Equipment.findOne({ equipmentId });
    if (!equipment) return res.status(404).json({ message: `Equipment ${equipmentId} not found` });

    // Deduplicate: skip if identical unresolved alert already open
    const existing = await Alert.findOne({ equipmentId: equipment._id, type, resolved: false });
    if (existing) return res.status(200).json({ deduplicated: true, id: existing._id });

    const alert = await Alert.create({ equipmentId: equipment._id, type, message, severity });

    getIO().emit(ALERT_NEW, { equipmentId, type, message, severity, _id: alert._id });

    res.status(201).json({ id: alert._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/alerts/:id/resolve
router.put('/:id/resolve', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { resolved: true },
      { new: true },
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
