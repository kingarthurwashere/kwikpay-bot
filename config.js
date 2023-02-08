let config = {
     
    mongo: {
        url: 'mongodb://127.0.0.1:27017/kwikpaybot',
        
    },

  token: process.env.TELEGRAM_API_KEY,
  
};

module.exports = config;
