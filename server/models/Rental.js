const { Schema, model } = require('mongoose');

const RentalSchema = new Schema({
  equipmentId:      { type: Schema.Types.ObjectId, ref: 'Equipment', required: true },
  customerId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  checkInDate:      { type: Date, required: true },
  checkOutDate:     { type: Date, required: true },
  actualReturnDate: { type: Date },
  status:           { type: String, enum: ['ongoing', 'returned', 'overdue'], default: 'ongoing' },
});

module.exports = model('Rental', RentalSchema);
