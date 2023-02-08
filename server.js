const express = require('express');
const app = express();
const config = require( './config.js' )
require('dotenv').config()
const mongoose = require( 'mongoose' );
const bot = require('./bot.js')

// Connecting to database
mongoose.set('strictQuery',false);
mongoose.connect(config.mongo.url, ).then(r =>{
  console.log('Database Connected...');
} ).catch( r => { console.log( 'Database Not Connected!!', r ) } );

console.info('Bot is up and running');

// Listening to port
app.listen(3000,async () => {
  console.log('Server running on localhost:3000');
} );

module.exports = app;