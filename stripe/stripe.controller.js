const config = require( '../config' );
const stripe = require( 'stripe' )( config.STRIPE_KEY );
const TelegramBot = require( 'node-telegram-bot-api' );
const bot = new TelegramBot( config.token, { polling: false } );
const utils = require( '../services/utils' );
const transactionService = require( '../services/transaction.service' );
const rateService = require( '../services/currency_rate.service' );

exports.success = async ( req, res ) =>
{
    try
    {
        const success_message = `Dear <b><em>${ req.query.fname }</em></b> Your Payment Has Been Received. Please wait while we transfer your ${ req.query.service } to your account.`

        const session = await stripe.checkout.sessions.retrieve( req.query.session_id );
        console.log( 'Retrieved session:', session );
        const currency = session.currency;
        // STRIPE BRINGS AMOUNT IN CENTS, SO CONVERT TO POUNDS BY DIVIDING WITH 100
        const amount = session.amount_total ? session.amount_total * 0.01 : 0;
        console.log( 'Currency:', currency );
        console.log( 'Amount:', amount );

        const reference = req.query.session_id;
        const transaction = req.query.transaction;
        const chatId = req.query.chat_id;
        console.log( 'Reference:', reference );
        console.log( 'Transaction:', transaction );
        console.log( 'Chat ID:', chatId );


        const rate = await rateService.findByCurrencyFrom( String( currency ).toUpperCase() );

        if ( session && session.payment_status == 'paid' )
        {
            console.log( 'Payment successful' );
            await bot.sendMessage( chatId, success_message, { parse_mode: "HTML" } );
            let savedTransaction = await transactionService.update( transaction, {
                paymentStatus: 'completed',
                amount: amount,
                paymentCurrency: String( currency ).toLowerCase(),
                transactionStatus: 'processing',
                paymentReference: reference,
                fname: req.query.fname
            } );

            if ( savedTransaction )
            {
                if ( req.query.service )
                {
                    if ( req.query.service == 'airtime' )
                    {
                        let customerSMS = `Your account has been credited with USD${ amount } of airtime from KwikPay HotRecharge`;

                        const response = await utils.processAirtime( amount, savedTransaction.targetedPhone, customerSMS );

                        if ( response && !response.error )
                        {
                            let message = `Dear ${ req.query.fname }, <b>${ savedTransaction.targetedPhone }</b> has been successfully credited with <b>USD</b>${ amount } of airtime.`;
                            await transactionService.update( savedTransaction._id, {
                                transactionStatus: 'completed',
                                endTime: new Date(),
                                transactionReference: response.AgentReference
                            } );
                            await bot.sendMessage( chatId, message, { parse_mode: "HTML" } );
                        } else
                        {
                            let message = `Dear ${ req.query.fname }, we received your payment of ${ amount } but we are facing challenges with the recharge platform. We will automatically recharge your account and notify you as soon as we credit ${ savedTransaction.targetedPhone }.`;
                            await transactionService.update( savedTransaction._id, { transactionStatus: 'pending' } );
                            await bot.sendMessage( chatId, message, { parse_mode: "HTML" } );
                        }
                    } else
                    {
                        // HOT RECHARGE ZESA
                        // AMOUNT IN RTGS
                        const convertedAmount = rate ? rate.rate * amount : amount;
                        const response = await utils.processZesaPayment( savedTransaction.meterNumber, convertedAmount, savedTransaction.targetedPhone );

                        if ( response != null && !response.error )
                        {
                            let reference = response.reference;
                            let message = `Dear <em>${ req.query.fname }</em> Your ZESA Transaction has been successful. The following are the details:
                \n Meter Number: ${ response.meter }
                \n Amount : <b>ZWL</b>${ response.amount },
                \n Name: ${ response.name },
                \n Address: ${ response.address },
                \n Token: ${ response.token },
                \n Units: ${ response.units },
                \n Net Amount: <b>ZWL</b>${ response.netamount },
                \n Levy: ${ response.levy },
                \n Arrears: ${ response.arrears },
                \n Tax: ${ response.reference },
                \n Reference: ${ reference }`;
                            await transactionService.update( savedTransaction._id, {
                                transactionStatus: 'completed',
                                transactionReference: reference,
                                convertedAmount: convertedAmount,
                                rateOnConversion: rate ? rate.rate : 1,
                                endTime: new Date()
                            } );
                            await bot.sendMessage( chatId, message, { parse_mode: "HTML" } );
                        } else
                        {
                            let message = `Dear ${ req.query.fname }, we received your payment of ${ convertedAmount } but the ZESA Processing facility is not available at the moment. We will keep trying to automatically credit your account.`;
                            await transactionService.update( savedTransaction._id, { transactionStatus: 'pending' } );
                            await bot.sendMessage( chatId, message, { parse_mode: "HTML" } );
                        }
                    }
                }
            }
        } else
        {
            console.log( 'Payment failed' );
            const failure_message = `Dear <b><em>${ req.query.fname }</em></b> Your Payment Failed to Complete successfully`;
            await bot.sendMessage( chatId, failure_message, { parse_mode: "HTML" } );
            await transactionService.update( transaction, {
                paymentStatus: 'failed',
                amount: amount,
                paymentCurrency: String( currency ).toLowerCase(),
                rateOnConversion: rate,
                convertedAmount: amount,
                paymentReference: reference,
                transactionStatus: 'failed'
            } );
        }
        res.redirect( `https://t.me/${ config.BOT_USER }?chat_id=${ chatId }` );
    } catch ( error )
    {
        console.error( 'An error occurred in the "success" route:', error );
        // Handle the error or return an appropriate response here
    }
};

exports.failure = async ( req, res ) =>
{
    try
    {
        const failure_message = `Dear <b><em>${ req.query.fname }</em></b> Your Payment Has Been Cancelled`;
        const session = await stripe.checkout.sessions.retrieve( req.query.session_id );

        if ( session && session.customer )
        {
            const currency = session.currency;
            const amount = session.amount_total;
            const reference = req.query.session_id;
            const transaction = req.query.transaction;
            const chatId = req.query.chat_id;
            const rate = await rateService.findByCurrencyFrom( String( currency ).toUpperCase() );
            // AMOUNT IN RTGS
            const convertedAmount = rate * amount;
            await bot.sendMessage( chatId, failure_message, { parse_mode: "HTML" } );
            await transactionService.update( transaction, {
                paymentStatus: 'cancelled',
                amount: amount,
                paymentCurrency: String( currency ).toLowerCase(),
                rateOnConversion: rate,
                convertedAmount: convertedAmount,
                paymentReference: reference,
                transactionStatus: 'cancelled'
            } );
            res.redirect( `https://t.me/${ config.BOT_USER }?chat_id=${ chatId }` );
        }
    } catch ( error )
    {
        console.error( 'An error occurred in the "failure" route:', error );
        // Handle the error or return an appropriate response here
    }
};

exports.processPendingTransactions = async () =>
{
    try
    {
        let transactions = await transactionService.findTransactionsPendingSettlement();
        if ( transactions && transactions.length > 0 )
        {
            for ( trans of transactions )
            {
                if ( trans.transactionType == 'airtime' )
                {
                    let customerSMS = `Your account has been credited with <b>USD</b>${ trans.amount } of airtime from KwikPay HotRecharge`;
                    const response = await utils.processAirtime( trans.amount, trans.targetedPhone, customerSMS );
                    if ( response != null )
                    {
                        let message = `Dear ${ trans.fname }, <b>${ trans.targetedPhone }</b> has been successfully credited with <b>USD</b>${ trans.amount } of airtime.`;
                        await transactionService.update( trans._id, {
                            transactionStatus: 'completed',
                            endTime: new Date(),
                            transactionReference: response.AgentReference
                        } );
                        await bot.sendMessage( chatId, message, { parse_mode: "HTML" } );
                    }
                } else if ( trans.transactionType == 'zesa' )
                {
                    const response = await utils.processZesaPayment( trans.convertedAmount, trans.meterNumber, trans.targetedPhone );
                    if ( response != null && !response.error )
                    {
                        let reference = response.reference;
                        let message = `Dear <em>${ trans.fname }</em> Your ZESA Transaction has been successful. The following are the details:
                \n Meter Number: ${ response.meter }
                \n Amount : <b>ZWL</b>${ response.amount },
                \n Name: ${ response.name },
                \n Address: ${ response.address },
                \n Token: ${ response.token },
                \n Units: ${ response.units },
                \n Net Amount: <b>ZWL</b>${ response.netamount },
                \n Levy: ${ response.levy },
                \n Arrears: ${ response.arrears },
                \n Tax: ${ response.reference },
                \n Reference: ${ reference }`;
                        await transactionService.update( trans._id, {
                            transactionStatus: 'completed',
                            transactionReference: reference,
                            endTime: new Date()
                        } );
                        await bot.sendMessage( trans.chatId, message, { parse_mode: "HTML" } );
                    }
                } else
                {
                    // DO NOTHING BECAUSE THIS HAPPENS IN THE BACKGROUND
                }
            }
        }
    } catch ( error )
    {
        console.error( 'An error occurred in "processPendingTransactions":', error );
        // Handle the error or return an appropriate response here
    }
};
