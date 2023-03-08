var cron = require('node-cron');
const transactionUpdater = require('../stripe/stripe.controller');

function updateAfterEveryFiveMinutes() {
cron.schedule('*/5 * * * *', async () => {
  await transactionUpdater.processPendingTransactions();
}, {
  scheduled: true,
  timezone: "Africa/Harare"
});
}

module.exports = {updateAfterEveryFiveMinutes}