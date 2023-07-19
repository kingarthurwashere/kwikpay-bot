const pesepay = require('pesepay');
const config = require('../config');

// Create an instance of the Pesepay class using your integration key and encryption key
//const pesepayInstance = new pesepay.Pesepay( config.INTEGRATION_KEY, config.ENCRYPTION_KEY );
const pesepayInstance = new pesepay.Pesepay( '95140383-7a1e-4477-99e9-298480babb3c', '1d93bd646d024d2dad38509f72ca34ae' );

async function checkout(chatId, fname, transactionId, service) {
  const successUrl = `${config.redirect_url}/success?fname=${fname}&chat_id=${chatId}&transaction=${transactionId}&service=${service}`;
  const failureUrl = `${config.redirect_url}/failure?fname=${fname}&chat_id=${chatId}&transaction=${transactionId}&service=${service}`;

  // Set the return and result URLs
  pesepayInstance.resultUrl = failureUrl;
  pesepayInstance.returnUrl = successUrl;

  try {
    // Step 1: Create a transaction
    const transaction = pesepayInstance.createTransaction(
      config.APP_ID,
      config.APP_CODE,
      'Payment for a product'
    );

    // Step 2: Initiate the transaction
    const response = await pesepayInstance.initiateTransaction(transaction);

    // Use the redirect URL to complete the transaction on the Pesepay payment page
    const redirectUrl = response.redirectUrl;
    // Save the reference number (used to check the status of a transaction and make the payment)
    const referenceNumber = response.referenceNumber;
    
    return redirectUrl;
  } catch (error) {
    console.error('Error initiating Pesepay transaction:', error);
    return null;
  }
}

module.exports = { checkout };
