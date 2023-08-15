const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  chatId: { type: String },
  amount: { type: Number },
  paymentCurrency: { type: String },
  convertedAmount: { type: Number },
  rateOnConversion: { type: Number },
  transactionType: { type: String, enum: ['airtime', 'zesa'] },
  paymentPlatform: {
    type: [String],
    default: [],
  },
  targetedPhone: { type: String },
  fname: { type: String },
  customerName: { type: String },
  customerAddress: { type: String },
  meterNumber: { type: String },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'cancelled', 'failed'] },
  paymentReference: { type: String },
  transactionReference: { type: String },
  transactionPollUrl: { type: String },
  transactionStatus: { type: String, enum: ['pending', 'completed', 'cancelled', 'Success', 'failed'] },
  startTime: { type: Date },
  endTime: { type: Date },
  paymentMethod: { type: String, enum: ['pesepay', 'stripe'] },
});

module.exports = mongoose.model('Transaction', TransactionSchema);
