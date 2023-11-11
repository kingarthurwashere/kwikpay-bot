

exports.register = ( app ) =>
{

    app.use( '/api/stripe', require( './stripe' ) );
    app.use( '/api/pesepay', require( './pesepay' ) );

};
