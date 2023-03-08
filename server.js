require('dotenv').config()
const express = require( 'express' );
const app = express();
const config = require( './config.js' )
const mongoose = require( 'mongoose' );
const bot = require('./services/bot.js')
const routes = require('./router');
const cronServices = require('./services/cron.service');

// Connecting to database
mongoose.set('strictQuery',false);
mongoose.connect(config.mongo.url, ).then(r =>{
  console.log('Database Connected...');
} ).catch( r => { console.log( 'Database Not Connected!!', r ) } );
routes.register(app)
// Update Pending Transactions
cronServices.updateAfterEveryFiveMinutes();
// Listening to port
app.listen(3000,async () => {
  console.log("Bot is running .....")
  console.log('Server running on localhost:3000');
} );

module.exports = app;