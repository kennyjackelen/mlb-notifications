/* jshint node:true,esnext:true */
'use strict';

const request = require('request');
const moment = require('moment-timezone');

const GAMEDAY_HOST = 'http://gd2.mlb.com';

function _getBasePath( date ) {

  var y,m,d;
  y = date.getFullYear();
  m = _padToTwoDigits( date.getMonth() + 1 );
  d = _padToTwoDigits( date.getDate() );

  return `/components/game/mlb/year_${ y }/month_${ m }/day_${ d }/`;
}

function _padToTwoDigits( integer ) {
  return ( '0' + integer ).slice( -2 );
}

class GamedayFetcher {

  constructor() {
    this._eTags = new Map();
    this._lastPlays = new Map();
  }

  /* get the schedule of games for a given date */
  /* returns a promise that resolves with an array of game objects */
  getSchedule( date ) {

    return new Promise( function( resolve, reject ) {
      var options;
      var etag;

      // default to today's schedule
      if ( typeof( date ) === 'undefined' ) {
        // Use yesterday's games until 7am Central Time (for games that span midnight)
        var m = moment().tz('America/Chicago').subtract( 7, 'hours');
        date = new Date( m.year(), m.month(), m.date() );
      }

      options = {
          method: 'GET',
          uri: GAMEDAY_HOST + _getBasePath( date ) + 'master_scoreboard.json',
          json: true
        };
      etag = this._eTags.get('schedule');
      if ( etag !== undefined ) {
        console.log( 'using etag: ' + etag );
        options.headers = { 'If-None-Match': etag };
      }
      request(
        options,
        function ( error, response, body ) {
          if ( !error && response.statusCode === 304 ) {
            // Not modified - return no games
            console.log( '304 not modified' );
            resolve( [] );
            return;
          }
          if ( !error && response.statusCode === 200 ) {
            var schedule;
            try { 
              schedule = body.data.games.game;
              // when there is only one game, this is an object, not an array
              // make it into an array for consistency
              if ( !Array.isArray( schedule ) ) {
                schedule = [ schedule ];
              }
            }
            catch( e ) {
              reject( { msg: '[getSchedule] error parsing response', error: e, body: body } );
            }
            this._eTags.set( 'schedule', response.headers.etag );
            resolve( schedule );
          }
          else {
            reject( { msg: '[getSchedule] request failed', error: error, response: response, body: body } );
          }
        }.bind( this )
      );

    }.bind( this ));
  }

  getPlays( game ) {

    return new Promise( function( resolve, reject ) {
      var options;
      var etag;

      options = {
          method: 'GET',
          uri: GAMEDAY_HOST + game.game_data_directory + '/game_events.json',
          json: true
        };
      etag = this._eTags.get( game.id );
      if ( etag !== undefined ) {
        options.headers = { 'If-None-Match': etag };
      }

      request(
        options,
        function ( error, response, body ) {
          if ( !error && response.statusCode === 304 ) {
            // Not modified - return no plays
            resolve( [] );
            return;
          }
          if ( !error && response.statusCode === 200 ) {
            // if no last event number is found, we're getting all the events,
            // so send everything from the start
            var lastEventNum = this._lastPlays.get( game.id );
            var addToArray = ( typeof lastEventNum === 'undefined' );
            var innings;
            var plays = [];
            try {
              innings = body.data.game.inning;
              // when it is the first inning, this is an object, not an array
              // make it into an array for consistency
              if ( !Array.isArray( innings ) ) {
                innings = [ innings ];
              }
            } catch ( e ) {
              reject( { msg: '[getPlays] error parsing response', body: body, err: e } );
              return;
            }
            var atbat, prevAtbat;
            prevAtbat = null;
            for ( var i = 0; i < innings.length; i++ ) {
              var inning = innings[ i ];
              var j;
              if ( inning.top && inning.top.atbat ) {
                // when it is the first atbat, this is an object, not an array
                // make it into an array for consistency
                if ( !Array.isArray( inning.top.atbat ) ) {
                  inning.top.atbat = [ inning.top.atbat ];
                }
                for ( j = 0; j < inning.top.atbat.length; j++ ) {
                  atbat = inning.top.atbat[ j ];
                  atbat.inning = Number( inning.num );
                  atbat.isTop = true;
                  if ( addToArray ) {
                    plays.push( {
                      atbat: atbat,
                      prevAtbat: prevAtbat,
                      game: game
                    } );
                  }
                  if ( atbat.event_num === lastEventNum ) {
                    addToArray = true;
                  }
                  prevAtbat = atbat;
                }
              }
              if ( inning.bottom && inning.bottom.atbat ) {
                // when it is the first atbat, this is an object, not an array
                // make it into an array for consistency
                if ( !Array.isArray( inning.bottom.atbat ) ) {
                  inning.bottom.atbat = [ inning.bottom.atbat ];
                }
                for ( j = 0; j < inning.bottom.atbat.length; j++ ) {
                  atbat = inning.bottom.atbat[ j ];
                  atbat.inning = Number( inning.num );
                  atbat.isTop = false;
                  if ( addToArray ) {
                    plays.push( {
                      atbat: atbat,
                      prevAtbat: prevAtbat,
                      game: game
                    } );
                  }
                  if ( atbat.event_num === lastEventNum ) {
                    addToArray = true;
                  }
                  prevAtbat = atbat;
                }
              }
            }
            if ( prevAtbat !== null ) {
              this._lastPlays.set( game.id, prevAtbat.event_num );
            }
            this._eTags.set( game.id, response.headers.etag );
            resolve( plays );
          }
          else {
            reject( { msg: '[getPlays] request failed', error: error, response: response, body: body } );
          }
        }.bind( this )
      );

    }.bind( this ));

  }

}

module.exports = GamedayFetcher;