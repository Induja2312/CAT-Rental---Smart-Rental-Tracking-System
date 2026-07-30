const { Schema, model } = require('mongoose');

const UserSchema = new Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['admin', 'manager', 'customer'], required: true },
  assignedSites:[{ type: Schema.Types.ObjectId, ref: 'Site' }],
});

module.exports = model('User', UserSchema);
