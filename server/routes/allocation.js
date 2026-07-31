const router = require('express').Router();
const Equipment = require('../models/Equipment');
const Site = require('../models/Site');
const Telemetry = require('../models/Telemetry');
const { requireAuth, requireRole } = require('../middleware/auth');

// Haversine formula to compute distance between two lat/lng points in km
function haversineDistance(lat1, lng1, lat2, lng2) {
  if (lat1 === undefined || lng1 === undefined || lat2 === undefined || lng2 === undefined) return 100;
  if (lat1 === lat2 && lng1 === lng2) return 0;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Dijkstra Algorithm to find shortest path across sites network
function runDijkstra(sites, startSiteId, targetSiteId) {
  if (!startSiteId || !targetSiteId) {
    return { path: [], totalDistance: 50 };
  }
  if (startSiteId.toString() === targetSiteId.toString()) {
    const s = sites.find((x) => x._id.toString() === startSiteId.toString());
    return { path: [s || { _id: startSiteId, name: 'Current Site' }], totalDistance: 0 };
  }

  const siteMap = new Map();
  sites.forEach((s) => siteMap.set(s._id.toString(), s));

  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set();

  sites.forEach((s) => {
    const id = s._id.toString();
    distances.set(id, Infinity);
    unvisited.add(id);
  });

  const startIdStr = startSiteId.toString();
  const targetIdStr = targetSiteId.toString();

  distances.set(startIdStr, 0);

  while (unvisited.size > 0) {
    let currentId = null;
    let minDistance = Infinity;

    for (const id of unvisited) {
      if (distances.get(id) < minDistance) {
        minDistance = distances.get(id);
        currentId = id;
      }
    }

    if (!currentId || minDistance === Infinity) break;
    if (currentId === targetIdStr) break;

    unvisited.delete(currentId);
    const currSite = siteMap.get(currentId);

    for (const neighborId of unvisited) {
      const neighborSite = siteMap.get(neighborId);
      const edgeWeight = haversineDistance(
        currSite.location.lat,
        currSite.location.lng,
        neighborSite.location.lat,
        neighborSite.location.lng
      );

      const alt = distances.get(currentId) + edgeWeight;
      if (alt < distances.get(neighborId)) {
        distances.set(neighborId, alt);
        previous.set(neighborId, currentId);
      }
    }
  }

  const path = [];
  let curr = targetIdStr;
  while (curr) {
    const siteObj = siteMap.get(curr);
    if (siteObj) path.unshift(siteObj);
    curr = previous.get(curr);
  }

  const totalDistance = distances.get(targetIdStr);
  return {
    path,
    totalDistance: totalDistance === Infinity ? 100 : Math.round(totalDistance * 10) / 10,
  };
}

// GET /api/allocation/rank?siteId=X&type=Y
// Protected with requireAuth + requireRole('manager', 'admin')
router.get('/rank', requireAuth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { siteId, type } = req.query;

    const sites = await Site.find();
    if (!sites || sites.length === 0) {
      return res.status(404).json({ message: 'No construction sites found' });
    }

    // Fleet Manager scope filtering
    let visibleSites = sites;
    let targetSites = sites;
    const User = require('../models/User');

    if (req.query.managerId && req.query.managerId !== 'all') {
      let mgr = null;
      if (req.query.managerId === 'current') {
        mgr = await User.findById(req.user.id);
      } else {
        mgr = await User.findById(req.query.managerId);
      }
      if (mgr) {
        const assignedSet = new Set((mgr.assignedSites || []).map(String));
        visibleSites = sites.filter((s) => assignedSet.has(s._id.toString()));
      }
    } else if (req.user.role === 'manager') {
      const assignedSet = new Set((req.user.assignedSites || []).map(String));
      visibleSites = sites.filter((s) => assignedSet.has(s._id.toString()));
    }

    let targetSite = visibleSites.find((s) => s._id.toString() === siteId);
    if (!targetSite) {
      targetSite = visibleSites[0] || sites[0];
    }

    const eqFilter = {};
    if (type && type !== 'All') {
      eqFilter.type = new RegExp(type, 'i');
    }
    
    if (req.query.managerId && req.query.managerId !== 'all') {
      let mgr = null;
      if (req.query.managerId === 'current') {
        mgr = await User.findById(req.user.id);
      } else {
        mgr = await User.findById(req.query.managerId);
      }
      if (mgr) {
        eqFilter.siteId = { $in: mgr.assignedSites || [] };
      }
    } else if (req.user.role === 'manager') {
      eqFilter.siteId = { $in: req.user.assignedSites || [] };
    }

    const equipments = await Equipment.find(eqFilter)
      .populate('siteId')
      .populate('lastOperatorId', 'name email');

    const latestTelemetries = await Telemetry.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$equipmentId',
          engineHoursToday: { $first: '$engineHoursToday' },
          idleHoursToday: { $first: '$idleHoursToday' },
          fuelLevel: { $first: '$fuelLevel' },
          location: { $first: '$location' },
        },
      },
    ]);

    const telemetryMap = new Map();
    latestTelemetries.forEach((t) => telemetryMap.set(t._id.toString(), t));

    // Weight coefficients given in problem prompt: w1=0.4, w2=0.4, w3=0.2
    const w1 = 0.4;
    const w2 = 0.4;
    const w3 = 0.2;

    const recommendations = equipments.map((eq) => {
      const telem = telemetryMap.get(eq._id.toString()) || {};
      const engineHours = telem.engineHoursToday ?? (eq.status === 'active' ? 7.5 : 1.5);
      const idleHours = telem.idleHoursToday ?? (eq.status === 'active' ? 1.0 : 8.0);
      const totalHours = engineHours + idleHours;

      const currentUtilization = totalHours > 0 ? engineHours / totalHours : 0.4;
      const isAvailable = ['idle', 'unassigned'].includes(eq.status) ? 1 : 0;

      const sourceSite = eq.siteId;
      let dijkstraResult = { path: [], totalDistance: 10 };

      if (sourceSite) {
        dijkstraResult = runDijkstra(sites, sourceSite._id, targetSite._id);
      } else if (eq.currentLocation?.lat && targetSite.location?.lat) {
        const directDist = haversineDistance(
          eq.currentLocation.lat,
          eq.currentLocation.lng,
          targetSite.location.lat,
          targetSite.location.lng
        );
        dijkstraResult = { path: [targetSite], totalDistance: directDist };
      }

      const distanceKm = Math.max(dijkstraResult.totalDistance, 0.5);
      const distScoreFactor = 1 / distanceKm;
      const rawScore = w1 * distScoreFactor + w2 * (1 - currentUtilization) + w3 * isAvailable;
      const score = Math.round(rawScore * 1000) / 1000;

      // Heavy haulage transport speed: ~20 km/h (400 km takes 15 to 25 hours of non-stop heavy transit)
      const estimatedDurationHours = distanceKm === 0 ? 0 : Math.round((distanceKm / 20) * 10) / 10;
      const estimatedCostUsd = Math.round(distanceKm * 4.5);

      return {
        equipment: eq,
        sourceSite: sourceSite || { name: 'Unassigned Depot', location: eq.currentLocation },
        targetSite: targetSite,
        distanceKm,
        currentUtilization: Math.round(currentUtilization * 100) / 100,
        isAvailable: isAvailable === 1,
        score,
        dijkstraPath: dijkstraResult.path,
        estimatedDurationHours,
        estimatedCostUsd,
        engineHoursToday: engineHours,
        idleHoursToday: idleHours,
        fuelLevel: telem.fuelLevel ?? 85,
      };
    });

    recommendations.sort((a, b) => b.score - a.score);

    res.json({
      targetSite,
      sitesNetwork: visibleSites,
      recommendations,
    });
  } catch (err) {
    console.error('Allocation rank error:', err);
    res.status(500).json({ message: 'Error calculating allocation recommendations', error: err.message });
  }
});

// GET /api/allocation/sites-graph
router.get('/sites-graph', requireAuth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const sites = await Site.find();
    const matrix = [];
    sites.forEach((s1) => {
      sites.forEach((s2) => {
        if (s1._id.toString() !== s2._id.toString()) {
          matrix.push({
            from: s1,
            to: s2,
            distanceKm: haversineDistance(
              s1.location.lat,
              s1.location.lng,
              s2.location.lat,
              s2.location.lng
            ),
          });
        }
      });
    });
    res.json({ sites, edges: matrix });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching sites graph' });
  }
});

// POST /api/allocation/transfer
router.post('/transfer', requireAuth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { equipmentId, targetSiteId } = req.body;
    if (!equipmentId || !targetSiteId) {
      return res.status(400).json({ message: 'equipmentId and targetSiteId are required' });
    }

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const targetSite = await Site.findById(targetSiteId);
    if (!targetSite) {
      return res.status(404).json({ message: 'Target site not found' });
    }

    equipment.siteId = targetSite._id;
    if (targetSite.location) {
      equipment.currentLocation = { ...targetSite.location };
    }
    if (equipment.status === 'unassigned') {
      equipment.status = 'idle';
    }
    await equipment.save();

    res.json({
      message: `Equipment ${equipment.equipmentId} successfully allocated to ${targetSite.name}`,
      equipment,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error transferring equipment', error: err.message });
  }
});

module.exports = router;
