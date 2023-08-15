var express = require('express');
var controller = require('./pesepay.controller');
var router = express.Router();

router.post('/success', controller.success);

router.post('/failure', controller.failure);

module.exports = router;
