const { Timestamp } = require('bson');
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;

const Transaction = new Schema( {
    _id: { type: Schema.Types.ObjectId, auto: true },
    chatId: { type: String },
    amount: { type: Number },
    paymentCurrency: { type: String },
    convertedAmount: {type: Number},
    rateOnConversion: {type: Number},
    transactionType:{type: String,enum: ['airtime','zesa']},
    paymentPlatform: {
    type: [String],  // Changed data type to Array of Strings
    default: '',    // Set default value as an empty array
  },
    targetedPhone: {type: String},
    fname: {type: String},
    customerName: {type: String},
    customerAddress:{type: String},
    meterNumber:{type: String},
    paymentStatus: {type: String, enum: ['pending','completed','cancelled','failed']},
    paymentReference: {type: String},
    transactionReference: {type: String},
    transactionStatus: {type: String, enum: ['pending','completed','cancelled','processing','failed']},
    startTime: {type: Date},
    endTime: {type: Date},
    paymentMethod: {type: String, enum: ['pese','stripe']}
});

module.exports = mongoose.model("transaction",Transaction);