const config = require('../config');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(config.token, { polling: false });
const utils = require( '../services/utils' );
const mongoose = require('mongoose');
const Transaction = require('../models/transaction.model');
const transactionService = require('../services/transaction.service');
const rateService = require('../services/currency_rate.service');
const { Pesepay } = require('pesepay');
const { request } = require( 'express' );
const integrationKey = 'b32bae83-ea8a-4e4a-9b33-80851b1a5514';
const encryptionKey = '6b2a34e90711448a88253ca906727335';

const pesepay = new Pesepay( integrationKey, encryptionKey );

exports.success = async ( req, res ) =>
{ 

    const success_message = `Dear <b><em>${req.query.fname}</em></b> Your Payment Has Been Received.
    Please wait whilest we transfer your ${req.query.service } to your account.`
  
    
     const currencyCode = req.body.amountDetails.currencyCode
     const amount = req.body.amountDetails.amount
     const referenceNumber = req.body.referenceNumber;
     const transaction = req.query.transaction
     const chatId = req.query.chat_id
     const rate = await rateService.findByCurrencyFrom(String(currencyCode).toUpperCase());
    
    
  if ( req.body && req.body.transactionStatus == 'SUCCESS' )
  {
        await bot.sendMessage(chatId, success_message, { parse_mode: "HTML" })
        let savedTransaction = await transactionService.update(transaction, {
            paymentStatus: 'completed', amount: amount,
            paymentCurrency: String(currencyCode).toLowerCase(),
            transactionStatus: 'success',
            paymentReference: referenceNumber,
            fname: req.query.fname
        })
        if (savedTransaction) {
            if (req.query.service) {
                if (req.query.service == 'airtime') {
                    let customerSMS = `Your account has been credited with USD${amount} of airtime from KwikPay HotRecharge`
                    const response = await utils.processAirtime(amount, savedTransaction.targetedPhone, customerSMS)
                    if (response && !response.error) {
                        let message = `Dear ${req.query.fname}, <b>${savedTransaction.targetedPhone}</b> has 
                    been successfully credited with <b>USD</b>${amount} of airtime.`
                        await transactionService.update(savedTransaction._id, {
                            transactionStatus: 'completed', endTime: new Date()
                            , transactionReference: response.AgentReference
                        })
                        await bot.sendMessage(chatId, message, { parse_mode: "HTML" })
                    } else {
                        let message = `Dear ${req.query.fname}, we recieved your payment
                    of ${amount} but we are facing challenges with the recharge platform.We will automatically recharge your account 
                    and notify you as soon as we credit ${savedTransaction.targetedPhone}.`
                        await transactionService.update(savedTransaction._id, { transactionStatus: 'pending' })
                        await bot.sendMessage(chatId, message, { parse_mode: "HTML" })
                    }
                } else {
                    //HOT RACHARGE ZESA
                    //AMOUNT IN RTGS
                    const convertedAmount = rate?rate.rate * amount:amount
                    const response = await utils.processZesaPayment(savedTransaction.meterNumber,convertedAmount, savedTransaction.targetedPhone);
                    if (response != null && !response.error) {
                        let reference = response.reference
                        let message = `Dear <em>${req.query.fname}</> Your ZESA Transaction has been successful. The following are the details:
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
                        await bot.sendMessage(chatId, message, { parse_mode: "HTML" })
                    } else {
                        let message = `Dear ${req.query.fname}, we recieved your payment
                of ${convertedAmount} but the ZESA Processing facility is not available at the moment.
                \nWe will keep trying to automatically credit your account.`
                        await transactionService.update(savedTransaction._id, { transactionStatus: 'pending' })
                        await bot.sendMessage(chatId, message, { parse_mode: "HTML" })
                    }
                }
            }

        }

  } else
  {
        const failure_message = ` Dear <b><em>${req.query.fname}</em></b> Your <b><em>${currencyCode}${amount}</em></b> Payment Failed to Complete successfully`
        await bot.sendMessage(chatId, failure_message, { parse_mode: "HTML" })
        await transactionService.update(transaction, {
            paymentStatus: 'failed', amount: amount,
            paymentCurrency: String(currencyCode).toLowerCase(), rateOnConversion: rate, convertedAmount: convertedAmount,
            paymentReference: referenceNumber, transactionStatus: 'failed'
        })
    }
    res.redirect(`https://t.me/${config.BOT_USER}?chat_id=${chatId}`)
};

exports.failure = async (req, res) => {
    const failure_message = ` Dear <b><em>${req.query.fname}</em></b> Your Payment Has Been Cancelled`
    
    if (req.body && req.body.transactionStatus == 'CANCELLED') {
        const currency = req.body.amountDetails.currencyCode
        const amount = req.body.amountDetails.amount
        const reference = req.body.referenceNumber
        const transaction = req.query.transaction
        const chatId = req.query.chat_id
        const rate = await rateService.findByCurrencyFrom(String(currency).toUpperCase());
        //AMOUNT IN RTGS
        const convertedAmount = rate * amount
        await bot.sendMessage(chatId, failure_message, { parse_mode: "HTML" })
        await transactionService.update(transaction, {
            paymentStatus: 'cancelled', amount: amount,
            paymentCurrency: String(currency).toLowerCase(), rateOnConversion: rate, convertedAmount: convertedAmount,
            paymentReference: reference, transactionStatus: 'cancelled'
        })
        res.redirect(`https://t.me/${config.BOT_USER}?chat_id=${chatId}`)

    }
}

exports.processPendingTransactions = async () => {
  const transactions = await transactionService.findTransactionsPendingSettlement();

  if (transactions && transactions.length > 0) {
    for (const trans of transactions) {
      if (trans.transactionType === 'airtime') {
        const customerSMS = `Your account has been credited with <b>USD</b>${trans.amount} of airtime from KwikPay HotRecharge`;
        const response = await utils.processAirtime(trans.amount, trans.targetedPhone, customerSMS);

        if (response !== null) {
          const message = `Dear ${trans.fname}, <b>${trans.targetedPhone}</b> has been successfully credited with <b>USD</b>${trans.amount} of airtime.`;
          await transactionService.update(trans._id, {
            transactionStatus: 'completed',
            endTime: new Date(),
            transactionReference: response.AgentReference,
          });
          await bot.sendMessage(trans.chatId, message, { parse_mode: 'HTML' });
        }
      } else if (trans.transactionType === 'zesa') {
        const response = await utils.processZesaPayment(trans.convertedAmount, trans.meterNumber, trans.targetedPhone);

        if (response !== null) {
          const reference = response.reference;
          const message = `Dear <em>${trans.fname}</em>, Your ZESA Transaction has been successful. The following are the details:
            \n Meter Number: ${response.meter}
            \n Amount: <b>ZWL</b>${response.amount},
            \n Name: ${response.name},
            \n Address: ${response.address},
            \n Token: ${response.token},
            \n Units: ${response.units},
            \n Net Amount: <b>ZWL</b>${response.netamount},
            \n Levy: ${response.levy},
            \n Arrears: ${response.arrears},
            \n Tax: ${response.reference},
            \n Reference: ${reference}`;

          await transactionService.update(trans._id, { transactionStatus: 'completed', transactionReference: reference, endTime: new Date() });
          await bot.sendMessage(trans.chatId, message, { parse_mode: 'HTML' });
        }
      }
    }
  }
};
