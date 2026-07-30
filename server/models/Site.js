const { Schema, model } = require('mongoose');

const SiteSchema = new Schema({
  name:     { type: String, required: true },
  location: { lat: Number, lng: Number },
  status:   { type: String, enum: ['active', 'pending'], default: 'active' },
});

module.exports = model('Site', SiteSchema);
