const { Schema, model } = require('mongoose');

const OperatorSessionSchema = new Schema({
  operatorId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  equipmentId:  { type: Schema.Types.ObjectId, ref: 'Equipment', required: true },
  clockInTime:  { type: Date, default: Date.now },
  clockOutTime: { type: Date, default: null },
  status:       { type: String, enum: ['active', 'completed'], default: 'active' },
  engineHoursOnClockIn:  { type: Number, default: 0 },
  idleHoursOnClockIn:    { type: Number, default: 0 },
  engineHoursOnClockOut: { type: Number, default: 0 },
  idleHoursOnClockOut:   { type: Number, default: 0 },
});

module.exports = model('OperatorSession', OperatorSessionSchema);
