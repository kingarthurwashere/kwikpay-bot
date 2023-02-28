const mongoose = require( 'mongoose');
const Schema = mongoose.Schema;

const processZesaPayment = new Schema( {
    _id: { type: Schema.Types.ObjectId, auto: true },
    firstName: {type: String},
    surName: {type: String},
    role:{type: String,
        enum: ['user','admin']
    },
    chatId: { type: String },
    amount: { type: Number },
    mobileNumber: { type: Number },
    meterNumber: {type: Number}
} );

module.exports = mongoose.model(zesa);