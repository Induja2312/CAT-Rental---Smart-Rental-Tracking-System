const { Schema, model } = require('mongoose');

const SiteSchema = new Schema({
  name:        { type: String, required: true },
  location:    { lat: Number, lng: Number },
  status:      { type: String, enum: ['active', 'pending'], default: 'active' },
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  equipmentTypeNeeded: { type: String, default: '' },
  notes:       { type: String, default: '' },
}, { timestamps: true });

module.exports = model('Site', SiteSchema);
