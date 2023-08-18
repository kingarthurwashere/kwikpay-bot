const config = require('../config');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(config.token, { polling: false });
const utils = require( '../services/utils' );
const transactionService = require('../services/transaction.service');
const rateService = require('../services/currency_rate.service');

exports.success = async ( req, res ) =>
{ 
  let transaction = await transactionService.findById( req.query.transaction);
    const success_message = `Dear <b><em>${transaction.fname}</em></b> Your Payment Has Been Received.
    Please wait whilest we transfer your ${transaction.transactionType } to your account.`
  
     // DEFAULT TO USD IF PESE PAY
     const rate = await rateService.findByCurrencyFrom('USD');
    
    // CONFIRM IF THE METHOD RETURNS  transactionStatus == 'SUCCESS' AFTER SUCCESS
  if ( req.body && req.body.transactionStatus == 'SUCCESS' )
  {
        await bot.sendMessage(transaction.chatId, success_message, { parse_mode: "HTML" })
        let savedTransaction = await transactionService.update(transaction._id, {
            paymentStatus: 'completed',
            paymentCurrency:'USD'
        })

        if (savedTransaction) {
                if (savedTransaction.transactionType == 'airtime') {
                  let amount = savedTransaction.amount;
                    let customerSMS = `Your account has been credited with USD${amount} of airtime from KwikPay HotRecharge`
                    const response = await utils.processAirtime(amount, savedTransaction.targetedPhone, customerSMS)
                    if (response && !response.error) {
                        let message = `Dear ${savedTransaction.fname}, <b>${savedTransaction.targetedPhone}</b> has been successfully credited with <b>USD</b>${amount} of airtime.`
                        await transactionService.update(savedTransaction._id, {
                            transactionStatus: 'completed', endTime: new Date()
                            , transactionReference: response.AgentReference
                        })
                        await bot.sendMessage(savedTransaction.chatId, message, { parse_mode: "HTML" })
                    } else {
                        let message = `Dear ${savedTransaction.fname}, we recieved your payment
                    of ${amount} but we are facing challenges with the recharge platform.We will automatically recharge your account 
                    and notify you as soon as we credit ${savedTransaction.targetedPhone}.`
                        await transactionService.update(savedTransaction._id, { transactionStatus: 'pending' })
                        await bot.sendMessage(savedTransaction.chatId, message, { parse_mode: "HTML" })
                    }
                } else {
                    //HOT RACHARGE ZESA
                    //AMOUNT IN RTGS
                    const convertedAmount = rate?rate.rate * amount:amount
                    const response = await utils.processZesaPayment(savedTransaction.meterNumber,convertedAmount, savedTransaction.targetedPhone);
                    if (response != null && !response.error) {
                        let reference = response.reference
                        let message = `Dear <em>${savedTransaction.fname}</> Your ZESA Transaction has been successful. The following are the details:
                \n Meter Number: ${response.meter}
                \n Amount :  <b>ZWL</b>${response.amount},
                \n Name: ${response.name},
                \n Address: ${response.address},
                \n Token: ${response.token},
                \n Units: ${response.units},
                \n Net Amount:  <b>ZWL</b>${response.netamount},
                \n Levy: ${response.levy},
                \n Arrears: ${response.arrears},
                \n Tax: ${response.reference},
                \n Reference: ${reference}
                `
                        await transactionService.update(savedTransaction._id, { transactionStatus: 'completed', transactionReference: reference,
                        convertedAmount: convertedAmount,rateOnConversion: rate?rate.rate:1, endTime: new Date() })
                        await bot.sendMessage(savedTransaction.chatId, message, { parse_mode: "HTML" })
                    } else {
                        let message = `Dear ${savedTransaction.fname}, we recieved your payment
                of ${convertedAmount} but the ZESA Processing facility is not available at the moment.
                \nWe will keep trying to automatically credit your account.`
                        await transactionService.update(savedTransaction._id, { transactionStatus: 'pending' })
                        await bot.sendMessage(savedTransaction.chatId, message, { parse_mode: "HTML" })
                    }
                }
            }

  } else
  {
        const failure_message = ` Dear <b><em>${transaction.fname}</em></b> Your <b><em>USD${transaction.amount}</em></b> Payment Failed to Complete successfully`
        await bot.sendMessage(transaction.chatId, failure_message, { parse_mode: "HTML" })
        await transactionService.update(transaction._id, {
            paymentStatus: 'failed', 
            rateOnConversion: rate.rate, 
            convertedAmount: transaction.amount*rate.rate,
            transactionStatus: 'failed'
        })
    }
    res.redirect(`https://t.me/${config.BOT_USER}?chat_id=${transaction.chatId}`)
};

exports.failure = async (req, res) => {
  let transaction = await transactionService.findById( req.query.transaction);
    const failure_message = ` Dear <b><em>${transaction.fname}</em></b> Your Payment Has Been Cancelled`
    
    if (req.body && req.body.transactionStatus == 'CANCELLED') {

    
        await bot.sendMessage(transaction.chatId, failure_message, { parse_mode: "HTML" })
        await transactionService.update(transaction._id, {
            paymentStatus: 'cancelled'
        })
        res.redirect(`https://t.me/${config.BOT_USER}?chat_id=${transaction.chatId}`)

    }
}

