const pesepay = require('pesepay');
const config = require( '../config' );
const pesepay = pesepay(config.INTEGRATION_KEY, config.ENCRYPTION_KEY);


async function checkout(chatId,user,transaction_id,service) {
  
  const successUrl = `${config.redirect_url}/success?session_id={CHECKOUT_SESSION_ID}&fname=${user}&chat_id=${chatId}&transaction=${transaction_id}&service=${service}`
  const failerUrl = `${config.redirect_url}/failure?session_id={CHECKOUT_SESSION_ID}&fname=${user}&chat_id=${chatId} &transaction=${transaction_id}&service=${service}`
  const session = await pesepay.checkout.sessions.create({
    line_items: [
      {
        price: config.SUBSCRIPTION_PRICE,
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: failerUrl,

  });

  return session.url||null
};

module.exports = { checkout};