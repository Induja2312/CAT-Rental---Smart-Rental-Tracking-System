const { Schema, model } = require('mongoose');

const SiteSchema = new Schema({
  name:     { type: String, required: true },
  location: { lat: Number, lng: Number },
});

module.exports = model('Site', SiteSchema);
