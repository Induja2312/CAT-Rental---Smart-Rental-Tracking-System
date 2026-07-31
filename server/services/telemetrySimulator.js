const axios = require('axios');
const mongoose = require('mongoose');

// Per-equipment mutable state seeded from seed.js (EQX1001-EQX1007 and EQX2001-EQX2007)
const TN_LAT = { min: 8.0, max: 13.5 };
const TN_LNG = { min: 76.0, max: 80.5 };

const state = {
  // Batch 1 (EQX1001 – EQX1007)
  EQX1001: { lat: 9.9280,  lng: 78.1220, engineHours: 2.0, idleHours: 0.5, fuel: 78, normalTemp: 75, hasOperator: true,  operatorId: null, sessionActive: false, tickCount: 0 },
  EQX1002: { lat: 13.0850, lng: 80.2730, engineHours: 0.0, idleHours: 1.2, fuel: 91, normalTemp: 60, hasOperator: false, operatorId: null, sessionActive: false, tickCount: 0 },
  EQX1003: { lat: 11.0190, lng: 76.9580, engineHours: 3.5, idleHours: 0.3, fuel: 55, normalTemp: 85, hasOperator: true,  operatorId: null, sessionActive: false, tickCount: 0 },
  EQX1004: { lat: 10.7930, lng: 78.7070, engineHours: 8.1, idleHours: 0.0, fuel: 22, normalTemp: 78, hasOperator: true,  operatorId: null, sessionActive: false, tickCount: 0 },
  EQX1005: { lat: 11.6670, lng: 78.1490, engineHours: 0.0, idleHours: 2.0, fuel: 88, normalTemp: 88, hasOperator: true,  operatorId: null, sessionActive: false, tickCount: 0 },
  EQX1006: { lat: 13.0800, lng: 80.2680, engineHours: 4.2, idleHours: 0.8, fuel: 63, normalTemp: 72, hasOperator: false, operatorId: null, sessionActive: false, tickCount: 0 },
  EQX1007: { lat: 10.7910, lng: 78.7030, engineHours: 0.0, idleHours: 0.0, fuel: 100, normalTemp: 58, hasOperator: false, operatorId: null, sessionActive: false, tickCount: 0 },

  // Batch 2 (EQX2001 – EQX2007, Customer-Rented Fleet)
  EQX2001: { lat: 13.0840, lng: 80.2720, engineHours: 3.2, idleHours: 0.6, fuel: 82, normalTemp: 76, hasOperator: true,  operatorId: null, sessionActive: false, tickCount: 0 },
  EQX2002: { lat: 13.0810, lng: 80.2690, engineHours: 0.0, idleHours: 1.8, fuel: 90, normalTemp: 65, hasOperator: true,  operatorId: null, sessionActive: false, tickCount: 0 },
  EQX2003: { lat: 11.0180, lng: 76.9570, engineHours: 4.1, idleHours: 0.5, fuel: 68, normalTemp: 82, hasOperator: true,  operatorId: null, sessionActive: false, tickCount: 0 },
  EQX2004: { lat: 11.0200, lng: 76.9600, engineHours: 7.5, idleHours: 0.2, fuel: 35, normalTemp: 80, hasOperator: true,  operatorId: null, sessionActive: false, tickCount: 0 },
  EQX2005: { lat: 9.9260,  lng: 78.1210, engineHours: 1.2, idleHours: 1.0, fuel: 77, normalTemp: 70, hasOperator: false, operatorId: null, sessionActive: false, tickCount: 0 },
  EQX2006: { lat: 9.9240,  lng: 78.1180, engineHours: 5.0, idleHours: 0.4, fuel: 60, normalTemp: 78, hasOperator: true,  operatorId: null, sessionActive: false, tickCount: 0 },
  EQX2007: { lat: 10.7910, lng: 78.7030, engineHours: 0.0, idleHours: 0.0, fuel: 98, normalTemp: 60, hasOperator: false, operatorId: null, sessionActive: false, tickCount: 0 },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

let mockOperatorId = null;

const fetchMockOperator = async () => {
  if (mockOperatorId) return mockOperatorId;
  try {
    const User = require('../models/User');
    const operator = await User.findOne({ role: 'operator' });
    if (operator) mockOperatorId = operator._id.toString();
  } catch (e) {}
  return mockOperatorId;
};

const tick = async (equipmentId, baseUrl) => {
  const s = state[equipmentId];
  if (!s) return;
  s.tickCount++;

  // Nudge GPS within Tamil Nadu bounding box only
  s.lat = clamp(+(s.lat + (Math.random() - 0.5) * 0.001).toFixed(6), TN_LAT.min, TN_LAT.max);
  s.lng = clamp(+(s.lng + (Math.random() - 0.5) * 0.001).toFixed(6), TN_LNG.min, TN_LNG.max);
  s.engineHours = +(clamp(s.engineHours + (Math.random() > 0.3 ? 4 / 3600 : 0), 0, 24)).toFixed(4);
  s.idleHours   = +(clamp(s.idleHours   + (Math.random() > 0.7 ? 4 / 3600 : 0), 0, 24)).toFixed(4);
  s.fuel        = +(clamp(s.fuel - Math.random() * 0.05, 0, 100)).toFixed(2);
  
  // Vary temperature around normalTemp baseline
  const engineTemperature = +(Math.max(40, s.normalTemp + (Math.random() * 8 - 4))).toFixed(1);

  await fetchMockOperator();

  // Synthetic operator sessions
  if (s.hasOperator && mockOperatorId) {
    if (!s.sessionActive && Math.random() < 0.03) { // chance to clock in
      try {
        const Equipment = require('../models/Equipment');
        const OperatorSession = require('../models/OperatorSession');
        const eq = await Equipment.findOne({ equipmentId });
        if (eq) {
          const session = await OperatorSession.create({
            operatorId: mockOperatorId,
            equipmentId: eq._id,
            clockInTime: new Date(),
            status: 'active',
            engineHoursOnClockIn: s.engineHours,
            idleHoursOnClockIn: s.idleHours,
          });
          eq.lastOperatorId = mockOperatorId;
          await eq.save();
          s.sessionActive = true;
          s.operatorId = mockOperatorId;
        }
      } catch (e) {}
    } else if (s.sessionActive && Math.random() < 0.03 && s.tickCount > 5) { // chance to clock out
      try {
        const OperatorSession = require('../models/OperatorSession');
        const active = await OperatorSession.findOne({ equipmentId: (await require('../models/Equipment').findOne({ equipmentId }))._id, status: 'active' });
        if (active) {
          active.clockOutTime = new Date();
          active.status = 'completed';
          active.engineHoursOnClockOut = s.engineHours;
          active.idleHoursOnClockOut = s.idleHours;
          await active.save();
          s.sessionActive = false;
          s.operatorId = null;
        }
      } catch (e) {}
    }
  }

  const payload = {
    equipmentId,
    location:         { lat: s.lat, lng: s.lng },
    engineHoursToday: s.engineHours,
    idleHoursToday:   s.idleHours,
    fuelLevel:        s.fuel,
    engineTemperature,
    operatorId:       s.operatorId,
  };

  try {
    await axios.post(`${baseUrl}/api/telemetry/ingest`, payload);
  } catch (err) {
    // swallow — server may not be ready on first tick
  }
};

const startSimulator = (baseUrl = 'http://localhost:3001') => {
  const ids = Object.keys(state);
  setInterval(() => ids.forEach(id => tick(id, baseUrl)), 4000);
  console.log(`Telemetry simulator started — pushing every 4s for ${ids.length} equipment assets`);
};

module.exports = { startSimulator };
