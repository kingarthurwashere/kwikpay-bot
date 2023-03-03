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
    paymentPlatform: { type: String },
    targetedPhone: {type: String},
    meterNumber:{type: String},
    paymentStatus: {type: String, enum: ['pending','completed','cancelled']},
    reference: {type: String},
    transactionStatus: {type: String, enum: ['pending','completed','cancelled']},
    startTime: {type: Date},
    endTime: {type: Date}
} );

module.exports = mongoose.model("transaction",Transaction);