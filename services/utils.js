const { HotRecharge, Currency } = require("hotrecharge");
const config = require('../config');
const { error } = require("console");

const hotrecharge = new HotRecharge({
email: config.HOT_RECHARGE_EMAIL,
password: config.HOT_RECHARGE_PW,
});

// Use this to request for verify customer information
// using their meter number so they can verify if the // information being returned for that meter number
// is the same as the one they want to pay for 
async function checkZesaCustomer ( meterNumber )
{
  return await hotrecharge.enquireZesaCustomer( meterNumber );
}

async function processZesaPayment (meterNumber, amount, mobileNumber) {
  const response = await hotrecharge.rechargeZesa(
    amount,
    mobileNumber,
    meterNumber
  );

  if ( response.ReplyCode == 2 )
  {
  
  // recharge was successful and you can add your own business logic here // and get the token from the response
  // get this information from the returned token
  // Token being the actual rechargeable unit you need // Units being the topup value in kwH
  // NetAmount being the total amount paid up // You may need to save ZesaReference i.e. you can use this in case of errors with the token // then you can enquire about this using the reference or RechargeID in the root tree

    const { Token, Units, NetAmount, Levy, Arrears, TaxAmount, ZesaReference } =
      response.Tokens[ 0 ]; 
    const { Amount,Meter,AccountName,Address} = response

      return {
        amount:Amount,
        meter: Meter,
        name: AccountName,
        address: Address,
        token: Token,
        units: Units,
        netamount: NetAmount,
        levy: Levy,
        arrears: Arrears,
        tax: TaxAmount,
        reference: ZesaReference
      }
  } else
  {
    console.log( response );
    return null;
  }
}


//Airtime function
async function processAirtime (amount, targetMobile, CustomerSMS)
{
  const response = await hotrecharge.pinlessRecharge(
    amount,
    targetMobile,
    '',
    CustomerSMS,
    Currency.USD
  );
  if ( response.ReplyCode == 2 )
  {
    //recharge was successful and you can add your own business logic here
    const { ReplyMsg,AgentReference } = response;
    return ReplyMsg;
  } else{
    return null;
  }
}

async function isValidPhone(phone){
  if(phone && phone.startsWith("07") && phone.length==10){
    return true
  } else{
    return false
  }
}

async function isValidMeter(message){

  return new Promise((resolve)=>{
  checkZesaCustomer(message)
  .then((customer)=>{
    resolve({
      meter:customer.Meter,
     customerName:String(customer.CustomerInfo.CustomerName).split('\n')[0],
     address:String(customer.CustomerInfo.CustomerName).split('\n')[1]
   })
   }).catch((error)=>{
    resolve({error: true,
      erroType: String(error.response.data.Message)
      .toLocaleLowerCase()
      .includes("invalid")?"invalid":"network"
})
})
})
}
  


module.exports = { processAirtime, processZesaPayment,checkZesaCustomer,isValidPhone,isValidMeter};