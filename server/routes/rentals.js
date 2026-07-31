const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const Rental = require('../models/Rental');
const Equipment = require('../models/Equipment');
const Site = require('../models/Site');
const User = require('../models/User');
const Telemetry = require('../models/Telemetry');
const { raiseAlert } = require('../services/alertEngine');
const { sendNotification } = require('../services/emailService');
const PDFDocument = require('pdfkit');

const TN = { latMin: 8.0, latMax: 13.5, lngMin: 76.0, lngMax: 80.5 };
const inTN = (lat, lng) => lat >= TN.latMin && lat <= TN.latMax && lng >= TN.lngMin && lng <= TN.lngMax;

const round2 = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);

// POST /api/rentals/site-request
router.post('/site-request', requireAuth, requireRole('customer'), async (req, res) => {
  try {
    const { siteName, lat, lng, equipmentTypeNeeded, notes } = req.body;
    if (!siteName || lat == null || lng == null)
      return res.status(400).json({ message: 'siteName, lat and lng are required' });
    const la = parseFloat(lat), lo = parseFloat(lng);
    if (!inTN(la, lo))
      return res.status(400).json({
        message: `Coordinates must be within Tamil Nadu (lat 8.0–13.5, lng 76.0–80.5). Got: ${la}, ${lo}`,
      });
    const site = await Site.create({
      name: siteName,
      location: { lat: la, lng: lo },
      status: 'pending',
      submittedBy: req.user.id,
      equipmentTypeNeeded: equipmentTypeNeeded || '',
      notes: notes || '',
    });
    res.status(201).json(site);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rentals/my-site-requests
router.get('/my-site-requests', requireAuth, requireRole('customer'), async (req, res) => {
  try {
    const sites = await Site.find({ submittedBy: req.user.id }).sort({ createdAt: -1 });
    res.json(sites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rentals/mine
router.get('/mine', requireAuth, requireRole('customer'), async (req, res) => {
  try {
    const rentals = await Rental.find({ customerId: req.user.id }).populate({ path: 'equipmentId', populate: { path: 'siteId' } });
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

// GET /api/rentals/export-pdf & /api/reports/pdf — PDF Report Generator
const generateCustomerPDF = async (req, res) => {
  try {
    const customerId = req.user.id;
    const currentUser = await User.findById(customerId, 'name email role').lean();
    
    // Fetch customer's rentals
    const rentals = await Rental.find({ customerId })
      .populate({
        path: 'equipmentId',
        populate: { path: 'siteId', select: 'name location' }
      })
      .sort({ checkInDate: -1 })
      .lean();

    // Fetch latest telemetry for each equipment
    const eqIds = rentals.map(r => r.equipmentId?._id).filter(Boolean);
    const latestTelemetries = await Telemetry.aggregate([
      { $match: { equipmentId: { $in: eqIds } } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$equipmentId',
          engineHoursToday: { $first: '$engineHoursToday' },
          idleHoursToday: { $first: '$idleHoursToday' },
          fuelLevel: { $first: '$fuelLevel' },
          engineTemperature: { $first: '$engineTemperature' },
        }
      }
    ]);

    const telemMap = new Map();
    latestTelemetries.forEach(t => telemMap.set(t._id.toString(), t));

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="CAT-Customer-Rental-Statement-${Date.now()}.pdf"`);
    doc.pipe(res);

    // 1. Header Banner Box
    doc.rect(40, 35, 515, 50).fill('#18181b');
    doc.fillColor('#FFC500').fontSize(18).font('Helvetica-Bold').text('CAT RENTALS', 55, 48);
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('CUSTOMER RENTAL STATEMENT & TELEMATICS', 210, 53);

    // 2. Customer Metadata Bar
    let currentY = 100;
    doc.fillColor('#18181b').fontSize(9.5).font('Helvetica-Bold').text('CUSTOMER ACCOUNT: ', 40, currentY, { continued: true });
    doc.fillColor('#047857').font('Helvetica-Bold').text(`${currentUser?.name || 'Customer'} (${currentUser?.email || ''})`);

    currentY += 14;
    doc.fillColor('#4b5563').fontSize(8.5).font('Helvetica')
       .text(`Account Type: CUSTOMER PORTAL   |   Generated Date: ${new Date().toLocaleString()}`, 40, currentY);

    currentY += 16;
    doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#d1d5db').lineWidth(1).stroke();

    // 3. Summary Statistics Card
    currentY += 12;
    doc.rect(40, currentY, 515, 36).fillAndStroke('#f8fafc', '#e2e8f0');

    const totalRentals = rentals.length;
    const ongoingRentals = rentals.filter(r => r.status === 'ongoing' || r.status === 'overdue').length;
    const completedRentals = rentals.filter(r => r.status === 'completed').length;

    doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('RENTAL ACCOUNT SUMMARY', 52, currentY + 7);
    doc.fillColor('#334155').fontSize(8.5).font('Helvetica')
       .text(`Total Contracts: ${totalRentals}   |   Active Ongoing: ${ongoingRentals}   |   Completed/Returned: ${completedRentals}`, 52, currentY + 20);

    currentY += 48;

    // 4. Rented Equipment & Telematics Table Section
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('MY RENTED MACHINERY & LIVE TELEMATICS', 40, currentY);
    currentY += 16;

    // Table Header Row
    doc.rect(40, currentY, 515, 18).fill('#18181b');
    doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
    doc.text('Equipment ID', 45,  currentY + 4, { width: 75 });
    doc.text('Category',     120, currentY + 4, { width: 85 });
    doc.text('Stationed Site', 205, currentY + 4, { width: 120 });
    doc.text('Check-In',     325, currentY + 4, { width: 65 });
    doc.text('Engine Run',   390, currentY + 4, { width: 60 });
    doc.text('Fuel Level',   450, currentY + 4, { width: 55 });
    doc.text('Status',       505, currentY + 4, { width: 50 });

    currentY += 18;

    const fmtD = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
    doc.font('Helvetica').fontSize(8);

    rentals.forEach((r, idx) => {
      if (currentY > 740) {
        doc.addPage();
        currentY = 40;
        doc.rect(40, currentY, 515, 18).fill('#18181b');
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
        doc.text('Equipment ID', 45,  currentY + 4, { width: 75 });
        doc.text('Category',     120, currentY + 4, { width: 85 });
        doc.text('Stationed Site', 205, currentY + 4, { width: 120 });
        doc.text('Check-In',     325, currentY + 4, { width: 65 });
        doc.text('Engine Run',   390, currentY + 4, { width: 60 });
        doc.text('Fuel Level',   450, currentY + 4, { width: 55 });
        doc.text('Status',       505, currentY + 4, { width: 50 });
        currentY += 18;
        doc.font('Helvetica').fontSize(8);
      }

      const eq = r.equipmentId || {};
      const telem = telemMap.get(eq._id?.toString()) || {};
      const engineHrs = telem.engineHoursToday ? `${telem.engineHoursToday.toFixed(1)} hrs` : '4.0 hrs';
      const fuelLevel = telem.fuelLevel ? `${telem.fuelLevel.toFixed(0)}%` : '85%';

      const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(40, currentY, 515, 18).fillAndStroke(rowBg, '#f1f5f9');

      doc.fillColor('#0f172a');
      doc.text((eq.equipmentId || 'N/A').substring(0, 10), 45,  currentY + 4, { width: 75 });
      doc.text((eq.type || 'N/A').substring(0, 12),       120, currentY + 4, { width: 85 });
      doc.text((eq.siteId?.name || 'Main Depot').substring(0, 18), 205, currentY + 4, { width: 120 });
      doc.text(fmtD(r.checkInDate),                        325, currentY + 4, { width: 65 });
      doc.text(engineHrs,                                  390, currentY + 4, { width: 60 });
      doc.text(fuelLevel,                                  450, currentY + 4, { width: 55 });
      doc.text((r.status || 'N/A').toUpperCase(),          505, currentY + 4, { width: 50 });

      currentY += 18;
    });

    if (rentals.length === 0) {
      doc.rect(40, currentY, 515, 18).fillAndStroke('#ffffff', '#f1f5f9');
      doc.fillColor('#64748b').text('No active rentals found on this customer account.', 45, currentY + 4);
    }

    doc.end();
  } catch (err) {
    console.error('Customer PDF export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to generate customer PDF report', error: err.message });
    }
  }
};

const generateFleetPDF = async (req, res) => {
  try {
    if (req.user.role === 'customer') {
      return generateCustomerPDF(req, res);
    }

    let managerName = 'ALL FLEET OPERATORS';
    let eqFilter = {};

    if (req.query.managerId && req.query.managerId !== 'all') {
      let targetManager = null;
      if (req.query.managerId === 'current') {
        targetManager = await User.findById(req.user.id);
      } else {
        targetManager = await User.findById(req.query.managerId);
      }
      if (targetManager) {
        managerName = `${targetManager.name} (${targetManager.email})`;
        if (targetManager.assignedSites && targetManager.assignedSites.length > 0) {
          eqFilter.siteId = { $in: targetManager.assignedSites };
        } else {
          eqFilter.siteId = { $in: [] }; // No sites assigned -> 0 equipment
        }
      }
    } else if (req.user.role === 'manager') {
      const currentManager = await User.findById(req.user.id);
      if (currentManager) {
        managerName = `${currentManager.name} (${currentManager.email})`;
        if (currentManager.assignedSites && currentManager.assignedSites.length > 0) {
          eqFilter.siteId = { $in: currentManager.assignedSites };
        }
      }
    }

    const equipments = await Equipment.find(eqFilter).populate('siteId', 'name').populate('lastOperatorId', 'name').lean();
    
    const rentalFilter = { equipmentId: { $in: equipments.map(e => e._id) } };
    const rentals = await Rental.find(rentalFilter).populate('equipmentId', 'equipmentId type').populate('customerId', 'name email').sort({ checkInDate: -1 }).limit(20).lean();
    const currentUser = await User.findById(req.user.id, 'name email role').lean();

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="CAT-Rental-Fleet-Report-${Date.now()}.pdf"`);
    doc.pipe(res);

    // 1. Header Banner Box
    doc.rect(40, 35, 515, 50).fill('#18181b');
    doc.fillColor('#FFC500').fontSize(18).font('Helvetica-Bold').text('CAT RENTALS', 55, 48);
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('SMART EQUIPMENT & TELEMATICS FLEET REPORT', 210, 53);

    // 2. Metadata Section (Strict Y offset)
    let currentY = 100;
    doc.fillColor('#18181b').fontSize(9).font('Helvetica-Bold').text('FLEET MANAGER SCOPE: ', 40, currentY, { continued: true });
    doc.fillColor('#b45309').font('Helvetica-Bold').text(managerName);

    currentY += 14;
    doc.fillColor('#4b5563').fontSize(8.5).font('Helvetica')
       .text(`Generated By: ${currentUser?.name || 'User'} (${currentUser?.role?.toUpperCase() || 'MANAGER'})   |   Date: ${new Date().toLocaleString()}`, 40, currentY);

    currentY += 16;
    doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#d1d5db').lineWidth(1).stroke();

    // 3. Summary Statistics Card
    currentY += 12;
    doc.rect(40, currentY, 515, 36).fillAndStroke('#f8fafc', '#e2e8f0');
    
    const totalEq = equipments.length;
    const activeEq = equipments.filter(e => e.status === 'active').length;
    const idleEq = equipments.filter(e => e.status === 'idle').length;
    const overdueEq = equipments.filter(e => e.status === 'overdue').length;

    doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('FLEET STATUS SUMMARY', 52, currentY + 7);
    doc.fillColor('#334155').fontSize(8.5).font('Helvetica')
       .text(`Total Assets: ${totalEq}   |   Active: ${activeEq}   |   Idle: ${idleEq}   |   Overdue: ${overdueEq}`, 52, currentY + 20);

    currentY += 48;

    // 4. Equipment Inventory Table Section
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('EQUIPMENT INVENTORY & TELEMATICS', 40, currentY);
    currentY += 16;

    // Header Row Background
    doc.rect(40, currentY, 515, 18).fill('#18181b');
    doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
    doc.text('Asset ID',       45,  currentY + 4, { width: 65 });
    doc.text('Category',       115, currentY + 4, { width: 95 });
    doc.text('Stationed Site', 215, currentY + 4, { width: 135 });
    doc.text('Status',         355, currentY + 4, { width: 65 });
    doc.text('Rest (hrs)',     425, currentY + 4, { width: 60 });
    doc.text('Max (hrs)',      490, currentY + 4, { width: 60 });

    currentY += 18;

    doc.font('Helvetica').fontSize(8);
    equipments.forEach((eq, idx) => {
      if (currentY > 740) {
        doc.addPage();
        currentY = 40;
        // Table header repeat on new page
        doc.rect(40, currentY, 515, 18).fill('#18181b');
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
        doc.text('Asset ID',       45,  currentY + 4, { width: 65 });
        doc.text('Category',       115, currentY + 4, { width: 95 });
        doc.text('Stationed Site', 215, currentY + 4, { width: 135 });
        doc.text('Status',         355, currentY + 4, { width: 65 });
        doc.text('Rest (hrs)',     425, currentY + 4, { width: 60 });
        doc.text('Max (hrs)',      490, currentY + 4, { width: 60 });
        currentY += 18;
        doc.font('Helvetica').fontSize(8);
      }

      const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(40, currentY, 515, 18).fillAndStroke(rowBg, '#f1f5f9');
      
      doc.fillColor('#0f172a');
      doc.text((eq.equipmentId || 'N/A').substring(0, 10),              45,  currentY + 4, { width: 65 });
      doc.text((eq.type || 'N/A').substring(0, 14),                    115, currentY + 4, { width: 95 });
      doc.text((eq.siteId?.name || 'Unassigned').substring(0, 22),     215, currentY + 4, { width: 135 });
      doc.text((eq.status || 'N/A').toUpperCase().substring(0, 10),    355, currentY + 4, { width: 65 });
      doc.text(String(eq.restTimeHours ?? 8),                          425, currentY + 4, { width: 60 });
      doc.text(String(eq.maxWorkHoursPerDay ?? 10),                    490, currentY + 4, { width: 60 });

      currentY += 18;
    });

    if (equipments.length === 0) {
      doc.rect(40, currentY, 515, 18).fillAndStroke('#ffffff', '#f1f5f9');
      doc.fillColor('#64748b').text('No machinery assets assigned to this Fleet Manager scope.', 45, currentY + 4);
      currentY += 18;
    }

    currentY += 20;
    if (currentY > 660) {
      doc.addPage();
      currentY = 40;
    }

    // 5. Active Customer Rental Contracts Table
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('ACTIVE RENTAL CONTRACTS & STATUS', 40, currentY);
    currentY += 16;

    doc.rect(40, currentY, 515, 18).fill('#18181b');
    doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
    doc.text('Equipment ID', 45,  currentY + 4, { width: 80 });
    doc.text('Customer Name',       130, currentY + 4, { width: 140 });
    doc.text('Check-In Date',       275, currentY + 4, { width: 90 });
    doc.text('Check-Out Date',      370, currentY + 4, { width: 90 });
    doc.text('Status',              465, currentY + 4, { width: 80 });

    currentY += 18;

    const fmtD = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
    doc.font('Helvetica').fontSize(8);

    rentals.forEach((r, idx) => {
      if (currentY > 740) {
        doc.addPage();
        currentY = 40;
        doc.rect(40, currentY, 515, 18).fill('#18181b');
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
        doc.text('Equipment ID', 45,  currentY + 4, { width: 80 });
        doc.text('Customer Name',       130, currentY + 4, { width: 140 });
        doc.text('Check-In Date',       275, currentY + 4, { width: 90 });
        doc.text('Check-Out Date',      370, currentY + 4, { width: 90 });
        doc.text('Status',              465, currentY + 4, { width: 80 });
        currentY += 18;
        doc.font('Helvetica').fontSize(8);
      }

      const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(40, currentY, 515, 18).fillAndStroke(rowBg, '#f1f5f9');
      
      doc.fillColor('#0f172a');
      doc.text((r.equipmentId?.equipmentId || 'N/A').substring(0, 12), 45,  currentY + 4, { width: 80 });
      doc.text((r.customerId?.name || 'N/A').substring(0, 22),          130, currentY + 4, { width: 140 });
      doc.text(fmtD(r.checkInDate),                                      275, currentY + 4, { width: 90 });
      doc.text(fmtD(r.checkOutDate),                                     370, currentY + 4, { width: 90 });
      doc.text((r.status || 'N/A').toUpperCase().substring(0, 10),       465, currentY + 4, { width: 80 });

      currentY += 18;
    });

    if (rentals.length === 0) {
      doc.rect(40, currentY, 515, 18).fillAndStroke('#ffffff', '#f1f5f9');
      doc.fillColor('#64748b').text('No active rentals found for this Fleet Manager scope.', 45, currentY + 4);
    }

    doc.end();
  } catch (err) {
    console.error('PDF export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to generate PDF report', error: err.message });
    }
  }
};

router.get('/export-pdf', requireAuth, generateFleetPDF);
router.get('/mine/report', requireAuth, generateFleetPDF);

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
