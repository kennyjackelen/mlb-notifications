/*jshint node:true*/
'use strict';

var express = require('express');
var path = require('path');
var PORT = process.env.PORT || 8080;

var app = express();
var router = express.Router();

// set up routes
require('./routes')( router );
app.use( '/', router );

// set up static directory
app.use( express.static( path.resolve( __dirname, 'app/dist') ) );

// go baby go!
app.listen( PORT );
