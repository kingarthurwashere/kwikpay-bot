const config = require('../config');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(config.token, { polling: false });
const utils = require( '../services/utils' );
const mongoose = require('mongoose');
const Transaction = require('../models/transaction.model');
const transactionService = require('../services/transaction.service');
const rateService = require('../services/currency_rate.service');
const { Pesepay } = require('pesepay');
const integrationKey = 'b32bae83-ea8a-4e4a-9b33-80851b1a5514';
const encryptionKey = '6b2a34e90711448a88253ca906727335';

const pesepay = new Pesepay(integrationKey, encryptionKey);

exports.success = async (req, res) => {
  try {
    const { fname, chat_id, service, transaction } = req.query;
    const { amount } = req.query;
    console.log( 'fname:', fname );
    console.log('chatId:', chat_id);
    console.log('service:', service);
    console.log( 'transactionId:', transaction );
    
    const success_message = `Dear <b><em>${fname}</em></b> Your Payment Has Been Received. Please wait while we transfer your ${service} to your account.`;

    // Retrieve the saved transaction based on the provided `transactionId`
    const savedTransaction = await Transaction.findOne({ _id: transaction });

    if (!savedTransaction) {
      console.log('Transaction not found.');
      return res.status(400).json({ error: 'Transaction not found.' });
    }

    // Access the `referenceNumber` from the retrieved transaction
    const savedReferenceNumber = savedTransaction.paymentReference;

    // Check if the saved reference number matches the provided reference number
    if (savedReferenceNumber) {
      console.log('Invalid transaction or payment reference mismatch');
      return res.status(400).json({ error: 'Invalid transaction or payment reference mismatch.' });
    }

    // if (!referenceNumber) {
    //   console.log('Missing referenceNumber in the query.');
    //   return res.status(400).json({ error: 'Missing referenceNumber in the query.' });
    // }

    const referenceNumber = req.query.referenceNumber;
    console.log('referenceNumber:', referenceNumber);

    const response = await pesepay.checkPayment(referenceNumber);

    // Check if the response exists and has the expected properties
    if (response.success && response.paid) {
      await bot.sendMessage(chat_id, success_message, { parse_mode: 'HTML' });

      // Save the reference number from the response
      const paymentReference = response.referenceNumber;

      //const currencyCode = response.currencyCode;
      const amountValue = response.amount;
      const currencyCode = response.currencyCode;

      let savedTransaction = await Transaction.findOneAndUpdate(
        { paymentReference: referenceNumber },
        {
          paymentStatus: 'completed',
          amount: amountValue,
          paymentCurrency: currencyCode,
          transactionStatus: 'processing',
          fname: fname,
        },
        { new: true }
      );

      if (savedTransaction) {
        if (service) {
          if (service === 'airtime') {
            const customerSMS = `Your account has been credited with USD${amountValue} of airtime from KwikPay HotRecharge`;
            const response = await utils.processAirtime(amountValue, savedTransaction.targetedPhone, customerSMS);

            if (response !== null) {
              const message = `Dear ${fname}, <b>${savedTransaction.targetedPhone}</b> has been successfully credited with <b>USD</b>${amountValue} of airtime.`;
              await Transaction.findOneAndUpdate(
                { _id: savedTransaction._id },
                {
                  transactionStatus: 'completed',
                  endTime: new Date(),
                  transactionReference: response.AgentReference,
                }
              );
              await bot.sendMessage(chat_id, message, { parse_mode: 'HTML' });
            } else {
              const message = `Dear ${fname}, we received your payment of ${amountValue} and we will notify you as soon as we credit ${savedTransaction.targetedPhone}.`;
              await Transaction.findOneAndUpdate(
                { _id: savedTransaction._id },
                { transactionStatus: 'pending' }
              );
              await bot.sendMessage(chat_id, message, { parse_mode: 'HTML' });
            }
          } else if (service === 'zesa') {
            // HOT RECHARGE ZESA
            const convertedAmount = rate ? rate.rate * amountValue : amountValue;
            const response = await utils.processZesaPayment(
              savedTransaction.meterNumber,
              convertedAmount,
              savedTransaction.targetedPhone
            );

            if (response !== null) {
              const reference = response.reference;
              const message = `Dear <em>${fname}</em> Your ZESA Transaction has been successful. The following are the details:
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

              await Transaction.findOneAndUpdate(
                { _id: savedTransaction._id },
                {
                  transactionStatus: 'completed',
                  transactionReference: reference,
                  convertedAmount: convertedAmount,
                  rateOnConversion: rate ? rate.rate : 1,
                  endTime: new Date(),
                }
              );

              await bot.sendMessage(chat_id, message, { parse_mode: 'HTML' });
            } else {
              const message = `Dear ${fname}, we received your payment of ${convertedAmount} and we will notify you as soon as we credit your ZESA Account.`;
              await Transaction.findOneAndUpdate(
                { _id: savedTransaction._id },
                { transactionStatus: 'pending' }
              );
              await bot.sendMessage(chat_id, message, { parse_mode: 'HTML' });
            }
          }
        }
      }
    } else {
      // Handle the case where the response is invalid or payment is not completed
      const failure_message = `Dear <b><em>${fname}</em></b> Your Payment Failed to Complete successfully`;
      await bot.sendMessage(chat_id, failure_message, { parse_mode: 'HTML' });
      await Transaction.findOneAndUpdate(
        { paymentReference: referenceNumber },
        {
          paymentStatus: 'failed',
          amount: amount,
          //paymentCurrency: currencyCode.toLowerCase(),
          transactionStatus: 'failed',
        }
      );
    }
  } catch (error) {
    // Handle any errors that occurred during the process
    console.error('Error retrieving session:', error);
    res.status(500).json({ error: 'An error occurred while processing the payment.' });
    return; // Add this to stop the execution when an error occurs
  }

  res.redirect(`https://t.me/${config.BOT_USER}?chat_id=${chat_id}`);
};

exports.failure = async (req, res) => {
  const failure_message = `Dear <b><em>${req.query.fname}</em></b>, Your Payment Has Been Cancelled`;

  try {
    const referenceNumber = req.query.referenceNumber;
    const response = await pesepay.checkPayment(referenceNumber);

    if (response.success) {
      const currency = response.currencyCode;
      const amount = response.amount;
      const chatId = req.query.chat_id;
      const rate = await rateService.findByCurrencyFrom(currency.toUpperCase());
      const convertedAmount = rate ? rate.rate * amount : amount;

      await bot.sendMessage(chatId, failure_message, { parse_mode: 'HTML' });
      await transactionService.update(response.transaction, {
        paymentStatus: 'cancelled',
        amount: amount,
        paymentCurrency: currency.toLowerCase(),
        rateOnConversion: rate ? rate.rate : 1,
        convertedAmount: convertedAmount,
        paymentReference: referenceNumber,
        transactionStatus: 'cancelled',
      });

      res.redirect(`https://t.me/${config.BOT_USER}?chat_id=${chatId}`);
    } else {
      res.status(400).json({ error: 'Invalid session ID.' });
    }
  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(500).json({ error: 'An error occurred while processing the payment.' });
  }
};

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
