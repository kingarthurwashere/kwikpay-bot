const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');
const bot = new TelegramBot(config.token, { polling: true });
const userService = require('../services/user.service');
const transactionService = require('../services/transaction.service');
const stripeService = require('../services/stripe.service');
const pesepayService = require('../services/pesepay.service');
const currencyRateService = require('../services/currency_rate.service');
const utilService = require('../services/utils');

// Bot commands
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const fname = msg.from.first_name;
  const lname = msg.from.last_name;

  if (config.BOT_ADMINS && config.BOT_ADMINS.includes(msg.from.username)) {
    entryOptions = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'AIRTIME',
              callback_data: 'airtime'
            }
          ],
          [
            {
              text: 'ZESA',
              callback_data: 'zesa'
            }
          ],
          [
            {
              text: 'ADMIN',
              callback_data: 'admin'
            }
          ]
        ],
        remove_keyboard: true
      }
    };
  }

  if (msg && (msg.text.toLowerCase().includes('/start'))) {
    // SAVE NEW USER IN DBASE
    let user = await userService.findByChatId(chatId);
    if (user) {
      // USER EXISTS, DO NOTHING
    } else {
      user = {
        firstName: fname,
        surName: lname,
        chatId: chatId,
        dateCreated: new Date(),
        role: 'user'
      };
      userService.create(user);
    }

    bot.sendMessage(chatId, `Hello, ${fname}. How may we help you today?`, entryOptions);

  } else {
    let transaction = await transactionService.findTransactionsPendingCompletion(chatId);
    const exchangeRate = await currencyRateService.findByCurrencyFrom('USD');
    if (transaction) {
      if (transaction.transactionType === 'airtime') {
        if (!transaction.targetedPhone) {
          const isValidPhone = await utilService.isValidPhone(msg.text);

          if (!isValidPhone) {
            bot.sendMessage(chatId, `Invalid phone number "${msg.text}". (Zimbabwe phone numbers begin with "07" and have 10 digits). Please enter the correct phone number to proceed:`);
          } else {
            transaction = await transactionService.update(transaction._id, { targetedPhone: msg.text });

            await bot.sendMessage(chatId, `<em>You are about to buy airtime for:</em> \n<b>${msg.text}</b>`
              + `\nBy clicking the <b>PAY</b> button, you confirm that the details are correct. If not, please click <b>CANCEL</b>`,
              payOptions);
          }
        } else {
          await bot.sendMessage(chatId, `<em>You are about to buy airtime for:</em> \n<b>${msg.text}</b>`
            + `\nBy clicking the <b>PAY</b> button, you confirm that the details are correct. If not, please click <b>CANCEL</b>`,
            payOptions);
        }
      } else if (transaction.transactionType === 'zesa') {
        if (!transaction.meterNumber) {
          const customer = await utilService.isValidMeter(msg.text);
          if (customer === null) {
            bot.sendMessage(chatId, `The entered meter number "${msg.text}" is invalid. Please double-check and enter again:`, { reply_markup: { force_reply: true } });
          } else {
            transaction = await transactionService.update(transaction._id, {
              meterNumber: msg.text,
              customerName: customer.customerName,
              customerAddress: customer.address
            });
            bot.sendMessage(chatId, `Please enter the phone number to send the Token: (example: 0782******)`, { reply_markup: { force_reply: true } });
          }
        } else if (!transaction.targetedPhone) {
          const isValidPhone = await utilService.isValidPhone(msg.text);
          if (!isValidPhone) {
            bot.sendMessage(chatId, `The entered phone number "${msg.text}" is invalid. Zimbabwe phone numbers begin with "07" and have 10 digits:`, { reply_markup: { force_reply: true } });
          } else {
            transaction = await transactionService.update(transaction._id, { targetedPhone: msg.text });
            bot.sendMessage(chatId, ` <em>TODAY's EXCHANGE RATE IS :</em> \n<b>1USD = ZWD${exchangeRate.rate} </b>
            \n<b>The following are your transaction details:</b>`
              + `\n<em>Meter Number:</em> ${transaction.meterNumber}`
              + `\n<em>Customer Name:</em> ${transaction.customerName}`
              + `\n<em>Address:</em> ${transaction.customerAddress}`
              + `\nBy clicking the <b>PAY</b> button, you confirm that the details are correct. If not, please click <b>CANCEL</b>`,
              payOptions
            );
          }
        } else {
          bot.sendMessage(chatId, ` <em>TODAY's EXCHANGE RATE IS :</em> \n<b>1USD = ZWD${exchangeRate.rate} </b>
          \n<b>The following are your transaction details:</b>`
            + `\n<em>Meter Number:</em> ${transaction.meterNumber}`
            + `\n<em>Customer Name:</em> ${transaction.customerName}`
            + `\n<em>Address:</em> ${transaction.customerAddress}`
            + `\nBy clicking the <b>PAY</b> button, you confirm that the details are correct. If not, please click <b>CANCEL</b>`,
            payOptions
          );
        }
      }
    } else {
      bot.sendMessage(chatId, `Hello, ${fname}. How may we help you today?`, entryOptions);
    }
  }
});

// Handle button responses and callbacks
bot.on("callback_query", async (msg) => {
  const data = msg.data;
  const chatId = msg.from.id;
  const fname = msg.from.first_name;
  let transData = {
    chatId: chatId,
    paymentPlatform: [], // Initialize paymentPlatform property as an array
    transactionType: 'airtime',
    paymentStatus: 'pending',
    transactionStatus: 'pending',
    startTime: new Date(),
  };
  const exchangeRate = await currencyRateService.findByCurrencyFrom('USD');

  if (data === "airtime") {
    let pendingTransaction = await transactionService.findTransactionsPendingCompletion(chatId);
    if (pendingTransaction) {
      bot.sendMessage(chatId, `<em>You have a pending <b>${pendingTransaction.transactionType}</b> transaction. Do you want to continue processing or cancel it?</em>`, transactionContinue);
    } else {
      await transactionService.create(transData);
      bot.sendMessage(chatId, `<b>Please enter the phone you want to recharge (example: 0778******):</b>`, { reply_markup: { force_reply: true }, parse_mode: 'HTML' });
    }
  } else if (data === "zesa") {
    if (!exchangeRate) {
      bot.sendMessage(chatId, `USD - ZWD Rate is not set. If you are an admin, please set it; otherwise, contact your admin to set the rate.`);
    } else {
      transData.transactionType = 'zesa';
      let pendingTransaction = await transactionService.findTransactionsPendingCompletion(chatId);
      if (pendingTransaction) {
        bot.sendMessage(chatId, `<em>You have a pending <b>${pendingTransaction.transactionType}</b> transaction. Do you want to continue processing or cancel it?</em>`, transactionContinue);
      } else {
        await transactionService.create(transData);
        bot.sendMessage(chatId, `<b>Please enter the zesa meter number you want to recharge:</b>`, { reply_markup: { force_reply: true }, parse_mode: 'HTML' });
      }
    }
  } else if (data === 'addRate') {
    bot.sendMessage(chatId, `Currently, we only support conversion to <b>ZWD</b>. Please select the currency you want to convert from:`, currencies);
  } else if (data === 'updateRate') {
    let updateRateCurrencies = await formatCurrencyUpdateOptions();
    bot.sendMessage(chatId, `Please select the rate you want to update:`, updateRateCurrencies);
  } else if (data === 'gbpRate') {
    await addCurrency('GBP', chatId);
  } else if (data === 'usdRate') {
    await addCurrency('USD', chatId);
  } else if (data === 'zarRate') {
    await addCurrency('ZAR', chatId);
  } else if (data === 'GBPUPDATE') {
    await updateCurrencyRate('GBP', chatId);
  } else if (data === 'USDUPDATE') {
    await updateCurrencyRate('USD', chatId);
  } else if (data === 'ZARUPDATE') {
    await updateCurrencyRate('ZAR', chatId);
  } else if (data === 'admin') {
    // USER IS AN ADMINISTRATOR
    const adminOptions = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'ADD NEW CURRENCY RATE',
              callback_data: 'addRate'
            }
          ],
          [
            {
              text: 'UPDATE EXISTING RATE',
              callback_data: 'updateRate'
            }
          ]
        ],
        remove_keyboard: true
      },
      parse_mode: 'HTML'
    };
    bot.sendMessage(chatId, `<b>@${fname}</b>. What Admin Functions do you want to perform now?`, adminOptions);
  } else if (data === 'continueTransaction') {
    let transaction = await transactionService.findTransactionsPendingCompletion(chatId);
    if (transaction.transactionType === 'airtime') {
      if (!transaction.targetedPhone) {
        bot.sendMessage(chatId, `<b>Please enter the phone you want to recharge (example: 0778******):</b>`, { reply_markup: { force_reply: true }, parse_mode: 'HTML' });
      } else {
        await bot.sendMessage(chatId, `<em>You are about to buy airtime for:</em> `
          + `\n<b>${transaction.targetedPhone}</b>`
          + `\nPlease select a payment method:`, paymentMethods);
      }
    } else {
      // ZESA TRANSACTION
      if (!transaction.meterNumber) {
        bot.sendMessage(chatId, `<b>Please enter the zesa meter number you want to recharge:</b>`, { reply_markup: { force_reply: true }, parse_mode: 'HTML' });
      } else if (!transaction.targetedPhone) {
        bot.sendMessage(chatId, `Please enter the phone number to send the Token: (example: 0782******)`, { reply_markup: { force_reply: true } });
      } else {
        bot.sendMessage(chatId, ` <em>TODAY's EXCHANGE RATE IS:</em> \n<b>1USD = ZWL${exchangeRate.rate}</b>`
          + `\n<b>The following are your transaction details:</b>`
          + `\n<em>Meter Number:</em> ${transaction.meterNumber}`
          + `\n<em>Customer Name:</em> ${transaction.customerName}`
          + `\n<em>Address:</em> ${transaction.customerAddress}\n`
          + `Please select a payment method:`, paymentMethods);
      }
    }
  } else if (data === 'cancelTransaction') {
    let transaction = await transactionService.findTransactionsPendingCompletion(chatId);
    await transactionService.update(transaction._id, { paymentStatus: 'cancelled', transactionStatus: 'cancelled', endTime: new Date() });
  } else if (data === 'pay') { // Updated: Handle Pay button click
    let transaction = await transactionService.findTransactionsPendingCompletion(chatId); // Added this line
    if (transaction.transactionType === 'airtime') {
      if (!transaction.targetedPhone) {
        bot.sendMessage(chatId, `<b>Please enter the phone you want to recharge (example: 0778******):</b>`, { reply_markup: { force_reply: true }, parse_mode: 'HTML' });
      } else {
        await bot.sendMessage(chatId, `<em>You are about to buy airtime for:</em> `
          + `\n<b>${transaction.targetedPhone}</b>`
          + `\nPlease select a payment method:`, paymentMethods);
      }
    } else {
      // ZESA TRANSACTION
      if (!transaction.meterNumber) {
        bot.sendMessage(chatId, `<b>Please enter the zesa meter number you want to recharge:</b>`, { reply_markup: { force_reply: true }, parse_mode: 'HTML' });
      } else if (!transaction.targetedPhone) {
        bot.sendMessage(chatId, `Please enter the phone number to send the Token: (example: 0782******)`, { reply_markup: { force_reply: true } });
      } else {
        bot.sendMessage(chatId, ` <em>TODAY's EXCHANGE RATE IS:</em> \n<b>1USD = ZWL${exchangeRate.rate}</b>`
          + `\n<b>The following are your transaction details:</b>`
          + `\n<em>Meter Number:</em> ${transaction.meterNumber}`
          + `\n<em>Customer Name:</em> ${transaction.customerName}`
          + `\n<em>Address:</em> ${transaction.customerAddress}\n`
          + `Please select a payment method:`, paymentMethods);
      }
    }
  } else if (data === 'cancel') { // Updated: Handle Cancel button click
    let transaction = await transactionService.findTransactionsPendingCompletion(chatId); // Added this line
    await transactionService.update(transaction._id, { paymentStatus: 'cancelled', transactionStatus: 'cancelled', endTime: new Date() });
  } else if (data === 'stripePayment') { // New: Handle Stripe payment option
    let transaction = await transactionService.findTransactionsPendingCompletion(chatId); // Added this line
    transData.paymentPlatform.push('stripe'); // Add 'stripe' to the paymentPlatform array
    await processPayment(chatId, fname, transaction._id, transaction.transactionType === 'airtime' ? 'airtime' : 'zesa token', transData);
  } else if (data === 'pesepayPayment') { // New: Handle Pesepay payment option
    let transaction = await transactionService.findTransactionsPendingCompletion(chatId); // Added this line
    transData.paymentPlatform.push('pesepay'); // Add 'pesepay' to the paymentPlatform array
    await processPayment(chatId, fname, transaction._id, transaction.transactionType === 'airtime' ? 'airtime' : 'zesa token', transData);
  } else {
    let transaction = await transactionService.findTransactionsPendingCompletion(chatId);
    // ...
  }
});

async function processPayment(chatId, fname, transactionId, service, transData) {
  bot.sendMessage(chatId, `Dear <em>${fname}</em>, a payment link is being generated below. Please click the link and proceed to make your payment!`, { parse_mode: 'HTML' })
    .then(async (msg) => {
      let paymentURLs = [];
      for (const platform of transData.paymentPlatform) {
        let paymentURL;
        if (platform === 'stripe') {
          paymentURL = await stripeService.checkout(chatId, fname, transactionId);
        } else if (platform === 'pesepay') {
          paymentURL = await pesepayService.checkout(chatId, fname, transactionId); // Generate Pesepay payment URL
        }
        if (paymentURL && paymentURL !== 'null') {
          paymentURLs.push(paymentURL);
        } else {
          await bot.sendMessage(chatId, `An error occurred while generating the ${platform} payment URL. Please try again later.`, { parse_mode: 'HTML' });
        }
      }
      if (paymentURLs.length > 0) {
        // Update the transaction with the chosen payment platforms
        await transactionService.update(transactionId, { paymentPlatform: transData.paymentPlatform });
        for (const paymentURL of paymentURLs) {
          await bot.sendMessage(chatId, paymentURL);
        }
      }
    });
}

async function addCurrency(currency, chatId) {
  let rate = await currencyRateService.findByCurrencyFrom(currency);
  if (rate) {
    await bot.sendMessage(chatId, `<b>${currency} - ZWD</b> Rate already exists. Please update the rate if necessary.`, { parse_mode: 'HTML' });
  } else {
    await currencyRateService.create({ currencyFrom: currency, rate: 0 });
    await bot.sendMessage(chatId, `<b>${currency} - ZWD</b> Rate added successfully. Please set the rate:`, { parse_mode: 'HTML' });
  }
}

async function updateCurrencyRate(currency, chatId) {
  const rate = await currencyRateService.findByCurrencyFrom(currency);
  if (rate) {
    await transactionService.create({
      transactionType: `updateRate:${currency}`,
      paymentStatus: 'pending',
      transactionStatus: 'pending',
      startTime: new Date(),
      chatId: chatId
    });
    await bot.sendMessage(chatId, `<b>Please enter the updated ${currency} - ZWD rate:</b>`, { parse_mode: 'HTML' });
  } else {
    await bot.sendMessage(chatId, `Rate for ${currency} - ZWD does not exist. Please add the rate first.`, { parse_mode: 'HTML' });
  }
}


const payOptions = {
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: 'PAY',
          callback_data: 'confirmPayment'
        }
      ],
      [
        {
          text: 'CANCEL',
          callback_data: 'cancelPayment'
        }
      ]
    ],
    remove_keyboard: true
  },
  parse_mode: 'HTML'
};

const transactionContinue = {
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: 'CONTINUE',
          callback_data: 'continueTransaction'
        }
      ],
      [
        {
          text: 'CANCEL',
          callback_data: 'cancelTransaction'
        }
      ]
    ],
    remove_keyboard: true
  },
  parse_mode: 'HTML'
};

const currencies = {
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: 'GBP',
          callback_data: 'gbpRate'
        }
      ],
      [
        {
          text: 'USD',
          callback_data: 'usdRate'
        }
      ],
      [
        {
          text: 'ZAR',
          callback_data: 'zarRate'
        }
      ]
    ],
    remove_keyboard: true
  },
  parse_mode: 'HTML'
};

const paymentMethods = { // New: Payment methods selection
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: 'Stripe',
          callback_data: 'stripePayment'
        }
      ],
      [
        {
          text: 'Pesepay',
          callback_data: 'pesepayPayment'
        }
      ]
    ],
    remove_keyboard: true
  },
  parse_mode: 'HTML'
};

let entryOptions = {
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: 'AIRTIME',
          callback_data: 'airtime'
        }
      ],
      [
        {
          text: 'ZESA',
          callback_data: 'zesa'
        }
      ]
    ],
    remove_keyboard: true
  }
};

/** Exports */
module.exports = bot;
