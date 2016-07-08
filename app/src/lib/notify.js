/*jshint node:true,esnext:true*/
'use strict';

var request = require('request');

var queue = [];

module.exports = function( subscriptionID, currentPlay ) {
  if ( queue.length === 0 ) {
    notify( subscriptionID, currentPlay );
  }
  else {
    queue.push( arguments );
  }
};

function notify( subscriptionID, currentPlay ) {
  request( {
    method: 'POST',
    url: 'https://android.googleapis.com/gcm/send',
    headers: {
      'Authorization' : 'key=' + process.env.GCM_API_KEY
    },
    json: true,
    body: {
      'delayWhileIdle': true,
      'timeToLive': 3,
      'data': {
        'title': 'MLB Notification',
        'message': 'Click me.'
      },
      'registration_ids': [ subscriptionID ]
    }
  },
  function() {
    if ( queue.length > 0 ) {
      setTimeout( 100, notify.apply( this, ...queue.shift() ) );
    }
  } );
}