/**
 * Rule-based alert checks — deterministic, no ML needed. These run on every
 * telemetry ingest and are more reliable for a live demo than a trained model,
 * especially for operator slacking (see note below).
 *
 * Call checkAllRules(telemetryReading, equipmentDoc, activeSession) from your
 * telemetry ingest route, once per incoming reading.
 */

const HIGH_TEMPERATURE_THRESHOLD = 100; // °C — tune per equipment class if you have real specs

/**
 * @param reading - the incoming telemetry payload:
 *   { equipmentId, engineHoursToday, idleHoursToday, engineTemperature, timestamp }
 * @param equipment - the Equipment doc (needs restTimeHours, maxWorkHoursPerDay — from
 *   the admin machinery-CRUD addition)
 * @param activeSession - the operator's currently active OperatorSession doc, or null
 *   if no operator is clocked in right now
 * @returns Array of alert objects to save + broadcast (empty array if nothing triggered)
 */
function checkAllRules(reading, equipment, activeSession) {
  const alerts = [];

  // 1. HIGH TEMPERATURE — straightforward threshold, no ML needed, this should
  // always be a hard rule regardless of anything else (safety-relevant).
  if (reading.engineTemperature > HIGH_TEMPERATURE_THRESHOLD) {
    alerts.push({
      equipmentId: reading.equipmentId,
      type: "high_temperature",
      message: `Engine temperature ${reading.engineTemperature.toFixed(2)}°C exceeds safe threshold (${HIGH_TEMPERATURE_THRESHOLD}°C).`,
      severity: "high",
    });
  }

  // 2. OVERUSE WITHOUT REST — uses THIS equipment's own configured limits
  // (set by admin per machine), not a hardcoded global number.
  const maxHours = equipment.maxWorkHoursPerDay;
  const requiredRest = equipment.restTimeHours;
  if (maxHours != null && reading.engineHoursToday > maxHours) {
    alerts.push({
      equipmentId: reading.equipmentId,
      type: "overuse_no_rest",
      message: `Engine hours today (${reading.engineHoursToday.toFixed(2)}) exceed this equipment's configured max (${maxHours.toFixed(2)}h) with insufficient rest.`,
      severity: "medium",
    });
  } else if (requiredRest != null && reading.idleHoursToday < requiredRest) {
    // Equipment ran without accumulating its required rest/idle period —
    // catches "worked continuously across the day" even if total hours look okay.
    alerts.push({
      equipmentId: reading.equipmentId,
      type: "overuse_no_rest",
      message: `Idle/rest time today (${reading.idleHoursToday.toFixed(2)}h) is below the required rest period (${requiredRest.toFixed(2)}h) for this equipment.`,
      severity: "medium",
    });
  }

  // 3. OPERATOR SLACKING (clocked in, not really working — "extending stay") —
  // deliberately rule-based, not ML: this needs the ground-truth session window,
  // which the point-in-time ML features can't see (see design note below).
  if (activeSession) {
    const sessionStartMs = new Date(activeSession.clockInTime).getTime();
    const nowMs = new Date(reading.timestamp).getTime();
    const sessionDurationHours = (nowMs - sessionStartMs) / (1000 * 60 * 60);

    // Only evaluate once the session has run long enough to be meaningful —
    // avoids false-flagging someone 2 minutes after clocking in.
    const MIN_SESSION_HOURS_BEFORE_CHECK = 0.5;
    const SLACKING_UTILIZATION_THRESHOLD = 0.20; // <20% of clocked-in time = real engine activity

    if (sessionDurationHours >= MIN_SESSION_HOURS_BEFORE_CHECK) {
      const utilizationRatio = sessionDurationHours > 0
        ? Math.min(1, reading.engineHoursToday / sessionDurationHours)
        : 0;

      if (utilizationRatio < SLACKING_UTILIZATION_THRESHOLD) {
        alerts.push({
          equipmentId: reading.equipmentId,
          type: "operator_slacking",
          message: `Operator clocked in ${sessionDurationHours.toFixed(2)}h ago but engine activity is only ${(utilizationRatio * 100).toFixed(2)}% of that time — possible non-work presence.`,
          severity: "medium",
        });
      }
    }
  }

  return alerts;
}

module.exports = { checkAllRules, HIGH_TEMPERATURE_THRESHOLD };

/**
 * DESIGN NOTE — why slacking is rule-based, not ML:
 * The Isolation Forest was tested against this exact scenario and did not
 * reliably flag it, because "low sessionUtilizationRatio" is also the normal
 * baseline for machines with NO operator assigned at all — the model has no
 * way to distinguish "nobody's here" from "someone clocked in and is stalling"
 * from a single telemetry snapshot. The OperatorSession record gives us ground
 * truth (an active clock-in) that the ML feature vector doesn't have, so the
 * deterministic check above is strictly more reliable here.
 */
