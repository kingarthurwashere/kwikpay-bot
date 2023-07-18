var express = require('express');

var controller = require('./pesepay.controller');
var router = express.Router();
router.get('/success',controller.success);
router.get( '/failure', controller.failure );
router.get( '/payement', controller.pay ); // For testing Pesepay api


module.exports = router;
