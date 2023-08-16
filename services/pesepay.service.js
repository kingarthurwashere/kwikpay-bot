// Import the required modules
const { Pesepay } = require('pesepay');
const Transaction = require('../models/transaction.model');
const config = require('../config');

// Replace the following variables with your actual values
const integrationKey = 'b32bae83-ea8a-4e4a-9b33-80851b1a5514';
const encryptionKey = '6b2a34e90711448a88253ca906727335';
const amount = 2; // Amount in your desired currency's minor unit (e.g., cents)
const currencyCode = 'ZWL'; // Replace with the desired currency code
const paymentReason = 'Test payment';

const pesepay = new Pesepay(integrationKey, encryptionKey);

async function checkout(chatId, fname, transactionId, service) {
  try {
    // Construct URLs using the referenceNumber
    const referenceNumber = ''; // Define referenceNumber here
    const successUrl = `${config.redirect_url}/pesepay/success?referenceNumber=${referenceNumber}&fname=${fname}&chat_id=${chatId}&transaction=${transactionId}&service=${service}`;
    const failureUrl = `${config.redirect_url}/pesepay/failure?referenceNumber=${referenceNumber}&fname=${fname}&chat_id=${chatId}&transaction=${transactionId}&service=${service}`;

    // Set the result and return URLs
    pesepay.resultUrl = successUrl;
    pesepay.returnUrl = failureUrl;

    // Step 1: Create a transaction
    const transaction = pesepay.createTransaction(amount, currencyCode, paymentReason);

    // Step 2: Initiate the transaction
    const response = await pesepay.initiateTransaction( transaction );

    //Define PollUrl here
    const pollUrl = '';

    // Use the redirect URL to complete the transaction on the Pesepay payment page
    const redirectUrl = response.redirectUrl;

    const newTransaction = new Transaction({
      chatId: chatId,
      amount: amount,
      paymentCurrency: currencyCode,
      paymentStatus: 'pending',
      paymentReference: response.referenceNumber, // Save the referenceNumber from the response
      transactionPollUrl: response.pollUrl, // Save the Pollurl from the response
      transactionStatus: 'pending',
      paymentMethod: 'pesepay',
    });

    await newTransaction.save();

    return redirectUrl;
  } catch (error) {
    console.error('Error initiating Pesepay transaction:', error);
    return null;
  }
}

module.exports = { checkout };
