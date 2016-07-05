/*jshint node:true*/
'use strict';

var express = require('express');
var path = require('path');
var fork = require('child_process').fork;
var bodyParser = require("body-parser");
var PORT = process.env.PORT || 8080;

var app = express();
app.use( bodyParser.json() );
var router = express.Router();

app.locals.database = require('./lib/database.js');

// set up routes
require('./routes')( router );
app.use( '/', router );

// set up static directory
app.use( express.static( path.resolve( __dirname, 'app/dist') ) );

// go baby go!
app.listen( PORT );

fork('./lib/gameday.js');
