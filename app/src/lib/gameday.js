/*jshint node:true*/
'use strict';

var http = require('http');
var mlb = require('mlb.js');
var database = require('./database.js');
var Play = require('./play.js');

var TICK_INTERAL = 5000;  // Every 5 seconds

var twinsGame = {};

function getTwinsGame() {
  return new Promise( 
    function( resolve, reject ) {

      // start debug
      resolve( '/components/game/mlb/year_2016/month_07/day_04/gid_2016_07_04_kcamlb_tormlb_1' );
      return;
      //end debug

      var date = new Date();
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
      console.log( 'getting game events' );
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
        var id = subscriptions[ i ].id;
        notify( id, currentPlay );
      }
    });
  }
}

function notify( subscriptionID, currentPlay ) {
  var headers = {
    'Authorization' : 'key=' + process.env.GCM_API_KEY,
    'Content-Type' : 'application/json'
  };

  var options = {
    host: 'android.googleapis.com',
    port: 80,
    path: '/gcm/send',
    method: 'POST',
    headers: headers
  };

  var data = {
    'delayWhileIdle': true,
    'timeToLive': 3,
    'data': {
      'title': 'MLB Notification',
      'message': 'Click me.'
    },
    'registration_ids': subscriptionID
  };
  var dataString =  JSON.stringify(data);

  var req = http.request(options, function(res) {
    res.setEncoding('utf-8');
    var responseString = '';

    res.on('data', function(data) {
      responseString += data;
    });
    res.on('end', function() {
      // TODO: figure out how to clear the failed IDs.
      console.log('response' + responseString);
    });
    console.log('STATUS: ' + res.statusCode);
  });
  req.on('error', function(e) {
    console.log('error : ' + e.message + e.code);
  });

  req.write( dataString );
  req.end();
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
