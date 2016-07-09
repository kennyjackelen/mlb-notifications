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

      mlb.getSchedule( date,
        function( err, schedule ){
          if ( err ) {
            reject( err );
            return;
          }
          for ( var i = 0; i < schedule.length; i++ ) {
            var game = schedule[ i ];
            if ( game.away_name_abbrev === 'DET' || game.home_name_abbrev === 'DET' ) {
              twinsGame.date = date;
              twinsGame.game_data_directory = game.game_data_directory;
              twinsGame.game = game;
              resolve( game.game_data_directory );
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
        var subscription = subscriptions[ i ].subscription;
        var payload = buildNotificationPayload( play, conditions );
        payload.icon = './images/android-chrome-512x512.png';
        notify( subscription, payload );
      }
    });
  }
}

function buildNotificationPayload( play, conditions ) {
  if ( conditions.$or.leadChange ) {
    return {
      title: 'Lead Change: ' + getScoreString( play ),
      message: play.currentPlay.des
    };
  }
  if ( conditions.$or.runScored ) {
    return {
      title: 'Run Scored: ' + getScoreString( play ),
      message: play.currentPlay.des
    };
  }
  if ( conditions.$or.homeRun ) {
    return {
      title: 'Home Run: ' + getScoreString( play ),
      message: play.currentPlay.des
    };
  }
  if ( conditions.$or.bigWinprobChange ) {
    return {
      title: 'Big Play: ' + getScoreString( play ),
      message: play.currentPlay.des
    };
  }
  if ( conditions.$or.gameStart ) {
    return {
      title: 'Game Started: ' + getScoreString( play )
    };
  }
  if ( conditions.$or.gameEnd ) {
    return {
      title: 'Final: ' + getScoreString( play )
    };
  }
  if ( conditions.$or.noHitter ) {
    return { };
  }
  if ( conditions.$or.halfInning ) {
    return {
      title: getInningString() + ': ' + getScoreString( play )
    };
  }
  return {
    title: getScoreString( play ),
    message: play.currentPlay.des
  };
}

function getScoreString( play ) {
  var home_team_runs = Number( play.currentPlay.home_team_runs );
  var away_team_runs = Number( play.currentPlay.away_team_runs );
  var home_string = twinsGame.game.home_name_abbrev + ' ' + home_team_runs;
  var away_string = twinsGame.game.away_name_abbrev + ' ' + away_team_runs;
  if ( home_team_runs > away_team_runs ) {
    return home_string + ', ' + away_string;
  }
  return away_string + ', ' + home_string;
}

function getInningString() {
  var gameStatus = twinsGame.game.status;
  if ( gameStatus.status === 'Final' ) {
    if ( Number( gameStatus.inning ) > 9 ) {
      return 'Final (' + gameStatus.inning + ')';
    }
    return 'Final';
  }
  if ( gameStatus.top_inning === 'Y' ) {
    if ( gameStatus.o === '3' ) {
      return 'Mid ' + gameStatus.inning;
    }
    else {
      return 'Top ' + gameStatus.inning;
    }
  }
  else {
    if ( gameStatus.o === '3' ) {
      return 'End ' + gameStatus.inning;
    }
    else {
      return 'Bot ' + gameStatus.inning;
    }
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
