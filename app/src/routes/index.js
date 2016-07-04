/*jshint node:true, esnext:true*/
'use strict';

var fs = require('fs');
var path = require('path');

module.exports = function( router ) {

  getSiblingScripts().forEach( ( file ) => { addRoute( file, router ); } );

};

function getSiblingScripts() {
  var files = fs.readdirSync( __dirname );
  var scriptName = path.basename( __filename );
  return files.filter( ( file ) => { return ( file !== scriptName ); } );
}

function addRoute( filename, router ) {
  require( './' + filename )( router );
}
