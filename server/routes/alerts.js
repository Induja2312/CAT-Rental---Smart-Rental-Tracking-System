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
  }
});

module.exports = router;
