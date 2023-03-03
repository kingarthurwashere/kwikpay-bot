const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');
const bot = new TelegramBot(config.token, { polling: true });
const userService = require('../services/user.service');
const transactionService = require('../services/transaction.service');
const stripeService = require('../services/stripe.service')
const utilService = require('../services/utils')
//Bot commands

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const fname = msg.from.first_name;
  const lname = msg.from.last_name;

  if (msg && (msg.text.toLowerCase().includes('\/start') || msg.text.toLowerCase().includes('hello'))) {
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
    const entryOptions = {
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

    bot.sendMessage(chatId, `Hello, ${fname}. How may we help you today?`, entryOptions)

  }

})
// HANDLE BUTTON RESPONSES CALL BACKS
bot.on("callback_query", (msg) => {
  const data = msg.data
  const chatId = msg.from.id
  const fname = msg.from.first_name
  if (data == "airtime") {
    bot.sendMessage(chatId, `Please enter the phone you want to recharge (example: 0778******):`,
      { reply_markup: { force_reply: true } })
      .then((msg) => {
       bot.onReplyToMessage(msg.chat.id, msg.message_id, async (message) => {
          //VALIDATE PHONE HERE

          // START TRANSACTION
          let transaction = {
            chatId: chatId,
            transactionType: 'airtime',
            paymentPlatform: 'stripe',
            targetedPhone: message.text,
            paymentStatus: 'pending',
            transactionStatus: 'pending',
            startTime: new Date(),
          }
          //SAVE TRANSACTION
          let savedTransaction = await transactionService.create(transaction);
          bot.sendMessage(chatId, `Dear <em>${fname}</em> A payment link is being generated below, please click the link and proceed to make your payment!`, {
            parse_mode: 'HTML'})
            .then(async(msg) => {
              const paymentURL = await stripeService.checkout(chatId, fname, savedTransaction._id);
              if (paymentURL && paymentURL != 'null') {
                await bot.sendMessage(chatId, paymentURL);
              } else {
                await bot.sendMessage(chatId, "An error occurred wilest generating the payment url.Please try again later"
                  , { parse_mode: 'HTML' });
              }
            })
        })
      })

  } else if (data == "zesa") {
    bot.sendMessage(chatId, `Please enter the zesa meter number you want to recharge:`,
      { reply_markup: { force_reply: true } })
      .then((msg) => {
        bot.onReplyToMessage(msg.chat.id, msg.message_id, async (message) => {
          const customer = await utilService.checkZesaCustomer(message.text)
          if (customer.Customer) {
            const meter = customer.Meter
            const customerName = customer.CustomerInfo.CustomerName
            const address = customer.CustomerInfo.Address

            bot.sendMessage(chatId, `Please Enter the phone number to send the Token: (example: 0782******)`
              , { reply_markup: { force_reply: true } }).then((msg) => {
                bot.onReplyToMessage(msg.chat.id, msg.message_id, async (message) => {
                  const payOptions = {
                    reply_markup: {
                      inline_keyboard: [
                        [
                          {
                            text: 'PAY'
                          }
                        ],
                        [
                          {
                            text: 'CANCEL'
                          }
                        ]
                      ],
                      remove_keyboard: true
                    }
                  };
                  bot.sendMessage(chatId, `The following are your transaction details: \n`
                    + `Meter Number: ${meter} \n`
                    + `Customer Name: ${customerName} \n`
                    + `Adress: ${address}\n`
                    + `By clicking the PAY button you confirm that the details are correct, if not please click CANCEL`,
                    payOptions
                  ).then((msg) => {
                    bot.onReplyToMessage(msg.chat.id, msg.message_id, async (message) => {
                      let transaction = {
                        chatId: chatId,
                        transactionType: 'zesa',
                        paymentPlatform: 'stripe',
                        targetedPhone: message.text,
                        paymentStatus: 'pending',
                        transactionStatus: 'pending',
                        startTime: new Date(),
                      }
                      //SAVE TRANSACTION
                      let savedTransaction = await transactionService.create(transaction);
                      if(message.text=='PAY'){
                     
                      bot.sendMessage(chatId, `Dear <em>${fname}</em> A payment link is being generated below, please click the link and proceed to make your payment!`, {
                        parse_mode: 'HTML'
                        })
                        .then( async(msg) => {
                          const paymentURL = await stripeService.checkout(chatId, fname, savedTransaction._id);
                          if (paymentURL && paymentURL != 'null') {
                            await bot.sendMessage(chatId, paymentURL);
                          } else {
                            await bot.sendMessage(chatId, "An error occurred wilest generating the payment url.Please try again later"
                              , { parse_mode: 'HTML' });
                          }
                        })
                      }else{
                        await transactionService.update(savedTransaction._id,{paymentStatus:'cancelled',transactionStatus:'cancelled',endTime: new Date()})
                        bot.sendMessage(chatId, "Transaction cancelled");
                      }
                    })


                  })
                })
              })
          } else {
            //HANDLE HOW TO PROGRESS AFTER INVALID METER
            bot.sendMessage(chatId, `Invalid meter Number ${message.text}`)
          }
        })

      })
  }
})

/** Exports */
module.exports = bot;