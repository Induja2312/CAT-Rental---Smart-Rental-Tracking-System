const { Schema, model } = require('mongoose');

const AlertSchema = new Schema({
  equipmentId: { type: Schema.Types.ObjectId, ref: 'Equipment', required: true },
  type:        { type: String, enum: ['overdue', 'overuse', 'underuse', 'unassigned_operator', 'ml_anomaly'], required: true },
  message:     { type: String, required: true },
  severity:    { type: String, enum: ['low', 'medium', 'high'], required: true },
  createdAt:   { type: Date, default: Date.now },
  resolved:    { type: Boolean, default: false },
});

module.exports = model('Alert', AlertSchema);
