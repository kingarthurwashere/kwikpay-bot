const { HotRecharge, Currency } = require("hotrecharge");
const config = require('../config');

const hotrecharge = new HotRecharge({
  email: config.HOT_RECHARGE_EMAIL,
  password: config.HOT_RECHARGE_PW,
});

async function processZesaPayment(meterNumber, amount, mobileNumber) {

  return new Promise((resolve) => {  
    hotrecharge.rechargeZesa(amount, mobileNumber, meterNumber)
    .then((response)=>{
     
    if (response.ReplyCode === 2) {
      // Successful recharge logic here
      const { Token, Units, NetAmount, Levy, Arrears, TaxAmount, ZesaReference } = response.Tokens[0];
      const { Amount, Meter, AccountName, Address } = response;

      resolve( {
        amount: Amount,
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
      })
    } else {
     
      resolve(null);
    }
    }).catch ((error)=> {
      resolve({
        error: true,
        errorType: String(error.response.data.Message)
      })
  })
})
}

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

async function isValidPhone(phone) {
  if (phone && phone.startsWith("07") && phone.length === 10) {
    return true;
  } else {
    return false;
  }
}

async function isValidMeter(message) {

  return new Promise((resolve) => {
    hotrecharge.enquireZesaCustomer(message)
      .then((customer) => {
        if(customer.ReplyCode ===2){
        resolve({
          meter: customer.Meter,
          customerName: String(customer.CustomerInfo.CustomerName).split('\n')[0],
          address: String(customer.CustomerInfo.CustomerName).split('\n')[1]
        })
      }else{
        resolve({
          msg: "Invalid Meter"
        })
      }
      }).catch((error) => {
        resolve({
          error: true,
          errorType: String(error.response.data.Message)
            .toLocaleLowerCase()
            .includes("invalid") ? "invalid" : "network"
        })
      })
  })
}


module.exports = { processAirtime, processZesaPayment, isValidPhone, isValidMeter};
