const { Schema, model } = require('mongoose');

const EquipmentSchema = new Schema({
  equipmentId:        { type: String, required: true, unique: true },
  type:               { type: String, required: true },
  class:              { type: String, default: '' },
  restTimeHours:      { type: Number, default: 8 },
  maxWorkHoursPerDay: { type: Number, default: 10 },
  siteId:             { type: Schema.Types.ObjectId, ref: 'Site' },
  status:             { type: String, enum: ['active', 'idle', 'overdue', 'unassigned'], default: 'unassigned' },
  lastOperatorId:     { type: Schema.Types.ObjectId, ref: 'User' },
  currentLocation:    { lat: Number, lng: Number },
});

module.exports = model('Equipment', EquipmentSchema);
