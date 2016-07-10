/*jshint node:true,esnext:true*/
'use strict';

module.exports = function( router ) {

  router.use('/log', function( req, res, next ) {
    var logger = req.app.locals.logger;
    logger.getLogPage( { title: 'Twins Notifications'} )
    .then( ( html ) => {
      res.set('Content-Type', 'text/html');
      res.send( html );
    })
    .catch( () => {
      res.status(500).end();
    });
  });

};
