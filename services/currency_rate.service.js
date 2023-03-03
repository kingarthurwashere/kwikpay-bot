const CurrencyRate = require('../models/currency_rate.model');


// Create New Currency Rate
async function create(rateParam){
    // Validate
    const duplicate = await CurrencyRate.findOne({ currencyfrom: rateParam.currencyfrom,currencyto: rateParam.currencyfrom});
    if (duplicate) {
        return { 
            status: 409,
            message: 'Rate already Exists'
         };
    }
   

    let rate = new CurrencyRate(rateParam);
    

    // Save Rate
    await rate.save();

    return CurrencyRate.findOne({ currencyfrom: rateParam.currencyfrom,currencyto: rateParam.currencyfrom});

}


// Update Rate
async function update(id, rateParam) {
    let rate = await CurrencyRate.findById(id);
    // Validate
    if (!rate) throw 'Rate not Found';

    // Copy rateParam
    Object.assign(rate, rateParam);

    await rate.save();

    return CurrencyRate.findById(id);

}

async function getOne(id){

    return CurrencyRate.findById(id);
}

module.exports = { create,getOne, update};
