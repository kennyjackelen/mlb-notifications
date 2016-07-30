/*jshint node:true,esnext:true*/
'use strict';

const GamedayUtilities = require('../lib/gameday/GamedayUtilities.js');

module.exports = function( router ) {
  
  router.use('/today', function( req, res, next ) {
    res.json( { today: GamedayUtilities.today() } );
  });

};
