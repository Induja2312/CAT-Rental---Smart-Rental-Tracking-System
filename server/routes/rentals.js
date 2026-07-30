const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const Rental = require('../models/Rental');
const Equipment = require('../models/Equipment');
const { raiseAlert } = require('../services/alertEngine');

// GET /api/rentals/mine
router.get('/mine', requireAuth, requireRole('customer'), async (req, res) => {
  try {
    const rentals = await Rental.find({ customerId: req.user.id }).populate('equipmentId');
    const now = new Date();

    for (const rental of rentals) {
      if (rental.status === 'ongoing' && rental.checkOutDate < now) {
        rental.status = 'overdue';
        await rental.save();
        raiseAlert(
          rental.equipmentId._id,
          'overdue',
          `Rental for equipment ${rental.equipmentId.equipmentId} is overdue`,
          'high'
        ).catch(err => console.error('raiseAlert error:', err.message));
      }
    }

    res.json(rentals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/rentals/checkin
router.post('/checkin', requireAuth, requireRole('customer'), async (req, res) => {
  try {
    const { equipmentId } = req.body;
    const eq = await Equipment.findOne({ equipmentId });
    if (!eq) return res.status(404).json({ message: 'Equipment not found' });

    const existing = await Rental.findOne({ equipmentId: eq._id, status: { $in: ['ongoing', 'overdue'] } });
    if (existing) return res.status(400).json({ message: 'Equipment is already rented out' });

    const checkInDate = new Date();
    const checkOutDate = new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000);

    const rental = await Rental.create({
      equipmentId: eq._id,
      customerId: req.user.id,
      checkInDate,
      checkOutDate,
      status: 'ongoing',
    });

    res.status(201).json(rental);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/rentals/checkout
router.post('/checkout', requireAuth, requireRole('customer'), async (req, res) => {
  try {
    const { equipmentId } = req.body;
    const eq = await Equipment.findOne({ equipmentId });
    if (!eq) return res.status(404).json({ message: 'Equipment not found' });

    const rental = await Rental.findOne({
      equipmentId: eq._id,
      customerId: req.user.id,
      status: { $in: ['ongoing', 'overdue'] },
    });
    if (!rental) return res.status(404).json({ message: 'Active rental not found for this equipment' });

    rental.status = 'returned';
    rental.actualReturnDate = new Date();
    await rental.save();

    res.json(rental);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rentals/:id/status
router.get('/:id/status', requireAuth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    res.json({ status: rental.status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
