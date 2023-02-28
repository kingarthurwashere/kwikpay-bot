const TelegramBot = require( 'node-telegram-bot-api' );
const config = require( './config' );
const bot = new TelegramBot( config.token, { polling: true } );
const utils = require( './utils' );

//Bot commands

  

bot.onText( /\/start/, function ( msg )
  {

    bot.sendMessage( msg.from.id, `Hello, ${ msg.from.first_name } .Please press the following /purchase to make transaction`);
  } );

bot.onText(/\/purchase/, function onPurchaseText(msg) {
  const opts = {
    reply_to_message_id: msg.message_id,
    reply_markup: JSON.stringify({
      keyboard: [
        ['/Airtime'],
        ['/ZESA']
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    })
  };
  bot.sendMessage(msg.chat.id, 'What did you want to purchase?', opts);
});

// Matches /ZESA
bot.onText( /\/ZESA/, function onZESAText ( msg )
{
  
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Meter Number',
            callback_data: 'process'
          }
        ]
      ]
    }
  };
  bot.sendMessage(msg.from.id, 'We are processing', opts);
} );

const processZesaPayment = await hotrecharge.rechargeZesa(
    amount,
    mobileNumber,
    meterNumber
  );

// Matches /Airtime
bot.onText(/\/Airtime/, function onAirtimeText(msg) {
   const opts = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Voice",
            callback_data: 'via' // You MUST use exactly one of the optional fields.
          },
          {
            text: "Data bundles",
            callback_data: 'pay' // You MUST use exactly one of the optional fields.
          },
        ],
      ]
    }
  };
  bot.sendMessage(msg.from.id, 'Please click the following buttons', opts);
} );

const processAirtime = await hotrecharge.pinlessRecharge(
    targetMobile,
    amount,
    BrandID,
    CustomerSMS
  );
 
/** Exports */
module.exports = bot;