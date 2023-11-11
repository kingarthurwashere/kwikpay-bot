const { HotRecharge, Currency } = require( "hotrecharge" );
const config = require( '../config' );

const recharge = new HotRecharge( {
  email: config.HOT_RECHARGE_EMAIL,
  password: config.HOT_RECHARGE_PW,
} );

async function processZesaPayment ( meterNumber, amount, mobileNumber )
{
  try
  {
    const response = await recharge.rechargeZesa( amount, mobileNumber, meterNumber );
    if ( response.ReplyCode === 2 )
    {
      // Successful recharge logic here
      const { Token, Units, NetAmount, Levy, Arrears, TaxAmount, ZesaReference } = response.Tokens[ 0 ];
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
        reference: ZesaReference,
      };
    } else
    {
      return null;
    }
  } catch ( error )
  {
    if ( error.response && error.response.data )
    {
      return {
        error: true,
        errorType: String( error.response.data.Message ),
      };
    } else
    {
      // Handle other error cases if needed
      return {
        error: true,
        errorType: 'Unknown error',
      };
    }
  }
}

async function processAirtime ( amount, targetMobile, CustomerSMS )
{
  try
  {
    const response = await recharge.pinlessRecharge(
      amount,
      targetMobile,
      '',
      CustomerSMS,
      Currency.USD
    );
    if ( response.ReplyCode === 2 )
    {
      // Recharge was successful, and you can add your own business logic here
      const { ReplyMsg, AgentReference } = response;
      return ReplyMsg;
    } else
    {
      return null;
    }
  } catch ( error )
  {
    if ( error.response && error.response.data )
    {
      return {
        error: true,
        errorType: String( error.response.data.Message ),
      };
    } else
    {
      // Handle other error cases if needed
      return {
        error: true,
        errorType: 'Unknown error',
      };
    }
  }
}

async function isValidPhone ( phone )
{
  if ( phone && phone.startsWith( '07' ) && phone.length === 10 )
  {
    return true;
  } else
  {
    return false;
  }
}

async function isValidMeter ( message )
{
  try
  {
    const customer = await recharge.enquireZesaCustomer( message );
    if ( customer.ReplyCode === 2 )
    {
      return {
        meter: customer.Meter,
        customerName: String( customer.CustomerInfo.CustomerName ).split( '\n' )[ 0 ],
        address: String( customer.CustomerInfo.CustomerName ).split( '\n' )[ 1 ],
      };
    } else
    {
      return {
        msg: 'Invalid Meter',
      };
    }
  } catch ( error )
  {
    if ( error.response && error.response.data )
    {
      return {
        error: true,
        errorType: String( error.response.data.Message ).toLowerCase().includes( 'invalid' )
          ? 'invalid'
          : 'network',
      };
    } else
    {
      // Handle other error cases if needed
      return {
        error: true,
        errorType: 'Unknown error',
      };
    }
  }
}

module.exports = { processAirtime, processZesaPayment, isValidPhone, isValidMeter };
