const router = require('express').Router();
const Alert = require('../models/Alert');
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
