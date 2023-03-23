var cron = require('node-cron');
const transactionUpdater = require('../stripe/stripe.controller');
const utilService = require('../services/utils')

function updateAfterEveryFiveMinutes() {
cron.schedule('*/5 * * * *', async () => {
  await transactionUpdater.processPendingTransactions();
}, {
  scheduled: true,
  timezone: "Africa/Harare"
});
}
function updateTest() {
  cron.schedule('*/5 * * * *', async () => {
    await utilService.processAirtime(1,'0777807782','Airtime of $1 successful from quick pay') ;
  }, {
    scheduled: true,
    timezone: "Africa/Harare"
  });
  }

module.exports = {updateAfterEveryFiveMinutes,updateTest}