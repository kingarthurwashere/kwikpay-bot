const config = require('../config');
const axios = require('axios');

async function checkout(chatId, fname, transactionId, service, amount, currency) {
  const successUrl = `${config.redirect_url}/success?fname=${fname}&chat_id=${chatId}&transaction=${transactionId}&service=${service}`;
  const failureUrl = `${config.redirect_url}/failure?fname=${fname}&chat_id=${chatId}&transaction=${transactionId}&service=${service}`;

  try {
    const response = await axios.post('https://pesepay.com/api/v1/payment', {
      amount: amount,
      currency: currency,
      description: 'Payment for a product',
      success_url: successUrl,
      cancel_url: failureUrl,
    });

    const paymentUrl = response.data.paymentUrl;
    return paymentUrl;
  } catch (error) {
    console.error('Error generating Pesepay payment URL:', error);
    return null;
  }
}

module.exports = { checkout };

