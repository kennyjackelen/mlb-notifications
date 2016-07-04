/*jshint node:true*/
'use strict';

module.exports = function( router ) {

  router.use('/manifest.json', function( req, res, next ) {
    var manifest = require('../app/src/manifest.json');
    manifest.gcm_sender_id = process.env.GCM_SENDER_ID;
    res.json( manifest );
  });

};
