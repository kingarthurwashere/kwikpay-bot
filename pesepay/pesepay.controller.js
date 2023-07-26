const config = require('../config');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(config.token, { polling: false });
const utils = require('../services/utils');
const transactionService = require('../services/transaction.service');
const rateService = require('../services/currency_rate.service');
const { Pesepay } = require('pesepay');
const integrationKey = 'b32bae83-ea8a-4e4a-9b33-80851b1a5514';
const encryptionKey = '6b2a34e90711448a88253ca906727335';

const pesepay = new Pesepay(integrationKey, encryptionKey);

exports.success = async (req, res) => {
  // Extract the required data from the request query
  const { fname, chat_id, service, transaction } = req.query;
  const { amount } = req.query; // Make sure the 'amount' value is present in the query

  const success_message = `Dear <b><em>${fname}</em></b> Your Payment Has Been Received.
    Please wait while we transfer your ${service} to your account.`;

  // Initialize the referenceNumber variable to store the reference number
  let referenceNumber;

  try {
    const response = await pesepay.checkPayment( req.query );

    // Check if the response exists and has the expected properties
    if (response && response.success && response.payment_status === 'paid') {
      await bot.sendMessage(chat_id, success_message, { parse_mode: 'HTML' });
      // Save the reference number from the response
      referenceNumber = response.referenceNumber;

      const currency = response.currency;
      const amountValue = response.amount;


      let savedTransaction = await transactionService.update(transaction, {
        paymentStatus: 'completed',
        amount: amountValue,
        paymentCurrency: String(currency).toLowerCase(),
        transactionStatus: 'processing',
        paymentReference: referenceNumber, // Use the referenceNumber here if needed
        fname: fname,
      });

      if (savedTransaction) {
        if (service) {
          if (service === 'airtime') {
            const customerSMS = `Your account has been credited with USD${amountValue} of airtime from KwikPay HotRecharge`;
            const response = await utils.processAirtime(amountValue, savedTransaction.targetedPhone, customerSMS);

            if (response !== null) {
              const message = `Dear ${fname}, <b>${savedTransaction.targetedPhone}</b> has been successfully credited with <b>USD</b>${amountValue} of airtime.`;
              await transactionService.update(savedTransaction._id, {
                transactionStatus: 'completed',
                endTime: new Date(),
                transactionReference: response.AgentReference
              });
              await bot.sendMessage(chat_id, message, { parse_mode: 'HTML' });
            } else {
              const message = `Dear ${fname}, we received your payment of ${amountValue} and we will notify you as soon as we credit ${savedTransaction.targetedPhone}.`;
              await transactionService.update(savedTransaction._id, { transactionStatus: 'pending' });
              await bot.sendMessage(chat_id, message, { parse_mode: 'HTML' });
            }
          } else if (service === 'zesa') {
            // HOT RECHARGE ZESA
            const convertedAmount = rate ? rate.rate * amountValue : amountValue;
            const response = await utils.processZesaPayment(savedTransaction.meterNumber, convertedAmount, savedTransaction.targetedPhone);

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
              
              await transactionService.update(savedTransaction._id, {
                transactionStatus: 'completed',
                transactionReference: reference,
                convertedAmount: convertedAmount,
                rateOnConversion: rate ? rate.rate : 1,
                endTime: new Date()
              });

              await bot.sendMessage(chat_id, message, { parse_mode: 'HTML' });
            } else {
              const message = `Dear ${fname}, we received your payment of ${convertedAmount} and we will notify you as soon as we credit your ZESA Account.`;
              await transactionService.update(savedTransaction._id, { transactionStatus: 'pending' });
              await bot.sendMessage(chat_id, message, { parse_mode: 'HTML' });
            }
          }
        }
      }
    } else {
      // Handle the case where the response is invalid or payment is not completed
      const failure_message = `Dear <b><em>${fname}</em></b> Your Payment Failed to Complete successfully`;
      await bot.sendMessage(chat_id, failure_message, { parse_mode: 'HTML' });
      await transactionService.update(transaction, {
        paymentStatus: 'failed',
        amount: amountValue,
        paymentCurrency: String(currency).toLowerCase(),
        paymentReference: referenceNumber, // Use the referenceNumber here if needed
        transactionStatus: 'failed',
      });
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
    const session = await pesepay.checkPayment(req.query);

    if (session && session.customer) {
      const currency = session.currency;
      const amount = session.amount_total;
      const reference = req.query;
      const transaction = req.query.transaction;
      const chatId = req.query.chat_id;
      const rate = await rateService.findByCurrencyFrom(currency.toUpperCase());
      const convertedAmount = rate * amount;

      await bot.sendMessage(chatId, failure_message, { parse_mode: 'HTML' });
      await transactionService.update(transaction, {
        paymentStatus: 'cancelled',
        amount: amount,
        paymentCurrency: currency.toLowerCase(),
        rateOnConversion: rate,
        convertedAmount: convertedAmount,
        paymentReference: reference,
        transactionStatus: 'cancelled'
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
            transactionReference: response.AgentReference
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
