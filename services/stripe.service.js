const config = require( '../config' );
const stripe = require( 'stripe' )( config.STRIPE_KEY );

async function checkout ( chatId, user, transaction_id, service )
{
  console.log( 'Checkout initiated. Chat ID:', chatId, 'User:', user, 'Transaction ID:', transaction_id, 'Service:', service );

  // Construct the URLs with placeholders
  const successUrl = `${ config.redirect_url }/stripe/success?session_id={CHECKOUT_SESSION_ID}&fname=${ user }&chat_id=${ chatId }&transaction=${ transaction_id }&service=${ service }`;
  const failerUrl = `${ config.redirect_url }/stripe/failure?session_id={CHECKOUT_SESSION_ID}&fname=${ user }&chat_id=${ chatId }&transaction=${ transaction_id }&service=${ service }`;

  console.log( 'Success URL:', successUrl );
  console.log( 'Failure URL:', failerUrl );

  const session = await stripe.checkout.sessions.create( {
    line_items: [
      {
        price: config.SUBSCRIPTION_PRICE,
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl, // Use successUrl here
    cancel_url: failerUrl,   // Use failerUrl here
  } );

  console.log( 'Stripe checkout session created:', session );

  return session.url || null;
}

module.exports = { checkout };
