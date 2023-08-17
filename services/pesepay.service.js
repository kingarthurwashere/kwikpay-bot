// Import the required modules
const { Pesepay } = require('pesepay');
const Transaction = require('../models/transaction.model');
const config = require('../config');
const transactionService = require('../services/transaction.service');

// Replace the following variables with your actual values
const integrationKey = 'b32bae83-ea8a-4e4a-9b33-80851b1a5514';
const encryptionKey = '6b2a34e90711448a88253ca906727335';
const amount = 2; // Amount in your desired currency's minor unit (e.g., cents)
const currencyCode = 'ZWL'; // Replace with the desired currency code
const paymentReason = 'Test payment';

const pesepay = new Pesepay(integrationKey, encryptionKey);

async function checkout(transactionId) {
  try {
    // Construct URLs using the referenceNumber
    const successUrl = `${config.redirect_url}/pesepay/success?transaction=${transactionId}`;
    const failureUrl = `${config.redirect_url}/pesepay/failure?transaction=${transactionId}`;

    // Set the result and return URLs
    pesepay.resultUrl = successUrl;
    pesepay.returnUrl = failureUrl;

    let transaction = await transactionService.findById(transactionId)
    if(transaction){
    // Step 1: Create a transaction
    const peseTransaction = pesepay.createTransaction(transaction.amount, currencyCode, paymentReason);

    // Step 2: Initiate the transaction
    const response = await pesepay.initiateTransaction( peseTransaction );

    // Use the redirect URL to complete the transaction on the Pesepay payment page
    if(response){
    const redirectUrl = response.redirectUrl;
    // UPDATE REFERENCE
    await transactionService.update(transaction._id,{transactionReference: response.referenceNumber});
    return redirectUrl;
  }else{
    return null;
  }
}else{
  return {error: "Transaction Not Found"};
}
  } catch (error) {
    console.error('Error initiating Pesepay transaction:', error);
    return null;
  }
}

module.exports = { checkout };
