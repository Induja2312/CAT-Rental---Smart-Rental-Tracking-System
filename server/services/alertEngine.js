const Telemetry = require('../models/Telemetry');
const Alert = require('../models/Alert');
const { getIO, ALERT_NEW } = require('../sockets');

// How many calendar days back to look for consecutive-day checks
const startOfDaysAgo = (n) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};

// Emit + save one alert, skipping if an identical unresolved alert already exists
const raiseAlert = async (equipmentObjectId, type, message, severity) => {
  const existing = await Alert.findOne({ equipmentId: equipmentObjectId, type, resolved: false });
  if (existing) return; // already open, don't spam

  const alert = await Alert.create({ equipmentId: equipmentObjectId, type, message, severity });
  getIO().emit(ALERT_NEW, {
    equipmentId: equipmentObjectId,
    type,
    message,
    severity,
    _id: alert._id,
  });
};

// Count distinct calendar days in the last `days` days where the aggregate
// value of `field` exceeded `threshold`
const consecutiveDaysOver = async (equipmentObjectId, field, threshold, days) => {
  const since = startOfDaysAgo(days);
  const result = await Telemetry.aggregate([
    { $match: { equipmentId: equipmentObjectId, timestamp: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        maxVal: { $max: `$${field}` },
      },
    },
    { $match: { maxVal: { $gt: threshold } } },
    { $count: 'days' },
  ]);
  return result[0]?.days ?? 0;
};

/**
 * Run all alert rules for one ingest event.
 * @param {ObjectId} equipmentObjectId  — Equipment._id
 * @param {string}   equipmentId        — human-readable e.g. "EQX1001"
 * @param {number}   engineHoursToday
 * @param {number}   idleHoursToday
 * @param {*}        operatorId         — null | ObjectId
 */
const checkAndAlert = async (equipmentObjectId, equipmentId, engineHoursToday, idleHoursToday, operatorId) => {
  // Rule 1 — overuse: engineHoursToday > 10 for 2+ consecutive days
  if (engineHoursToday > 10) {
    const days = await consecutiveDaysOver(equipmentObjectId, 'engineHoursToday', 10, 2);
    if (days >= 2) {
      await raiseAlert(
        equipmentObjectId,
        'overuse',
        `${equipmentId} has exceeded 10 engine hours/day for ${days} consecutive days`,
        'high',
      );
    }
  }

  // Rule 2 — underuse: idleHoursToday > 8 for 3+ consecutive days
  if (idleHoursToday > 8) {
    const days = await consecutiveDaysOver(equipmentObjectId, 'idleHoursToday', 8, 3);
    if (days >= 3) {
      await raiseAlert(
        equipmentObjectId,
        'underuse',
        `${equipmentId} has been idle >8 hours/day for ${days} consecutive days`,
        'low',
      );
    }
  }

  // Rule 3 — unassigned_operator: engine running but no operator logged
  if (engineHoursToday > 0 && !operatorId) {
    await raiseAlert(
      equipmentObjectId,
      'unassigned_operator',
      `${equipmentId} is operating with no assigned operator`,
      'medium',
    );
  }

  // Rule 4 — overdue (equipment-side threshold): engineHoursToday >= 10 today
  if (engineHoursToday >= 10) {
    await raiseAlert(
      equipmentObjectId,
      'overdue',
      `${equipmentId} has reached ${engineHoursToday.toFixed(1)} engine hours today (threshold: 10)`,
      'high',
    );
  }
};

module.exports = { checkAndAlert };
