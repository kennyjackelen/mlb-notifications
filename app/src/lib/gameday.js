/*jshint node:true,esnext:true*/
'use strict';

var database = require('./database.js');
var Play = require('./play.js');
var notify = require('./notify.js');

const GamedayListener = require('./gameday/GamedayListener.js');

var options = {
  teams: [ 'MIN' ],
  onNewPlay: playReceived,
  onError: logError
};

var listener = new GamedayListener( options );
listener.start();

function playReceived( newPlay ) {
  var play = new Play( newPlay.atbat, newPlay.prevAtbat, newPlay.game );
  var conditions = play.getConditions();
  if ( conditions.$or.length > 0 ) {
    database.find( conditions, function( err, subscriptions ) {
      for ( var i = 0; i < subscriptions.length; i++ ) {
        var subscription = subscriptions[ i ].subscription;
        var settings = subscriptions[ i ].settings;
        var payload = buildNotificationPayload( play, settings );
        if ( i === 0 ) {
          log( payload.title, { payload: payload, eventTypes: play.getEventTypes(), play: play } );
        }
        if ( process.env.LOG_ONLY ) {
          continue;
        }
        payload.icon = './images/android-chrome-512x512.png';
        payload.badge = './images/favicon-32x32.png';
        notify( subscription, payload );
      }
    });
  }
}

function log( msg, detail ) {
  process.send( { type: 'log', msg: msg, detail: detail } );
}

function logError( err ) {
  process.send( { type: 'error', msg: err.msg, detail: err, stack: ( new Error().stack ) } );
}

function buildNotificationPayload( play, settings ) {
  var eventTypes = play.getEventTypes();
  if ( eventTypes.leadChange && settings.leadChange ) {
    return {
      title: 'Lead Change: ' + getScoreString( play ),
      message: getInningString( play ) + '. ' + play.currentPlay.des
    };
  }
  if ( eventTypes.runScored && settings.runScored ) {
    return {
      title: 'Run Scored: ' + getScoreString( play ),
      message: getInningString( play ) + '. ' + play.currentPlay.des
    };
  }
  if ( eventTypes.homeRun && settings.homeRun ) {
    return {
      title: 'Home Run: ' + getScoreString( play ),
      message: getInningString( play ) + '. ' + play.currentPlay.des
    };
  }
  if ( eventTypes.bigWinprobChange && settings.bigWinprobChange) {
    return {
      title: 'Big Play: ' + getScoreString( play ),
      message: getInningString( play ) + '. ' + play.currentPlay.des
    };
  }
  if ( eventTypes.highLeverage && settings.highLeverage ) {
    return {
      title: 'High Leverage: ' + getScoreString( play ),
      message: getGameState( play )
    };
  }
  if ( eventTypes.gameStart && settings.gameStart ) {
    return {
      title: 'Game Started: ' + getScoreString( play )
    };
  }
  if ( eventTypes.gameEnd && settings.gameEnd ) {
    return {
      title: 'Final: ' + getScoreString( play )
    };
  }
  if ( eventTypes.noHitter && settings.noHitter ) {
    return { };
  }
  if ( eventTypes.halfInning && settings.halfInning ) {
    return {
      title: getInningString( play ) + ': ' + getScoreString( play )
    };
  }
  return {
    title: getScoreString( play ),
    message: getInningString( play ) + '. ' + play.currentPlay.des
  };
}

function getScoreString( play ) {
  var home_team_runs = Number( play.currentPlay.home_team_runs );
  var away_team_runs = Number( play.currentPlay.away_team_runs );
  var home_string = play.game.home_name_abbrev + ' ' + home_team_runs;
  var away_string = play.game.away_name_abbrev + ' ' + away_team_runs;
  if ( home_team_runs > away_team_runs ) {
    return home_string + ', ' + away_string;
  }
  return away_string + ', ' + home_string;
}

function getBattingTeam( play ) {
  var reallyTop = play.currentPlay.isTop && Number( play.currentPlay.o ) !== 3;
  reallyTop = reallyTop || ( !play.currentPlay.isTop && Number( play.currentPlay.o ) === 3 );
  if ( reallyTop ) {
    return play.game.away_team_name + ' batting';
  }
  return play.game.home_team_name + ' batting';
}

function getGameState( play ) {
  return getBattingTeam( play ) + '. ' + getInningString( play ) + '. ' + getBaserunnerState( play ) + '. ' + getOuts( play ) + '.';
}

function getOuts( play ) {
  var outs = Number( play.currentPlay.o );
  if ( outs === 1 ) {
    return '1 out';
  }
  if ( outs === 3 ) {
    outs = 0;
  }
  return outs + ' outs';
}

function getBaserunnerState( play ) {
  var runner_on_1b = Boolean( play.currentPlay.b1 );
  var runner_on_2b = Boolean( play.currentPlay.b2 );
  var runner_on_3b = Boolean( play.currentPlay.b3 );
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

function getInningString( play ) {
  var gameStatus = play.game.status;
  if ( gameStatus.ind === 'F' || gameStatus.ind === 'O' ) {
    if ( Number( gameStatus.inning ) > 9 ) {
      return 'Final (' + gameStatus.inning + ')';
    }
    return 'Final';
  }
  if ( play.currentPlay.isTop ) {
    if ( play.currentPlay.o === '3' ) {
      return 'Mid ' + play.currentPlay.inning;
    }
    else {
      return 'Top ' + play.currentPlay.inning;
    }
  }
  else {
    if ( play.currentPlay.o === '3' ) {
      return 'End ' + play.currentPlay.inning;
    }
    else {
      return 'Bot ' + play.currentPlay.inning;
    }
  }
}
