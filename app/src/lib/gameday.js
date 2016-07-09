/*jshint node:true*/
'use strict';

var mlb = require('./mlb.js');
var database = require('./database.js');
var Play = require('./play.js');
var moment = require('moment-timezone');
var notify = require('./notify.js');

var TICK_INTERAL = 5000;  // Every 5 seconds

var twinsGame = {};

// will be set to false after the first run
var suppressNotify = true;

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
          if ( !suppressNotify ) {
            for ( var i = 0; i < events.length; i++ ) {
              if ( i > 0 ) {
                digestOnePlay( events[ i ], events[ i - 1 ] );
              }
              else if ( twinsGame.lastGUID ) {
                digestOnePlay( events[ i ], null );
              }
            }
          }
          suppressNotify = false;
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
  var eventTypes = play.getEventTypes();
  console.log( eventTypes );
  if ( eventTypes.leadChange ) {
    return {
      title: 'Lead Change: ' + getScoreString( play ),
      message: play.currentPlay.des
    };
  }
  if ( eventTypes.runScored ) {
    return {
      title: 'Run Scored: ' + getScoreString( play ),
      message: play.currentPlay.des
    };
  }
  if ( eventTypes.homeRun ) {
    return {
      title: 'Home Run: ' + getScoreString( play ),
      message: play.currentPlay.des
    };
  }
  if ( eventTypes.bigWinprobChange ) {
    return {
      title: 'Big Play: ' + getScoreString( play ),
      message: play.currentPlay.des
    };
  }
  if ( eventTypes.highLeverage ) {
    return {
      title: 'High Leverage: ' + getScoreString( play ),
      message: getGameState( play )
    };
  }
  if ( eventTypes.gameStart ) {
    return {
      title: 'Game Started: ' + getScoreString( play )
    };
  }
  if ( eventTypes.gameEnd ) {
    return {
      title: 'Final: ' + getScoreString( play )
    };
  }
  if ( eventTypes.noHitter ) {
    return { };
  }
  if ( eventTypes.halfInning ) {
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

function getGameState() {
  return getScoreString() + '. ' + getBaserunnerState() + '. ' + getOuts() + '.';
}

function getOuts() {
  var outs = Number( twinsGame.game.status.o );
  if ( outs === 1 ) {
    return '1 out';
  }
  return outs + ' outs';
}

function getBaserunnerState() {
  var runner_on_1b = Boolean( twinsGame.game.runners_on_base.runner_on_1b );
  var runner_on_2b = Boolean( twinsGame.game.runners_on_base.runner_on_2b );
  var runner_on_3b = Boolean( twinsGame.game.runners_on_base.runner_on_3b );
  if ( runner_on_1b ) {
    if ( runner_on_2b ) {
      if ( runner_on_3b ) {
        return 'Bases loaded';  // loaded
      }
      return 'Runners on first and second';  // 1 + 2
    }
    if ( runner_on_3b ) {
      return 'Runners on first and third';  // corners
    }
    return 'Runner on first';  // 1 only
  }
  if ( runner_on_2b ) {
    if ( runner_on_3b ) {
      return 'Runners on second and third';  // 2 + 3
    }
    return 'Runner on second';  // 2 only
  }
  if ( runner_on_3b ) {
    return 'Runner on third';  // 3 only
  }
  return 'Bases empty';  // empty
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
