const { Schema, model } = require('mongoose');

const TelemetrySchema = new Schema({
  equipmentId:      { type: Schema.Types.ObjectId, ref: 'Equipment', required: true },
  timestamp:        { type: Date, default: Date.now },
  engineHoursToday: Number,
  idleHoursToday:   Number,
  fuelLevel:        Number,
  engineTemperature:Number,
  location:         { lat: Number, lng: Number },
  operatorId:       { type: Schema.Types.ObjectId, ref: 'User' },
});

module.exports = model('Telemetry', TelemetrySchema);
