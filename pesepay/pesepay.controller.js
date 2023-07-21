const pesepay = require('pesepay');
const config = require('../config');
const transactionService = require('../services/transaction.service');
const rateService = require('../services/currency_rate.service');
const utils = require('../services/utils');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(config.token, { polling: false });

// Create an instance of the Pesepay class using your integration key and encryption key
//const pesepayInstance = new pesepay.Pesepay( config.INTEGRATION_KEY, config.ENCRYPTION_KEY );
const pesepayInstance = new pesepay.Pesepay( 'b32bae83-ea8a-4e4a-9b33-80851b1a5514', '6b2a34e90711448a88253ca906727335' );

// For Controller testing Pesepay API
exports.pay = async (req, res) => {
  try {
    const result = await pesepayService.checkout('123', 'john doe', 'acs123', 10, 'USD');
    return res.json(result);
  } catch (error) {
    return res.status(500).json(error);
  }
};


exports.success = async (req, res) => {
  const success_message = `Dear <b><em>${req.query.fname}</em></b>, Your Payment Has Been Received. Please wait while we transfer your ${req.query.service} to your account.`;

  try {
    // Retrieve the session using session ID
    const session = await pesepayInstance.getSession(req.query.session_id);
    
    // Access session properties
    const currency = session.currency;
    const reference = req.query.session_id;
    const transaction = req.query.transaction;
    const chatId = req.query.chat_id;
    const rate = await rateService.findByCurrencyFrom(currency.toUpperCase());

    if (session && session.payment_status === 'paid') {
      await bot.sendMessage(chatId, success_message, { parse_mode: 'HTML' });

      let savedTransaction = await transactionService.update(transaction, {
        paymentStatus: 'completed',
        amount: session.amount_total,
        paymentCurrency: currency.toLowerCase(),
        transactionStatus: 'processing',
        paymentReference: reference,
        fname: req.query.fname
      });

      if (savedTransaction) {
        if (req.query.service) {
          if (req.query.service === 'airtime') {
            const customerSMS = `Your account has been credited with USD${session.amount_total} of airtime from KwikPay HotRecharge`;
            const response = await utils.processAirtime(session.amount_total, savedTransaction.targetedPhone, customerSMS);

            if (response !== null) {
              const message = `Dear ${req.query.fname}, <b>${savedTransaction.targetedPhone}</b> has been successfully credited with <b>USD</b>${session.amount_total} of airtime.`;
              await transactionService.update(savedTransaction._id, {
                transactionStatus: 'completed',
                endTime: new Date(),
                transactionReference: response.AgentReference
              });
              await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
            } else {
              const message = `Dear ${req.query.fname}, we received your payment of ${session.amount_total} and we will notify you as soon as we credit ${savedTransaction.targetedPhone}.`;
              await transactionService.update(savedTransaction._id, { transactionStatus: 'pending' });
              await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
            }
          } else if (req.query.service === 'zesa') {
            // HOT RECHARGE ZESA
            const convertedAmount = rate ? rate.rate * session.amount_total : session.amount_total;
            const response = await utils.processZesaPayment(savedTransaction.meterNumber, convertedAmount, savedTransaction.targetedPhone);

            if (response !== null) {
              const reference = response.reference;
              const message = `Dear <em>${req.query.fname}</> Your ZESA Transaction has been successful. The following are the details:
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

              await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
            } else {
              const message = `Dear ${req.query.fname}, we received your payment of ${convertedAmount} and we will notify you as soon as we credit your ZESA Account.`;
              await transactionService.update(savedTransaction._id, { transactionStatus: 'pending' });
              await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
            }
          }
        }
      }
    } else {
      const failure_message = `Dear <b><em>${req.query.fname}</em></b>, Your Payment Failed to Complete successfully`;
      await bot.sendMessage(chatId, failure_message, { parse_mode: 'HTML' });
      await transactionService.update(transaction, {
        paymentStatus: 'failed',
        amount: session.amount_total,
        paymentCurrency: currency.toLowerCase(),
        rateOnConversion: rate,
        convertedAmount: convertedAmount,
        paymentReference: reference,
        transactionStatus: 'failed'
      });
    }

    res.redirect(`https://t.me/${config.BOT_USER}?chat_id=${chatId}`);
  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(500).json({ error: 'An error occurred while processing the payment.' });
  }
};

exports.failure = async (req, res) => {
  const failure_message = `Dear <b><em>${req.query.fname}</em></b>, Your Payment Has Been Cancelled`;
  
  try {
    const session = await pesepayInstance.getSession(req.query.session_id);

    if (session && session.customer) {
      const currency = session.currency;
      const amount = session.amount_total;
      const reference = req.query.session_id;
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
