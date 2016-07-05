/*jshint node:true*/
'use strict';

var winprob = require('winprob');

var Play = function( currentPlay, previousPlay ){
  this.currentPlay = currentPlay;
  this.previousPlay = previousPlay;
};

Play.prototype.getCriteria = function() {
  return { $or: [
    { gameStart: this.gameStart() },
    { halfInning: this.halfInning() },
    { gameEnd: this.gameEnd() },
    { runScored: this.runScored() },
    { leadChange: this.leadChange() },
    { homeRun: this.homeRun() },
    { highLeverage: this.highLeverage() },
    { bigWinprobChange: this.bigWinprobChange() },
    { noHitter: this.noHitter() }
  ] };
};

Play.prototype.gameStart = function() {
  return ( this.currentPlay !== null && this.previousPlay === null );
};

Play.prototype.halfInning = function() {
  return ( this.currentPlay.o === '3' );
};

Play.prototype.gameEnd = function() {
  /* TODO: Not implemented.  Not enough data in just the plays to get this. */
  return false;
};

Play.prototype.runScored = function() {
  if ( this.gameStarted() ) { 
    if ( this.currentPlay.away_team_runs !== "0" )  {
      // Game just started but leadoff batter homered.
      return true;
    }
    return false;
  }
  return ( this.currentPlay.away_team_runs !== this.previousPlay.away_team_runs ) ||
         ( this.currentPlay.home_team_runs !== this.previousPlay.home_team_runs );
};

Play.prototype.leadChange = function() {
  if ( this.gameStarted() ) { 
    if ( this.currentPlay.away_team_runs !== "0" )  {
      // Game just started but leadoff batter homered.
      return true;
    }
    return false;
  }

  return ( this.currentPlay.away_team_runs !== this.previousPlay.away_team_runs ) ||
         ( this.currentPlay.home_team_runs !== this.previousPlay.home_team_runs );
};

Play.prototype.homeRun = function() {
  return ( this.currentPlay.event === 'Home Run' );
};

Play.prototype.highLeverage = function() {
  return ( getLeverage( this.currentPlay ) >= 90 );
};

Play.prototype.bigWinprobChange = function() {
  var prevWinProb = getWinProb( this.previousPlay );
  var curWinProb = getWinProb( this.currentPlay );
  return ( Math.abs( curWinProb - prevWinProb ) >= 0.2 );
};

Play.prototype.noHitter = function() {
  /* TODO: Not implemented yet. */
  return false;
};

function getWinProb( p ) {
  return getWinProbObj(p).pct;
}

function getLeverage( p ) {
  return getWinProbObj(p).leverage;
}

function getWinProbObj( p ) {
  if ( p === null ) {
    // set to beginning of the game
    p = {};
    p.isTop = true;
    p.inning = 1;
    p.o = 0;
    p.b1 = false;
    p.b2 = false;
    p.b3 = false;
    p.home_team_runs = 0;
    p.away_team_runs = 0;
  }
  return winprob(
            p.isTop,
            p.inning,
            Number(p.o),
            Boolean(p.b1),
            Boolean(p.b2),
            Boolean(p.b3),
            Number(p.home_team_runs),
            Number(p.away_team_runs)
          );
}

module.exports = Play;