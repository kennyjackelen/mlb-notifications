/*jshint node:true,esnext:true*/
'use strict';

const DELAY = 1000;  // wait one second before sending notification

module.exports = function( router ) {

  router.post('/test_push', function( req, res, next ) {
    var subscription = req.body.subscription;
    var payload = req.body.payload;

    setTimeout( () => { require('../lib/notify.js')( subscription, payload ); }, DELAY );
    res.end();

  });
  
};
