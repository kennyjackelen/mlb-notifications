/*jshint node:true*/
'use strict';

module.exports = function( router ) {

  router.post('/subscription_change', function( req, res, next ) {
    var settings = req.body.settings;
    var subscription = req.body.subscription;
    var database = req.app.locals.database;

    var cb = function( err ) {
      if ( err ) {
        res.status( 500 );
      }
      else {
        res.end();
      }
    };

    if ( !settings.turnedOn ) {
      database.remove( subscription, cb );
    }
    else {
      database.store( settings, subscription, cb );
    }
  });
  
};
