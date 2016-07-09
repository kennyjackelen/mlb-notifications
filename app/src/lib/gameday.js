/*jshint node:true*/
'use strict';

var mlb = require('./mlb.js');
var database = require('./database.js');
var Play = require('./play.js');
var moment = require('moment-timezone');
var notify = require('./notify.js');

var TICK_INTERAL = 5000;  // Every 5 seconds

var twinsGame = {};

function getTwinsGame() {
  return new Promise( 
    function( resolve, reject ) {
      // Use yesterday's games until 7am Central Time (for games that span midnight)
      var m = moment().tz('America/Chicago').subtract( 7, 'hours');
      var date = new Date( m.year(), m.month(), m.date() );

      if ( date === twinsGame.date ) {
        resolve( twinsGame.game_data_directory );
        return;
      }
      twinsGame = {};
      mlb.getSchedule( date,
        function( err, schedule ){
          if ( err ) {
            reject( err );
            return;
          }
          for ( var i = 0; i < schedule.length; i++ ) {
            var game = schedule[ i ];
            if ( game.away_name_abbrev === 'MIN' || game.home_name_abbrev === 'MIN' ) {
              resolve( game.game_data_directory );
              twinsGame.date = date;
              twinsGame.game_data_directory = game.game_data_directory;
              break;
            }
          }
        }
      );
    }
  );
}

function getNewPlays( game_data_directory ) {
  return new Promise(
    function( resolve, reject ) {
      console.log( 'using lastGUID: ', twinsGame.lastGUID );
      mlb.getGameEvents( game_data_directory, twinsGame.lastGUID, 
        function( err, events ) {
          if ( err ) {
            reject( err );
            return;
          }
          for ( var i = 0; i < events.length; i++ ) {
            if ( i > 0 ) {
              digestOnePlay( events[ i ], events[ i - 1 ] );
            }
            else if ( twinsGame.lastGUID ) {
              digestOnePlay( events[ i ], null );
            }
          }
          if ( events.length > 0 ) {
            twinsGame.lastGUID = events[ events.length - 1 ].play_guid;
            console.log( 'set lastGUID to: ', twinsGame.lastGUID );
          }
          resolve();
        }
      );
    }
  );
}

function digestOnePlay( currentPlay, previousPlay ) {
  var play = new Play( currentPlay, previousPlay );
  var conditions = play.getConditions();
  if ( conditions.$or.length > 0 ) {
    database.find( conditions, function( err, subscriptions ) {
      for ( var i = 0; i < subscriptions.length; i++ ) {
        var subscription = subscriptions[ i ].subscription;
        notify( subscription, {
          title: currentPlay.des
        } );
      }
    });
  }
}

function scheduleNext() {
  setTimeout( tick, TICK_INTERAL );
}

function tick() {
  getTwinsGame()
  .then( getNewPlays )
  .catch( function( err ) { console.log( err ); } )
  .then( scheduleNext );
}

tick();
