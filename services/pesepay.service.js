const config = require('../config');
const axios = require('axios');

async function checkout(chatId, user, transaction_id, service, amount, currency) {
  const successUrl = `${config.redirect_url}/success?fname=${user}&chat_id=${chatId}&transaction=${transaction_id}&service=${service}`;
  const failerUrl = `${config.redirect_url}/failure?fname=${user}&chat_id=${chatId}&transaction=${transaction_id}&service=${service}`;

  try {
    const response = await axios.post('https://pesepay.com/api/v1/payment', {
      amount: amount,
      currency: currency,
      description: 'Payment for a product',
      success_url: successUrl,
      cancel_url: failerUrl,
    });

    const paymentUrl = response.data.paymentUrl;
    return paymentUrl || null;
  } catch (error) {
    console.error('Error creating Pesepay payment:', error);
    return null;
  }
}

module.exports = { checkout };
