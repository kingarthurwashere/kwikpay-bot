const { Pesepay } = require('pesepay');
const config = require('../config');
const axios = require('axios');

// Create an instance of the Pesepay class using your integration key and encryption key
const pesepay = new Pesepay(config.INTEGRATION_KEY, config.ENCRYPTION_KEY);

async function checkout(chatId, fname, transactionId, service, amount, currency) {
  const successUrl = `${config.redirect_url}/success?fname=${fname}&chat_id=${chatId}&transaction=${transactionId}&service=${service}`;
  const failureUrl = `${config.redirect_url}/failure?fname=${fname}&chat_id=${chatId}&transaction=${transactionId}&service=${service}`;

  // Set the return and result URLs
  pesepay.returnUrl = successUrl;
  pesepay.resultUrl = failureUrl;

  try {
    // Create a Pesepay session
    const session = await pesepay.checkout.session.create({
      amount: amount,
      currency: currency,
      description: 'Payment for a product',
    });

    // Get the payment URL from the session
    const paymentUrl = session.paymentUrl;
    return paymentUrl;
  } catch (error) {
    console.error('Error generating Pesepay payment URL:', error);
    return null;
  }
}

module.exports = { checkout };

