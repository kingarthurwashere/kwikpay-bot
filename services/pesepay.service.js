// Import the required modules
const { Pesepay } = require('pesepay');
const config = require('../config');

// Replace the following variables with your actual values
const integrationKey = 'b32bae83-ea8a-4e4a-9b33-80851b1a5514';
const encryptionKey = '6b2a34e90711448a88253ca906727335';
const amount = 1; // Amount in your desired currency's minor unit (e.g., cents)
const currencyCode = 'ZWL'; // Replace with the desired currency code
const paymentReason = 'Test payment';

const pesepay = new Pesepay(integrationKey, encryptionKey);

async function checkout(chatId, fname, transactionId, service) {
  const successUrl = `${config.redirect_url}/pesepay/success?fname=${fname}&chat_id=${chatId}&transaction=${transactionId}&service=${service}`;
  const failureUrl = `${config.redirect_url}/pesepay/failure?fname=${fname}&chat_id=${chatId}&transaction=${transactionId}&service=${service}`;

  // Set the return and result URLs
  pesepay.resultUrl = failureUrl;
  pesepay.returnUrl = successUrl;

  try {
    // Step 1: Create a transaction
    const transaction = pesepay.createTransaction(amount, currencyCode, paymentReason);

    // Step 2: Initiate the transaction
    const response = await pesepay.initiateTransaction(transaction);

    // Use the redirect URL to complete the transaction on the Pesepay payment page
    const redirectUrl = response.redirectUrl;
    // Save the reference number (used to check the status of a transaction and make the payment)
    const referenceNumber = response.referenceNumber;

    // Step 3: Poll for the transaction status (Optional, based on your use case)
    const pollResponse = await pesepay.pollTransaction(response.pollUrl);

    // Check if the poll was successful and the payment was made
    if (pollResponse.success && pollResponse.paid) {
      console.log('Payment was successful!');
    } else {
      console.log('Payment is still pending or not paid yet.');
    }

    // Step 4: Check the transaction status using referenceNumber
    const checkPaymentResponse = await pesepay.checkPayment(referenceNumber);

    // Check if the payment was successful
    if (checkPaymentResponse.success && checkPaymentResponse.paid) {
      console.log('Payment was successful!');
    } else {
      console.log('Payment is still pending or not paid yet.');
    }

    return redirectUrl;
  } catch (error) {
    console.error('Error initiating Pesepay transaction:', error);
    return null;
  }
}

module.exports = { checkout };