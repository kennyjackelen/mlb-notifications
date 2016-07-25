/* jshint node:true,esnext:true */
'use strict';

const GamedayFetcher = require('./GamedayFetcher.js');

class GamedayListener {

  constructor( options ) {
    // available options:
    //  - teams: an array of team abbreviations
    //  - interval: how often to check for updates
    this.options = {
      teams: [],
      interval: 5 * 1000
    };
    Object.assign( this.options, options );
    
    this._fetcher = new GamedayFetcher();

    if ( typeof( this.options.callback ) === 'undefined' ) {
      throw 'No callback defined';
    }
  }

  /* starts listening for new events */
  start() {
    if ( this._timeout ) {
      throw 'Already started.';
    }
    this.tick();
  }

  /* pauses the listener */
  pause() {
    if ( this._timeout ) {
      clearTimeout( this._timeout );
    }
  }

  /* called each time we check for events */
  tick() {
    this._fetcher.getSchedule()
      .then( this._filter )
      .then( this._getPlays )
      .then( this._notify );
  }

  _filter( schedule ) {
    return new Promise( function( resolve, reject ) {
      resolve(
        schedule.filter(
          game => {
            // Check if we care about either of the teams
            if ( this.teams.indexOf( game.away_name_abbrev ) < 0  &&
                 this.teams.indexOf( game.home_name_abbrev ) < 0 ) {
              return false;
            }
            // Check if the game is in progress
            // "Pre-Game", "Postponed", "Final", "Preview", "Delayed", "Game Over", "In Progress", "Warmup", "Manager Challenge"
            if ( game.status.status !== 'In Progress' &&
                 game.status.status !== 'Manager Challenge' &&
                 game.status.status !== 'Game Over' ) {
              return false;
            }
            return true;
          }
        )
      );
    });
  }

  _getPlays( games ) {
    return Promise.all( games.map( this._fetcher.getPlays ) );
  }

  _notify( games ) {
    var plays;
    for ( var i = 0; i < games.length; i++ ) {
      plays = games[ i ];
      for ( var j = 0; j < plays.length; j++ ) {
        this.options.callback( plays[ j ] );
      }
    }
  }

}

module.exports = GamedayListener;