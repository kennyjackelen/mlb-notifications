/* jshint node:true,esnext:true */
'use strict';

const GamedayFetcher = require('./GamedayFetcher.js');

class GamedayListener {

  constructor( options ) {
    // available options:
    //  - teams: an array of team abbreviations
    //  - interval: how often to check for updates
    //  - onNewPlay: callback for new plays
    //  - onError: callback for errors
    this.options = {
      teams: [],
      interval: 5 * 1000
    };
    Object.assign( this.options, options );
    
    this._fetcher = new GamedayFetcher();

    if ( typeof( this.options.onNewPlay ) === 'undefined' ) {
      throw 'No new play callback defined';
    }

    if ( typeof( this.options.onError ) === 'undefined' ) {
      throw 'No error callback defined';
    }
  }

  /* starts listening for new events */
  start() {
    if ( this._timeout ) {
      throw 'Already started.';
    }
    this._isFirstRun = true;
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
      .then( this._notify )
      .catch( e => { this.options.onError( e ); }  )
      .then( this._scheduleNext );
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
    }.bind( this ));
  }

  _getPlays( games ) {
    if ( this._isFirstRun ) {
      this._isFirstRun = false;
      return Promise.resolve( [] );
    }
    return Promise.all(
      games.map(
        game => { return this._fetcher.getPlays( game ); }
      )
    );
  }

  _notify( games ) {
    var plays;
    for ( var i = 0; i < games.length; i++ ) {
      plays = games[ i ];
      for ( var j = 0; j < plays.length; j++ ) {
        this.options.onNewPlay( plays[ j ] );
      }
    }
    return Promise.resolve();
  }

  _scheduleNext() {
    this._timeout = setTimeout( this.tick.bind( this ), this.options.interval );
  }

}

module.exports = GamedayListener;