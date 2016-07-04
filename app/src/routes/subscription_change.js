/*jshint node:true*/
'use strict';

module.exports = function( router ) {

  router.post('/subscription_change', function( req, res, next ) {
    var settings = req.body.settings;
    var subscriptionID = req.body.subscriptionID;
    var database = require('../lib/database.js');
    database.store( settings, subscriptionID );
    res.end();
  });
  
};
