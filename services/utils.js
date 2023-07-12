const { HotRecharge, Currency } = require("hotrecharge");
const config = require('../config');

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
    console.error( "Error in checkZesaCustomer:", error );
    showNetworkError();
    throw error;
  }
}

async function processZesaPayment(meterNumber, amount, mobileNumber) {
  try {
    const response = await hotrecharge.rechargeZesa(amount, mobileNumber, meterNumber);

    if (response.ReplyCode === 2) {
      // Successful recharge logic here
      const { Token, Units, NetAmount, Levy, Arrears, TaxAmount, ZesaReference } = response.Tokens[0];
      const { Amount, Meter, AccountName, Address } = response;

      return {
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
      };
    } else {
      console.log(response);
      return null;
    }
  } catch (error) {
    console.error( "Error in processZesaPayment:", error );
    showNetworkError();
    throw error;
  }
}

async function processAirtime(amount, targetMobile, CustomerSMS) {
  try {
    const response = await hotrecharge.pinlessRecharge(amount, targetMobile, '', CustomerSMS, Currency.USD);

    if (response.ReplyCode === 2) {
      // Successful recharge logic here
      const { ReplyMsg, AgentReference } = response;
      return ReplyMsg;
    } else {
      return null;
    }
  } catch (error) {
    console.error( "Error in processAirtime:", error );
    showNetworkError();
    throw error;
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
  try {
    const customer = await checkZesaCustomer(message);

    if (customer && customer.CustomerInfo) {
      return {
        meter: customer.Meter,
        customerName: String(customer.CustomerInfo.CustomerName).split('\n')[0],
        address: String(customer.CustomerInfo.CustomerName).split('\n')[1]
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error( "Error in isValidMeter:", error );
    showNetworkError();
    throw error;
  }
}

// networkError

async function showNetworkError() {
  alert("Network error occurred. Please try again later.");
}

module.exports = { processAirtime, processZesaPayment, checkZesaCustomer, isValidPhone, isValidMeter, showNetworkError };
