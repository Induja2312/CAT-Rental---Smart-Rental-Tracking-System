const router = require('express').Router();
const Alert = require('../models/Alert');
const Equipment = require('../models/Equipment');
const { requireAuth } = require('../middleware/auth');
const { getIO, ALERT_NEW } = require('../sockets');

// GET /api/alerts?siteId=&resolved=
router.get('/', requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.resolved !== undefined) filter.resolved = req.query.resolved === 'true';
    if (req.query.siteId && req.query.siteId !== 'all') {
      const equipment = await Equipment.find({ siteId: req.query.siteId }, '_id');
      filter.equipmentId = { $in: equipment.map(e => e._id) };
    }
    const alerts = await Alert.find(filter)
      .populate({ path: 'equipmentId', populate: { path: 'siteId' } })
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/alerts — accepts { equipmentId (string "EQX1001" or ObjectId), type, message, severity }
// No requireAuth — called internally by rentals.js and alertEngine; external callers must still pass token
router.post('/', async (req, res) => {
  try {
    const { equipmentId, type, message, severity } = req.body;
    if (!equipmentId || !type || !message) {
      return res.status(400).json({ message: 'equipmentId, type and message are required' });
    }

    // Resolve string equipmentId ("EQX1001") or ObjectId
    let equipmentObjectId = equipmentId;
    if (typeof equipmentId === 'string' && !equipmentId.match(/^[0-9a-fA-F]{24}$/)) {
      const eq = await Equipment.findOne({ equipmentId });
      if (!eq) return res.status(404).json({ message: `Equipment ${equipmentId} not found` });
      equipmentObjectId = eq._id;
    }

    const existing = await Alert.findOne({ equipmentId: equipmentObjectId, type, resolved: false });
    if (existing) return res.status(200).json({ deduplicated: true, id: existing._id });

    const alert = await Alert.create({
      equipmentId: equipmentObjectId,
      type,
      message,
      severity: severity || 'medium',
    });

    const populated = await Alert.findById(alert._id)
      .populate({ path: 'equipmentId', populate: { path: 'siteId' } });

    try { getIO().emit(ALERT_NEW, populated); } catch (_) {}

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/alerts/:id/resolve
router.put('/:id/resolve', requireAuth, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { resolved: true },
      { new: true }
    ).populate({ path: 'equipmentId', populate: { path: 'siteId' } });
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
