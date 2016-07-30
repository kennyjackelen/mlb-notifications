/* jshint node:true,esnext:true */
'use strict';

const moment = require('moment-timezone');

class GamedayUtilities {

  static today() {
    // Use yesterday's games until 7am Central Time (for games that span midnight)
    var m = moment().tz('America/Chicago').subtract( 7, 'hours');
    return new Date( m.year(), m.month(), m.date() );
  }

}

module.exports = GamedayUtilities;