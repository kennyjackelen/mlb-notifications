/*jshint node:true*/
'use strict';
var http = require('http');
var format = require('format');

var GAMEDAY_HOST = 'gd2.mlb.com';

function getBasePath( date ) {

  return format('/components/game/mlb/year_%s/month_%s/day_%s/',
                    date.getFullYear(),
                    _padToTwoDigits( date.getMonth() + 1 ),
                    _padToTwoDigits( date.getDate() )
                  );

  function _padToTwoDigits( integer ) {
    return ( '0' + integer ).slice( -2 );
  }

}

function request( path, callback ) {

  var options = {
    host: GAMEDAY_HOST,
    port: 80,
    path: path
  };

  var _httpCallback = function( response ) {
    var body = '';

    response.on('data', function (chunk) {
      body += chunk;
    });

    response.on('end', function () {
      callback( false, response, body );
    });
  };

  var req = http.request( options, _httpCallback );

  req.on('error', function(){
    callback( true );
  });
  req.end();
}

module.exports.getSchedule = function getSchedule( date, callback ) {

  if ( typeof( date ) === 'undefined' ) {
    date = new Date();
  }

  var path = getBasePath( date ) + 'master_scoreboard.json';

  request( path, _digestSchedule );

  function _digestSchedule( error, response, body ) {
    var schedule;
    if (!error && response.statusCode === 200) {
      try {
        schedule = JSON.parse( body ).data.games.game;
      } catch ( e ) {
        console.log('error parsing response');
        callback( true );
        return;
      }
      callback( false, schedule );
    }
    else {
      console.log('error retrieving gameday data: ' + error.toString() );
      callback( true );
    }
  }

};

module.exports.getGameEvents = function getGameEvents( game_data_directory, lastGUID, callback ) {

  if ( typeof( game_data_directory ) === 'undefined' ) {
    callback( 'Must supply a game data directory.');
    return;
  }

  var path = game_data_directory + '/game_events.json';
  var addToArray = Boolean( lastGUID );

  request( path, _digestGameEvents );

  function _digestGameEvents( error, response, body ) {
    var innings;
    var plays = [];
    if (!error && response.statusCode === 200) {
      try {
        innings = JSON.parse( body ).data.game.inning;
        // when it is the first inning, this is an object, not an array
        // make it into an array for consistency
        if ( innings.length === undefined ) {
          innings = [ innings ];
        }
      } catch ( e ) {
        console.log('error parsing response');
        callback( true );
        return;
      }
      for ( var i = 0; i < innings.length; i++ ) {
        var inning = innings[ i ];
        var j, atbat;
        if ( inning.top && typeof( inning.top ) === Array ) {
          for ( j = 0; j < inning.top.atbat.length; j++ ) {
            atbat = inning.top.atbat[ j ];
            atbat.inning = Number( inning.num );
            atbat.isTop = true;
            if ( addToArray ) {
              plays.push( atbat );
            }
            if ( atbat.play_guid === lastGUID ) {
              addToArray = true;
            }
          }
        }
        if ( inning.bottom && typeof( inning.bottom ) === Array ) {
          for ( j = 0; j < inning.bottom.atbat.length; j++ ) {
            atbat = inning.bottom.atbat[ j ];
            atbat.inning = Number( inning.num );
            atbat.isTop = false;
            if ( addToArray ) {
              plays.push( atbat );
            }
            if ( atbat.play_guid === lastGUID ) {
              addToArray = true;
            }
          }
        }
      }
      callback( false, plays );
    }
    else {
      console.log('error retrieving gameday data: ' + error.toString() );
      callback( true );
    }
  }

};
