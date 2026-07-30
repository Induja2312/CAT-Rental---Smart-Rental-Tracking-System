const axios = require('axios');
const Equipment = require('../models/Equipment');
const Telemetry = require('../models/Telemetry');
const { raiseAlert } = require('./alertEngine');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const POLL_INTERVAL_MS = 30_000;

// Check ML service is reachable before starting the poll loop
const waitForML = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await axios.get(`${ML_URL}/health`, { timeout: 2000 });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  return false;
};

const pollOnce = async () => {
  // Get latest telemetry record per equipment via aggregation
  const latest = await Telemetry.aggregate([
    { $sort: { timestamp: -1 } },
    { $group: { _id: '$equipmentId', doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
  ]);

  await Promise.allSettled(latest.map(async (record) => {
    const equipment = await Equipment.findById(record.equipmentId);
    if (!equipment) return;

    const payload = {
      equipmentId:            equipment.equipmentId,
      engineHoursToday:       record.engineHoursToday ?? 0,
      idleHoursToday:         record.idleHoursToday   ?? 0,
      days_since_op_assigned: record.operatorId ? 0 : 1,
    };

    const { data } = await axios.post(`${ML_URL}/predict`, payload, { timeout: 5000 });

    if (data.is_anomaly) {
      await raiseAlert(
        record.equipmentId,
        'ml_anomaly',
        `${equipment.equipmentId} flagged as anomaly by ML model (score: ${data.anomaly_score})`,
        data.anomaly_score > 0.15 ? 'high' : 'medium',
      );
    }
  }));
};

const startMLPoller = async () => {
  const reachable = await waitForML();
  if (!reachable) {
    console.log('ML service not reachable — ml_anomaly polling disabled');
    return;
  }
  console.log(`ML poller started — checking every ${POLL_INTERVAL_MS / 1000}s`);
  setInterval(() => {
    pollOnce().catch(err => console.error('mlPoller error:', err.message));
  }, POLL_INTERVAL_MS);
};

module.exports = { startMLPoller };
