const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;

const CurrencyRate = new Schema( {
    _id: { type: Schema.Types.ObjectId, auto: true },
    currencyfrom: { type: String ,enum:['ZWD','USD','ZAR','GBP']},
    currencyto: { type: String,enum:['ZWD','USD','ZAR','GBP'] },
    rate: { type: Number }
} );

module.exports = mongoose.model('currencyrate',CurrencyRate);