const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;

const CurrencyRate = new Schema( {
    _id: { type: Schema.Types.ObjectId, auto: true },
    currencyfrom: { type: String ,enum:['ZWD','USD','ZAR','GDP']},
    currencyto: { type: String,enum:['ZWD','USD','ZAR','GDP'] },
    multiplier: { type: Number }
} );

module.exports = mongoose.model('currencyrate',CurrencyRate);