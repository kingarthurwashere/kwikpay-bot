let config = {
     
    mongo: {
        url: 'mongodb://127.0.0.1:27017/kwikpaybot',
        
    },

  token: process.env.TELEGRAM_API_KEY,
  redirect_url: process.env.REDIRECT_URL,
  STRIPE_KEY: process.env.STRIPE_KEY,
  SUBSCRIPTION_PRICE: process.env.SUBSCRIPTION_PRICE,
  BOT_USER: process.env.BOT_USER
  
};

module.exports = config;
