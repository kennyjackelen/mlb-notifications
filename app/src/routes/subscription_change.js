/*jshint node:true*/
'use strict';

module.exports = function( router ) {

  router.post('/subscription_change', function( req, res, next ) {
    var settings = req.body.settings;
    var subscriptionID = req.body.subscriptionID;
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
      database.remove( subscriptionID, cb );
    }
    else {
      database.store( settings, subscriptionID, cb );
    }
  });
  
};
