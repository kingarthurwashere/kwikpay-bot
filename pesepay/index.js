var express = require('express');
var controller = require('./pesepay.controller');
var router = express.Router();

router.get('/success', async (req, res) => {
  const { fname, chat_id, transactionId, service } = req.query;
  // Other code...

  // Call the success function from the controller and pass the chat_id as an argument
  await controller.success(req, res, chat_id);
});



router.get('/failure', controller.failure);

module.exports = router;
