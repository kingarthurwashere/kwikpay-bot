const express = require( 'express' );
const router = express.Router();
const controller = require( './stripe.controller' );

router.get( '/success', controller.success );
router.get( '/failure', controller.failure );

module.exports = router;
