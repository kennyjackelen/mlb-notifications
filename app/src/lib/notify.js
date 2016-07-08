/*jshint node:true,esnext:true*/
'use strict';

var http = require('http');

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
  var headers = {
    'Authorization' : 'key=' + process.env.GCM_API_KEY,
    'Content-Type' : 'application/json'
  };

  console.log( 'notify' );

  var options = {
    host: 'android.googleapis.com',
    port: 443,
    path: '/gcm/send',
    method: 'POST',
    headers: headers
  };

  var data = {
    'delayWhileIdle': true,
    'timeToLive': 3,
    'data': {
      'title': 'MLB Notification',
      'message': 'Click me.'
    },
    'registration_ids': [ subscriptionID ]
  };
  var dataString =  JSON.stringify(data);

  var req = http.request(options, function(res) {
    res.setEncoding('utf-8');
    var responseString = '';

    res.on('data', function(data) {
      responseString += data;
    });
    res.on('end', function() {
      // TODO: figure out how to clear the failed IDs.
      console.log('response' + responseString);
      if ( queue.length > 0 ) {
        setTimeout( 100, notify.apply( this, ...queue.shift() ) );
      }
    });
    console.log('STATUS: ' + res.statusCode);
  });
  req.on('error', function(e) {
    console.log('error : ' + e.message + e.code);
  });

  req.write( dataString );
  req.end();
}