const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;

const processAirtime = new Schema( {
    _id: { type: Schema.Types.ObjectId, auto: true },
    firstName: {type: String},
    surName: {type: String},
    role:{type: String,
        enum: ['user','admin']
    },
    chatId: { type: String },
    targetMobile: { type: Number },
    amount: { type: Number },
    BrandID: { type: String },
    CustomerSMS: {type: String}
} );

module.exports = mongoose.model(airtime);