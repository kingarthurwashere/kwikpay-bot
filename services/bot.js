const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');
const bot = new TelegramBot(config.token, { polling: true });
const userService = require('../services/user.service');
const transactionService = require('../services/transaction.service');
const stripeService = require('../services/stripe.service')
const currencyRateService = require('../services/currency_rate.service')
const utilService = require('../services/utils')
//Bot commands

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
          ]
          ,
          [
            {
              text: 'ADMIN',
              callback_data: 'admin'
            }
          ]
        ],
        remove_keyboard: true
      }
    }
  }

  if (msg && (msg.text.toLowerCase().includes('\/start'))) {
    //SAVE NEW USER IN DBASE 
    let user = await userService.findByChatId(chatId);
    if (user) {
      //USER EXIST DO NOTHING
    } else {
      user = {
        firstName: fname,
        surName: lname,
        chatId: chatId,
        dateCreated: new Date(),
        role: 'user'
      }
      userService.create(user)
    }
    
    bot.sendMessage(chatId, `Hello, ${fname}. How may we help you today?`, entryOptions)

  } else {

    let transaction = await transactionService.findTransactionsPendingCompletion(chatId);
    const exchangeRate = await currencyRateService.findByCurrencyFrom('GBP');
    if (transaction) {
      if (transaction.transactionType == 'airtime') {
        if (!transaction.targetedPhone) {
          const isValidPhone = await utilService.isValidPhone(msg.text);

          if (!isValidPhone) {
            bot.sendMessage(chatId, `Invalid phone number "${msg.text}".(Zimbabwe phone numbers beging with "07" and have 10 digits)Please enter correct phone number to proceed:`)
          } else {
            transaction = await transactionService.update(transaction._id, { targetedPhone: msg.text })

            await bot.sendMessage(chatId, ` <em>TODAY's EXCHANGE RATE IS :</em>\n <b>1GBP = ZWD${exchangeRate.rate} </b>`
              + `\n<em>You are about to buy airtime for </em>: \n <b>${msg.text}</b>`
              + `\nBy clicking the <b>PAY</b> button you confirm that the details are correct, if not please click <b>CANCEL</b>`
              , payOptions)

          }
        } else {
       
          await bot.sendMessage(chatId, ` <em>TODAY's EXCHANGE RATE IS :</em>\n <b>1GBP = ZWD${exchangeRate.rate} </b>`
          + `\n<em>You are about to buy airtime for </em>: \n <b>${msg.text}</b>`
          + `\nBy clicking the <b>PAY</b> button you confirm that the details are correct, if not please click <b>CANCEL</b>`
          , payOptions)
        }
      }
      else if (transaction.transactionType == 'zesa') {

        if (!transaction.meterNumber) {
          const customer = await utilService.isValidMeter(msg.text);
          if (customer == null) {
            bot.sendMessage(chatId, `The entered meter number ${msg.text} is invalid, Please double check and enter again:`, { reply_markup: { force_reply: true } })
          } else {
            transaction = await transactionService.update(transaction._id, {
              meterNumber: msg.text,
              customerName: customer.customerName, customerAddress: customer.address
            })
            bot.sendMessage(chatId, `Please Enter the phone number to send the Token: (example: 0782******)`, { reply_markup: { force_reply: true } })
          }
        } else if (!transaction.targetedPhone) {
          const isValidPhone = await utilService.isValidPhone(msg.text);
          if (!isValidPhone) {
            bot.sendMessage(chatId, `The entered phone number "${msg.text}" is invalid. Zimbabwe phone numbers beging with "07" and have 10 digits:`, { reply_markup: { force_reply: true } })
          } else {
            transaction = await transactionService.update(transaction._id, { targetedPhone: msg.text })
            bot.sendMessage(chatId, ` <em>TODAY's EXCHANGE RATE IS :</em> \n<b>1GPB = ZWD${exchangeRate.rate} </b>
            \n<b>The following are your transaction details: </b>`
              + `\n<em>Meter Number:</em> ${transaction.meterNumber} `
              + `\n<em>Customer Name:</em> ${transaction.customerName} `
              + `\n<em>Adress:</em> ${transaction.customerAddress}`
              + `\nBy clicking the <b>PAY</b> button you confirm that the details are correct, if not please click <b>CANCEL</b>`,
              payOptions
            )
          }
        }else{
          bot.sendMessage(chatId, ` <em>TODAY's EXCHANGE RATE IS :</em> \n<b>1GPB = ZWD${exchangeRate.rate} </b>
          \n<b>The following are your transaction details: </b>`
            + `\n<em>Meter Number:</em> ${transaction.meterNumber} `
            + `\n<em>Customer Name:</em> ${transaction.customerName} `
            + `\n<em>Adress:</em> ${transaction.customerAddress}`
            + `\nBy clicking the <b>PAY</b> button you confirm that the details are correct, if not please click <b>CANCEL</b>`,
            payOptions
          )
        }

      }
    } else {
      bot.sendMessage(chatId, `Hello, ${fname}. How may we help you today?`, entryOptions)
    }
  }
})
// HANDLE BUTTON RESPONSES CALL BACKS
bot.on("callback_query", async (msg) => {
  const data = msg.data
  const chatId = msg.from.id
  const fname = msg.from.first_name;
  let transData = {
    chatId: chatId,
    paymentPlatform: 'stripe',
    transactionType: 'airtime',
    paymentStatus: 'pending',
    transactionStatus: 'pending',
    startTime: new Date(),
  }
  const exchangeRate = await currencyRateService.findByCurrencyFrom('GBP');
  if (data == "airtime") {

    if (!exchangeRate) {
      bot.sendMessage(chatId, `GBP -ZWD Rate is not set, if you are an admin please set it, else contact your admin to set the rate.`)
    } else {
      let pendingTransaction = await transactionService.findTransactionsPendingCompletion(chatId);
      if (pendingTransaction) {
        bot.sendMessage(chatId, `<em>You have a pending <b>${pendingTransaction.transactionType}</b> transaction, do you want to continue processing or cancel it?</em>`,
          transactionContinue)
      } else {
        await transactionService.create(transData);
        bot.sendMessage(chatId, `<b>Please enter the phone you want to recharge (example: 0778******):</b>`, { reply_markup: { force_reply: true }, parse_mode: 'HTML' })
      }
    }
  } else if (data == "zesa") {

    if (!exchangeRate) {
      bot.sendMessage(chatId, `GBP -ZWD Rate is not set, if you are an admin please set it, else contact your admin to set the rate.`)
    } else {
      transData.transactionType = 'zesa';
      let pendingTransaction = await transactionService.findTransactionsPendingCompletion(chatId);
      if (pendingTransaction) {
        bot.sendMessage(chatId, `<em>You have a pending <b>${pendingTransaction.transactionType}</b> transaction, do you want to continue processing or cancel it?</em>`,
          transactionContinue)
      } else {
        await transactionService.create(transData);
        bot.sendMessage(chatId, `<b>Please enter the zesa meter number you want to recharge:</b>`, { reply_markup: { force_reply: true }, parse_mode: 'HTML' })
      }
    }
  } else if (data == 'addRate') {
    bot.sendMessage(chatId, `Currently we only support conversion to <b>ZWD</b>, Please select the currency you want to convert from:`, currencies)
  } else if (data == 'updateRate') {
    let updateRateCurrencies = await formatCurrencyUpdateOptions();
    bot.sendMessage(chatId, `Please select the rate you want to update:`, updateRateCurrencies)
  } else if (data == 'gbpRate') {

    await addCurrency('GBP', chatId)

  } else if (data == 'usdRate') {
    await addCurrency('USD', chatId)
  } else if (data == 'zarRate') {
    await addCurrency('ZAR', chatId)
  } else if (data == 'GBPUPDATE') {
    await updateCurrencyRate('GBP', chatId)
  } else if (data == 'USDUPDATE') {
    await updateCurrencyRate('USD', chatId)
  } else if (data == 'ZARUPDATE') {
    await updateCurrencyRate('ZAR', chatId)
  } else if (data == 'admin') {
    //USER IS AN ADMINISTRATOR
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
              text: 'UPDATE EXISITING RATE',
              callback_data: 'updateRate'
            }
          ]
        ],
        remove_keyboard: true
      },
      parse_mode: 'HTML'
    };
    bot.sendMessage(chatId, `<b>@${fname}</b>. What Admin Functions do you want to perform now?`, adminOptions)
  }
  else if (data == 'continueTransaction') {
    let transaction = await transactionService.findTransactionsPendingCompletion(chatId);
    if (transaction.transactionType == 'airtime') {
      if (!transaction.targetedPhone) {
        bot.sendMessage(chatId, `<b>Please enter the phone you want to recharge (example: 0778******):</b>`, { reply_markup: { force_reply: true }, parse_mode: 'HTML' })
      } else {
        await bot.sendMessage(chatId, `<em>You are about to buy airtime for </em>: `
        +`\n <b>${transaction.targetedPhone}</b>`
          + `\nBy clicking the <b>PAY</b> button you confirm that the details are correct, if not please click <b>CANCEL</b>`
          , payOptions)
      }
    } else {
      //ZESA TRANSACTION
      if (!transaction.meterNumber) {
        bot.sendMessage(chatId, `<b>Please enter the zesa meter number you want to recharge:</b>`, { reply_markup: { force_reply: true }, parse_mode: 'HTML' })
      } else if (!transaction.targetedPhone) {
        bot.sendMessage(chatId, `Please Enter the phone number to send the Token: (example: 0782******)`, { reply_markup: { force_reply: true } })
      } else {
        bot.sendMessage(chatId, ` <em>TODAY's EXCHANGE RATE IS :</em> \n<b>1USD = ZWL${exchangeRate.rate} </b>
            \n<b>The following are your transaction details: </b>`
          + `\n<em>Meter Number:</em> ${transaction.meterNumber}`
          + `\n<em>Customer Name:</em> ${transaction.customerName}`
          + `\n<em>Adress:</em> ${transaction.customerAddress}\n`
          + `\nBy clicking the <b>PAY</b> button you confirm that the details are correct, if not please click <b>CANCEL</b>`,
          payOptions
        )
      }

    }
  }
  else if (data == 'cancelTransaction') {
    let transaction = await transactionService.findTransactionsPendingCompletion(chatId);
    await transactionService.update(transaction._id, { paymentStatus: 'cancelled', transactionStatus: 'cancelled', endTime: new Date() })
  }
  else {
    let transaction = await transactionService.findTransactionsPendingCompletion(chatId);

    if (data == 'confirmPayment') {
      await processPayment(chatId, fname, transaction._id, transaction.transactionType == 'airtime' ? 'airtime' : 'zesa token')
    }
    else if (data == 'cancelPayment') {
      if (transaction.transactionType == 'airtime') {
        await transactionService.update(transaction._id, { paymentStatus: 'cancelled', transactionStatus: 'cancelled', endTime: new Date() })
        bot.sendMessage(chatId, "Transaction cancelled");
      } else {
        await transactionService.update(transaction, { paymentStatus: 'cancelled', transactionStatus: 'cancelled', endTime: new Date() })
        bot.sendMessage(chatId, "Transaction cancelled");
      }
    }
  }
})

async function processPayment(chatId, fname, transactionId) {

  bot.sendMessage(chatId, `Dear <em>${fname}</em> A payment link is being generated below, please click the link and proceed to make your payment!`, {
    parse_mode: 'HTML'
  })
    .then(async (msg) => {
      const paymentURL = await stripeService.checkout(chatId, fname, transactionId);
      if (paymentURL && paymentURL != 'null') {
        await bot.sendMessage(chatId, paymentURL);
      } else {
        await bot.sendMessage(chatId, "An error occurred wilest generating the payment url.Please try again later"
          , { parse_mode: 'HTML' });
      }
    })
}
async function addCurrency(currency, chatId) {
  let rate = await currencyRateService.findByCurrencyFrom(currency);
  if (rate) {
    await bot.sendMessage(chatId, `<b>${currency} -ZWD </b> Rate Already Exist Please Consider Updating instead.`, { parse_mode: 'HTML' })
  } else {
    bot.sendMessage(chatId, `Please enter the <b>${currency} to ZWD amount</b>: (i.e how many ZWD make up <b>1${currency}</b> Today?):`,
      { reply_markup: { force_reply: true }, parse_mode: 'HTML' }).then((msg) => {
        bot.onReplyToMessage(msg.chat.id, msg.message_id, async (message) => {
          if (isNaN(message.text)) {
            await bot.sendMessage(chatId, `INVALID AMOUNT ENTERED, PLEASE RESTART THE PROCESS OF ADDING A NEW RATE:`, currencies)
          } else {
            await currencyRateService.create({ currencyfrom: currency, currencyto: 'ZWD', rate: message.text })
              .then(async resp => {
                await bot.sendMessage(chatId, `<b>${currency} - ZWD </b> Rate Successfully added and the rate is <b>1${currency} =ZWD${message.text}</b>:`, { parse_mode: 'HTML' })
              })
          }
        })
      })
  }
}
async function formatCurrencyUpdateOptions() {
  let currencies = await currencyRateService.findAll();
  if (currencies && currencies.length > 0) {
    let options = {
      reply_markup: {
        inline_keyboard: [
        ]
      }
    }
    for (cur of currencies) {
      options.reply_markup.inline_keyboard.push([
        {
          text: cur.currencyfrom + '- ZWD',
          callback_data: String(cur.currencyfrom) + 'UPDATE'
        }
      ])
    }
    return options;

  } else {
    return null
  }
}
async function updateCurrencyRate(currency, chatId) {
  let rate = await currencyRateService.findByCurrencyFrom(currency);
  if (rate) {
    bot.sendMessage(chatId, `The current rate is <b>1${currency} -ZWD${rate.rate}</b>.Please Enter the new rate or Enter <em>Not Now</em> to stop update:`,
      { reply_markup: { force_reply: true }, parse_mode: 'HTML' }).then((msg) => {
        bot.onReplyToMessage(msg.chat.id, msg.message_id, async (message) => {
          if (isNaN(message.text)) {
            let updateRateCurrencies = await formatCurrencyUpdateOptions();
            await bot.sendMessage(chatId, `INVALID AMOUNT ENTERED, PLEASE RESTART THE PROCESS OF UPDATING  RATE:`, updateRateCurrencies)
          } else {
            currencyRateService.update(rate._id, { rate: message.text }).then(async resp => {
              await bot.sendMessage(chatId, `<b>${currency} - ZWD </b> Rate Successfully updated to <b>1${currency} =ZWD${message.text}</b>:`, { parse_mode: 'HTML' })
            })
          }
        })
      })
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