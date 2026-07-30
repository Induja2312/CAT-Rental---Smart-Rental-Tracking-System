const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const Rental = require('../models/Rental');
const Equipment = require('../models/Equipment');
const User = require('../models/User');
const { raiseAlert } = require('../services/alertEngine');
const { sendNotification } = require('../services/emailService');
const PDFDocument = require('pdfkit');

const round2 = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);

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

        // Email notification — never throws
        const customer = await User.findById(req.user.id, 'email name').lean();
        if (customer?.email) {
          sendNotification(
            customer.email,
            `CAT Rental — Equipment ${rental.equipmentId.equipmentId} Overdue`,
            `Hi ${customer.name},\n\nYour rental for ${rental.equipmentId.type} (${rental.equipmentId.equipmentId}) was due on ${new Date(rental.checkOutDate).toLocaleDateString()} and is now overdue.\n\nPlease return the equipment as soon as possible.\n\n— CAT Rental Team`
          );
        }
      }
    }

    res.json(rentals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rentals/mine/report — PDF rental history for logged-in customer
router.get('/mine/report', requireAuth, requireRole('customer'), async (req, res) => {
  try {
    const rentals = await Rental.find({ customerId: req.user.id })
      .populate('equipmentId', 'equipmentId type')
      .sort({ checkInDate: -1 })
      .lean();

    const customer = await User.findById(req.user.id, 'name email').lean();

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="rental-report.pdf"');
    doc.pipe(res);

    // Title
    doc.fontSize(18).font('Helvetica-Bold').text('CAT Rental — Rental History Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Customer: ${customer?.name || 'N/A'}  |  Email: ${customer?.email || 'N/A'}`, { align: 'center' });
    doc.fontSize(9).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    // Table header
    const cols = { rank: 50, eqId: 110, type: 160, checkIn: 260, checkOut: 350, returned: 440, status: 510 };
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('#',                cols.rank,   doc.y, { continued: true });
    doc.text('Equipment ID',     cols.eqId,   doc.y, { continued: true });
    doc.text('Type',             cols.type,   doc.y, { continued: true });
    doc.text('Check-In',         cols.checkIn, doc.y, { continued: true });
    doc.text('Expected Return',  cols.checkOut, doc.y, { continued: true });
    doc.text('Actual Return',    cols.returned, doc.y, { continued: true });
    doc.text('Status',           cols.status,  doc.y);
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.3);

    // Rows
    doc.font('Helvetica').fontSize(8);
    rentals.forEach((r, i) => {
      const y = doc.y;
      const fmt = (d) => d ? new Date(d).toLocaleDateString() : '—';
      doc.text(String(i + 1),                                cols.rank,    y, { continued: true });
      doc.text(r.equipmentId?.equipmentId || 'N/A',          cols.eqId,    y, { continued: true });
      doc.text(r.equipmentId?.type || 'N/A',                 cols.type,    y, { continued: true });
      doc.text(fmt(r.checkInDate),                           cols.checkIn, y, { continued: true });
      doc.text(fmt(r.checkOutDate),                          cols.checkOut, y, { continued: true });
      doc.text(fmt(r.actualReturnDate),                      cols.returned, y, { continued: true });
      doc.text(r.status?.toUpperCase() || 'N/A',             cols.status,  y);
      doc.moveDown(0.4);
    });

    if (rentals.length === 0) {
      doc.text('No rental records found.', { align: 'center' });
    }

    doc.end();
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
