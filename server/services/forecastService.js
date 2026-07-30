const Telemetry = require('../models/Telemetry');
const Equipment = require('../models/Equipment');
const Site = require('../models/Site');

const round2 = (v) => Math.round(v * 100) / 100;

/**
 * Compute simple moving-average trend of daily engine hours per site.
 * Compares the most recent N-day window against the prior N-day window.
 * Returns per-site trend direction and a plain-English recommendation.
 * This is a heuristic — not a trained model.
 */
const computeForecast = async (windowDays = 3) => {
  const sites = await Site.find().lean();

  const now = new Date();
  const msPerDay = 86_400_000;

  const recentStart = new Date(now - windowDays * msPerDay);
  const priorStart  = new Date(now - windowDays * 2 * msPerDay);

  // Aggregate daily max engineHoursToday per equipment in each window
  const aggregate = async (from, to) =>
    Telemetry.aggregate([
      { $match: { timestamp: { $gte: from, $lt: to } } },
      {
        $group: {
          _id: '$equipmentId',
          avgEngine: { $avg: '$engineHoursToday' },
        },
      },
    ]);

  const [recentRows, priorRows] = await Promise.all([
    aggregate(recentStart, now),
    aggregate(priorStart, recentStart),
  ]);

  // Map equipmentId -> avgEngine for each window
  const toMap = (rows) => new Map(rows.map((r) => [r._id.toString(), r.avgEngine ?? 0]));
  const recentMap = toMap(recentRows);
  const priorMap  = toMap(priorRows);

  // Resolve equipment -> site
  const equipments = await Equipment.find({}, 'siteId').lean();
  const eqToSite = new Map(equipments.map((e) => [e._id.toString(), e.siteId?.toString()]));

  // Accumulate per-site totals
  const siteRecent = new Map();
  const sitePrior  = new Map();
  const siteCount  = new Map();

  for (const [eqId, siteId] of eqToSite) {
    if (!siteId) continue;
    siteRecent.set(siteId, (siteRecent.get(siteId) ?? 0) + (recentMap.get(eqId) ?? 0));
    sitePrior.set(siteId,  (sitePrior.get(siteId)  ?? 0) + (priorMap.get(eqId)  ?? 0));
    siteCount.set(siteId,  (siteCount.get(siteId)  ?? 0) + 1);
  }

  const forecasts = sites.map((site) => {
    const id    = site._id.toString();
    const count = siteCount.get(id) || 1;
    const recent = round2((siteRecent.get(id) ?? 0) / count);
    const prior  = round2((sitePrior.get(id)  ?? 0) / count);

    const changePct = prior > 0 ? round2(((recent - prior) / prior) * 100) : 0;
    const trend = changePct > 5 ? 'rising' : changePct < -5 ? 'falling' : 'stable';

    let recommendation = `${site.name} utilization is stable (avg ${recent} engine hrs/day).`;
    if (trend === 'rising') {
      recommendation = `${site.name} utilization up ${changePct}% over last ${windowDays} days — consider pre-positioning 1 more unit.`;
    } else if (trend === 'falling') {
      recommendation = `${site.name} utilization down ${Math.abs(changePct)}% over last ${windowDays} days — consider reallocation to higher-demand site.`;
    }

    return {
      siteId:          site._id,
      siteName:        site.name,
      recentAvgEngineHours: recent,
      priorAvgEngineHours:  prior,
      changePct,
      trend,
      recommendation,
    };
  });

  return forecasts;
};

module.exports = { computeForecast };
