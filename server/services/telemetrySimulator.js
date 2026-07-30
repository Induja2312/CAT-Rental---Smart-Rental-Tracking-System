const axios = require('axios');

// Per-equipment mutable state seeded from the 7 rows in seed.js
const state = {
  EQX1001: { lat: 37.775,  lng: -122.419, engineHours: 2.0, idleHours: 0.5, fuel: 78, operatorId: null },
  EQX1002: { lat: 37.776,  lng: -122.420, engineHours: 0.0, idleHours: 1.2, fuel: 91, operatorId: null },
  EQX1003: { lat: 34.052,  lng: -118.243, engineHours: 3.5, idleHours: 0.3, fuel: 55, operatorId: null },
  EQX1004: { lat: 34.053,  lng: -118.244, engineHours: 8.1, idleHours: 0.0, fuel: 22, operatorId: null },
  EQX1005: { lat: 41.878,  lng: -87.629,  engineHours: 0.0, idleHours: 2.0, fuel: 88, operatorId: null },
  EQX1006: { lat: 41.879,  lng: -87.630,  engineHours: 4.2, idleHours: 0.8, fuel: 63, operatorId: null },
  EQX1007: { lat: 0,       lng: 0,        engineHours: 0.0, idleHours: 0.0, fuel: 100, operatorId: null },
};

const nudge = (v, max, min = 0) => Math.min(max, Math.max(min, +(v + (Math.random() - 0.5) * 0.001).toFixed(6)));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const tick = async (equipmentId, baseUrl) => {
  const s = state[equipmentId];

  // Advance simulation values
  s.lat = nudge(s.lat, 90, -90);
  s.lng = nudge(s.lng, 180, -180);
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
