/*jshint node:true*/
'use strict';

var MongoWrapper = function(){
  this.init();
};

MongoWrapper.prototype.init = function(){
  console.log('database-init');
  this.mongoose = require('mongoose');
  this.connect();
};

MongoWrapper.prototype.connect = function(){
  console.log('database-connect');
  this.mongoose.connect('mongodb://db/subscriptions');
  var db = this.mongoose.connection;
  db.on('error', console.error.bind( console, 'connection error:') );
  db.once('open', this._onConnectionOpened.bind( this ) );
};

MongoWrapper.prototype._onConnectionOpened = function() {
  console.log('database-_onConnectionOpened');
  var subscriptionSchema = this.mongoose.Schema( require('./subscription_schema.json') );
  this.Subscription = this.mongoose.model('Subscription', subscriptionSchema);
};

MongoWrapper.prototype.store = function( settings, subscriptionID, callback ) {
  console.log('database-store');
  var record = new this.Subscription( { settings: settings, subscriptionID: subscriptionID } );
  record.save( callback );
};

module.exports = new MongoWrapper();