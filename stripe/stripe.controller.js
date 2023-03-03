const config = require('../config')
const stripe = require('stripe')(config.STRIPE_KEY);
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(config.BOT_API, { polling: false });
const utils = require('../services/utils');

exports.success = async (req, res) => {

    const success_message = `Dear <b><em>${req.query.fname}</em></b> Your Payment Has Been Received.
    Please wait whilest we transfer your ${req.query.service} to your account.`
  
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    if(session && session.payment_status=='paid'){
        const currency = session.currency
        const amount = session.amount_total
        const reference = req.query.session_id

        console.log("==OOH MY ==="+currency+"AM=="+amount+"===REF="+reference)
     

    res.redirect(`https://t.me/${config.BOT_USER}?chat_id=${chatId}`) 
    }
};

exports.failure = async(req, res) => {
    const failure_message = ` Dear <b><em>${req.query.fname}</em></b> Your Payment Has Been Cancelled`
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    if(session && session.customer){
    const chatId = req.query.chat_id
    await bot.sendMessage(chatId,failure_message,{parse_mode:"HTML"})
    res.redirect(`https://t.me/${config.BOT_USER}?chat_id=${chatId}`) 
    
}
}
