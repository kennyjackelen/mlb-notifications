/*jshint node:true,esnext:true*/
'use strict';

var push = require('web-push');
push.setGCMAPIKey( process.env.GCM_API_KEY );

var queue = [];

module.exports = function( subscription, payload ) {
  if ( queue.length === 0 ) {
    notify( subscription, payload );
  }
  else {
    queue.push( arguments );
  }
};

function notify( subscription, payload ) {
  push.sendNotification(
    subscription.endpoint,
    {
      TTL: 10,
      userPublicKey: subscription.p256dh,
      userAuth: subscription.auth,
      payload: payload
    }
  )
  .catch( ( e ) => console.log( e ) )
  .then(
    function() {
      if ( queue.length > 0 ) {
        setTimeout( 100, notify.apply( this, ...queue.shift() ) );
      }
    }
  );
}
