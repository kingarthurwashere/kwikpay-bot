const { HotRecharge, Currency } = require("hotrecharge");
const config = require('../config');
const { response } = require("express");

const hotrecharge = new HotRecharge({
  email: config.HOT_RECHARGE_EMAIL,
  password: config.HOT_RECHARGE_PW,
});

async function checkZesaCustomer(meterNumber) {
  try {
    if (!meterNumber) {
      throw new Error("Meter number is required.");
    }

    return await hotrecharge.enquireZesaCustomer(meterNumber);
  } catch (error) {
    console.error("Error in checkZesaCustomer:", error);
    showNetworkError();
    throw error;
  }
}

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

async function processAirtime(amount, targetMobile, CustomerSMS) {
  return new Promise((resolve) => {
    hotrecharge.pinlessRecharge(amount, targetMobile, '', CustomerSMS, Currency.USD)
    .then((response)=>{
      if (response.ReplyCode === 2) {
        // Successful recharge logic here
        const { ReplyMsg, AgentReference } = response;
        resolve (ReplyMsg);
      } else {
        resolve(null);
      }
    }).catch((error) => {
        resolve({
          error: true,
          errorType: String(error.response.data.Message)
        })
      })
    })
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
    checkZesaCustomer(message)
      .then((customer) => {
        resolve({
          meter: customer.Meter,
          customerName: String(customer.CustomerInfo.CustomerName).split('\n')[0],
          address: String(customer.CustomerInfo.CustomerName).split('\n')[1]
        })
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

// networkError

async function showNetworkError() {
  alert("Network error occurred. Please try again later.");
}

module.exports = { processAirtime, processZesaPayment, checkZesaCustomer, isValidPhone, isValidMeter, showNetworkError };
