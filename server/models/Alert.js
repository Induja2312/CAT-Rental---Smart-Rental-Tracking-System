const { Schema, model } = require('mongoose');

const ALLOWED_ALERT_TYPES = [
  'overdue',
  'overuse',
  'underuse',
  'unassigned_operator',
  'ml_anomaly',
  'high_temperature',
  'overuse_no_rest',
  'operator_slacking',
  'abnormal_engine_usage',
  'abnormal_idle_time',
  'abnormal_idle_ratio',
  'unusual_operator_gap',
  'irregular_usage_pattern',
];

const AlertSchema = new Schema({
  equipmentId: { type: Schema.Types.ObjectId, ref: 'Equipment', required: true },
  type:        { type: String, enum: ALLOWED_ALERT_TYPES, required: true },
  message:     { type: String, required: true },
  severity:    { type: String, enum: ['low', 'medium', 'high'], required: true },
  createdAt:   { type: Date, default: Date.now },
  resolved:    { type: Boolean, default: false },
});

module.exports = model('Alert', AlertSchema);
