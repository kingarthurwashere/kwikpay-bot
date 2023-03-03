var express = require('express');
 
var controller = require('./stripe.controller');
var router = express.Router();
router.get('/success',controller.success);
router.get('/failure', controller.failure);

module.exports = router;
