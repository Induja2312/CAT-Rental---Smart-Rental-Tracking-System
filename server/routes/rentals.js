const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const Rental = require('../models/Rental');
const Equipment = require('../models/Equipment');

router.get('/mine', requireAuth, requireRole('customer'), async (req, res) => {
  try {
    const rentals = await Rental.find({ customerId: req.user.id }).populate('equipmentId');
    
    // Check for overdue rentals
    const now = new Date();
    for (let rental of rentals) {
      if (rental.status === 'ongoing' && rental.checkOutDate < now) {
        rental.status = 'overdue';
        await rental.save();
        
        // POST to /api/alerts (Person D's route)
        try {
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          await fetch(`${baseUrl}/api/alerts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.authorization // Forward the token
            },
            body: JSON.stringify({
              equipmentId: rental.equipmentId._id,
              type: 'overdue',
              message: `Rental for equipment ${rental.equipmentId.equipmentId} is overdue.`,
              severity: 'high'
            })
          });
        } catch (err) {
          console.error('Failed to post alert:', err.message);
        }
      }
    }

    res.json(rentals);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/checkin', requireAuth, requireRole('customer'), async (req, res) => {
  try {
    const { equipmentId } = req.body;
    const eq = await Equipment.findOne({ equipmentId });
    
    if (!eq) return res.status(404).json({ message: 'Equipment not found' });

    // Check if there is already an active rental for this equipment
    const existing = await Rental.findOne({ equipmentId: eq._id, status: { $in: ['ongoing', 'overdue'] } });
    if (existing) {
      return res.status(400).json({ message: 'Equipment is already rented out.' });
    }

    const checkInDate = new Date();
    const checkOutDate = new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000); // Default 1 day

    const rental = new Rental({
      equipmentId: eq._id,
      customerId: req.user.id,
      checkInDate,
      checkOutDate,
      status: 'ongoing'
    });

    await rental.save();
    res.status(201).json(rental);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/checkout', requireAuth, requireRole('customer'), async (req, res) => {
  try {
    const { equipmentId } = req.body;
    const eq = await Equipment.findOne({ equipmentId });
    
    if (!eq) return res.status(404).json({ message: 'Equipment not found' });

    const rental = await Rental.findOne({
      equipmentId: eq._id,
      customerId: req.user.id,
      status: { $in: ['ongoing', 'overdue'] }
    });

    if (!rental) {
      return res.status(404).json({ message: 'Active rental not found for this equipment' });
    }

    rental.status = 'returned';
    rental.actualReturnDate = new Date();
    await rental.save();

    res.json(rental);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id/status', requireAuth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    res.json({ status: rental.status });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
