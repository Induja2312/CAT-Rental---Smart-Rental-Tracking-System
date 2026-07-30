const axios = require('axios');

// Per-equipment mutable state seeded from the 7 rows in seed.js
// Tamil Nadu bounding box: lat 8.0–13.5, lng 76.0–80.5
const TN_LAT = { min: 8.0, max: 13.5 };
const TN_LNG = { min: 76.0, max: 80.5 };

const state = {
  EQX1001: { lat: 9.9280,  lng: 78.1220, engineHours: 2.0, idleHours: 0.5, fuel: 78, operatorId: null },
  EQX1002: { lat: 13.0850, lng: 80.2730, engineHours: 0.0, idleHours: 1.2, fuel: 91, operatorId: null },
  EQX1003: { lat: 11.0190, lng: 76.9580, engineHours: 3.5, idleHours: 0.3, fuel: 55, operatorId: null },
  EQX1004: { lat: 10.7930, lng: 78.7070, engineHours: 8.1, idleHours: 0.0, fuel: 22, operatorId: null },
  EQX1005: { lat: 11.6670, lng: 78.1490, engineHours: 0.0, idleHours: 2.0, fuel: 88, operatorId: null },
  EQX1006: { lat: 13.0800, lng: 80.2680, engineHours: 4.2, idleHours: 0.8, fuel: 63, operatorId: null },
  EQX1007: { lat: 10.7910, lng: 78.7030, engineHours: 0.0, idleHours: 0.0, fuel: 100, operatorId: null },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const tick = async (equipmentId, baseUrl) => {
  const s = state[equipmentId];

  // Nudge GPS within Tamil Nadu bounding box only
  s.lat = clamp(+(s.lat + (Math.random() - 0.5) * 0.001).toFixed(6), TN_LAT.min, TN_LAT.max);
  s.lng = clamp(+(s.lng + (Math.random() - 0.5) * 0.001).toFixed(6), TN_LNG.min, TN_LNG.max);
  s.engineHours = +(clamp(s.engineHours + (Math.random() > 0.3 ? 4 / 3600 : 0), 0, 24)).toFixed(4);
  s.idleHours   = +(clamp(s.idleHours   + (Math.random() > 0.7 ? 4 / 3600 : 0), 0, 24)).toFixed(4);
  s.fuel        = +(clamp(s.fuel - Math.random() * 0.05, 0, 100)).toFixed(2);

  const payload = {
    equipmentId,
    location:         { lat: s.lat, lng: s.lng },
    engineHoursToday: s.engineHours,
    idleHoursToday:   s.idleHours,
    fuelLevel:        s.fuel,
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
  console.log(`Telemetry simulator started — pushing every 4s for ${ids.length} equipment`);
};

module.exports = { startSimulator };
