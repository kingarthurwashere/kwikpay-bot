let config = {

  mongo: {
    url: 'mongodb://127.0.0.1:27017/kwikpaybottest',

  },

  token: process.env.TELEGRAM_API_KEY,
  redirect_url: process.env.REDIRECT_URL,
  STRIPE_KEY: process.env.STRIPE_KEY,
  SUBSCRIPTION_PRICE: process.env.SUBSCRIPTION_PRICE,
  BOT_USER: process.env.BOT_USER,
  BOT_ADMINS: process.env.BOT_ADMINS?.split( ',' ),
  HOT_RECHARGE_EMAIL: process.env.HOT_RECHARGE_EMAIL,
  HOT_RECHARGE_PW: process.env.HOT_RECHARGE_PW,
  INTEGRATION_KEY: process.env.INTEGRATION_KEY,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  PESE_INTEGRATION_KEY: process.env.PESE_INTEGRATION_KEY,
  PESE_ENCRYPTION_KEY: process.env.PESE_ENCRYPTION_KEY


};

module.exports = config;
