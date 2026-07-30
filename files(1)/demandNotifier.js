/**
 * When getForecast() (forecastService.js) detects a rising-demand site,
 * proactively email customers who've previously rented equipment at that
 * site, suggesting they pre-book before availability tightens.
 *
 * Assumption made: "the user" to notify is the CUSTOMER (encourage them to
 * pre-book/pre-request ahead of the crunch), not the fleet manager. If you
 * actually meant notify the manager instead (so THEY pre-position stock),
 * swap the recipient lookup below — the trend-detection logic doesn't change.
 */

const { getForecast } = require("./forecastService");
const { sendNotification } = require("./emailService"); // from the earlier SMTP addition

/**
 * @param TelemetryModel, EquipmentModel - passed through to getForecast()
 * @param RentalModel - your Mongoose Rental model, to find past customers per site
 * @param UserModel - your Mongoose User model, to get customer emails
 */
async function notifyRisingDemandSites(TelemetryModel, EquipmentModel, RentalModel, UserModel) {
  const forecast = await getForecast(TelemetryModel, EquipmentModel);
  const risingSites = forecast.filter((f) => f.trend === "rising");

  const notified = [];

  for (const site of risingSites) {
    // Find equipment at this site, then customers who've rented that equipment before
    // (past OR current — both are candidates to pre-book again before demand rises further)
    const equipmentAtSite = await EquipmentModel.find({ siteId: site.siteId }, "equipmentId").lean();
    const equipmentIds = equipmentAtSite.map((e) => e.equipmentId);

    const pastRentals = await RentalModel.find({
      equipmentId: { $in: equipmentIds },
    }).distinct("customerId");

    if (pastRentals.length === 0) continue;

    const customers = await UserModel.find({ _id: { $in: pastRentals }, role: "customer" }).lean();

    for (const customer of customers) {
      if (!customer.email) continue;

      const subject = "Upcoming demand increase — reserve your equipment early";
      const message =
        `Hi ${customer.name},\n\n` +
        `We're seeing rising equipment demand at a site you've rented from before ` +
        `(utilization up ${site.changePct.toFixed(2)}% over the last few days). ` +
        `To make sure you have seamless access to the equipment you need, we recommend ` +
        `pre-booking or submitting a pre-request now before availability tightens.\n\n` +
        `— CAT Rental`;

      try {
        await sendNotification(customer.email, subject, message);
        notified.push({ customerId: customer._id, siteId: site.siteId });
      } catch (err) {
        // Don't let one failed email break the loop — log and continue.
        console.error(`Failed to notify ${customer.email}:`, err.message);
      }
    }
  }

  return notified; // useful to return for a "notifications sent" summary in the UI/logs
}

module.exports = { notifyRisingDemandSites };
