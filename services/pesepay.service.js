// Import the required modules
const { Pesepay } = require( 'pesepay' );
const Transaction = require( '../models/transaction.model' );
const config = require( '../config' );
const transactionService = require( '../services/transaction.service' );

// Replace the following variables with your actual values
const integrationKey = config.PESE_INTEGRATION_KEY;
const encryptionKey = config.PESE_ENCRYPTION_KEY;
const currencyCode = 'USD'; // Replace with the desired currency code
const paymentReason = 'Electricity and Airtime Purchases';

const pesepay = new Pesepay( integrationKey, encryptionKey );

async function checkout ( transactionId )
{
  try
  {
    // Construct URLs using the referenceNumber
    const successUrl = `${ config.redirect_url }/pesepay/success?transaction=${ transactionId }`;
    const failureUrl = `${ config.redirect_url }/pesepay/failure?transaction=${ transactionId }`;

    // Set the result and return URLs
    pesepay.resultUrl = successUrl;
    pesepay.returnUrl = failureUrl;

    let transaction = await transactionService.findById( transactionId )

    if ( transaction )
    {
      // Step 1: Create a transaction
      try
      {
        const peseTransaction = pesepay.createTransaction( transaction.amount, currencyCode, paymentReason );

        // Step 2: Initiate the transaction
        const response = await pesepay.initiateTransaction( peseTransaction );

        // Use the redirect URL to complete the transaction on the Pesepay payment page
        if ( response )
        {
          const redirectUrl = response.redirectUrl;
          // UPDATE REFERENCE
          await transactionService.update( transaction._id, { transactionReference: response.referenceNumber, paymentCurrency: currencyCode } );
          return redirectUrl;
        } else
        {
          return null;
        }
      } catch ( e )
      {
      }

    } else
    {
      return { error: "Transaction Not Found" };
    }
  } catch ( error )
  {
    console.error( 'Error initiating Pesepay transaction:', error );
    return null;
  }
}

module.exports = { checkout };
