var DiveCalc = (function constructDiveCalcClass() {

   DiveCalc.prototype = Object.create(Object.prototype);
   DiveCalc.prototype.constructor         = constructor;
   DiveCalc.prototype.calcWaitTime        = calcWaitTime;
   DiveCalc.prototype._getMaxTotalTime    = _getMaxTotalTime;
   DiveCalc.prototype._isValidDepth       = _isValidDepth;
   DiveCalc.prototype._getValidDepths     = _getValidDepths;
   DiveCalc.prototype._getMinPossibleResidualTimeForDepth = 
    _getMinPossibleResidualTimeForDepth;
   DiveCalc.prototype._findMaxGroupGivenMaxRNT =
    _findMaxGroupGivenMaxRNT;
   DiveCalc.prototype._getDiveStats = _getDiveStats;
   DiveCalc.prototype._getMinTimeBetweenDives = _getMinTimeBetweenDives;

   return DiveCalc;
   
   // pass a json string of decompression_tables.json
   function DiveCalc(tablesJson, debug) {
      this.debug = !!debug;
      this.tables = JSON.parse(tablesJson);
      // so the tables can be indexed as 1, 2, 3 (readability)
      this.tables.unshift({});
   }

   /**
    * Calculate the minimum time a scuba diver must wait between two dives
    * given the dives' minutes and depth.
    *
    * returns:
    * {
    *    'minTime_clear' : (int) The minimum time (in minutes) the diver must wait
    *                      between dives to be "in the clear" on his second dive.
    *                      May be +inf if there are no times without safety stop
    *                      required (Number.POSITIVE_INFINITY).
    *    'minTime_ss'    : (int) The minimum time (in minutes) the diver must wait
    *                      between dives in order to safely meet his second dive
    *                      as long as he takes a safety stop.
    *    'minTime_limit' : (int) The minimum time (in minutes) the diver must wait
    *                      between dives in order to barely make his second dive
    *                      safely. Using this wait time, the diver has hit a
    *                      decompression limit.
    *    'dive1SS'       : (bool) True/false indicating whether the diver should
    *                      take a safety stop on his first dive.
    *    'dive1Limit'    : (bool) True/false indicating whether the diver hit a
    *                      decompression limit on his first dive.
    *    'dive1Min'      : (int) The assumed minutes made for dive 1. The tables
    *                      don't have every possible value so we must round.
    *                      (always rounds up if not exact)
    * }
    *
    * Throws:
    *    NotReadyError  - the tables haven't completed downloading yet
    *    InputError     - the arguments provided are invalid
    *    TableDataError - the table contains data which is unexpected/invalid
    *    LogicError     - probably a programmer error
    *
    */
   function calcWaitTime(d1_min, d1_depth, d2_min, d2_depth) {
      d1_min = parseInt(d1_min);
      d2_min = parseInt(d2_min);
      d1_depth = parseInt(d1_depth);
      d2_depth = parseInt(d2_depth);

      if (!this._isValidDepth(d1_depth, 1)) {
         throw new InputError('d1_depth', this._getValidDepths(1).join(', '));
      }
      if (!this._isValidDepth(d2_depth, 1)) {
         throw new InputError('d2_depth', this._getValidDepths(1).join(', '));
      }
      if (!this._isValidDepth(d2_depth, 3)) {
         throw new InputError('d2_depth', this._getValidDepths(3).join(', '));
      }

      try {
         var clearMin = this._getMaxTotalTime('clear', d2_depth);
      } catch (e) {
         if (e instanceof TableDataError &&
          e.message === 'No clear rows in table 1') {
            clearMin = Number.POSITIVE_INFINITY;
         } else {
            throw e;
         }
      }

      var maxTotalMin = {
         'clear' : clearMin,
         'ss'    : this._getMaxTotalTime('ss', d2_depth),
         'limit' : this._getMaxTotalTime('limit', d2_depth)
      };

      // The diver specified an invalid depth 2, one that may have been
      // not a number or off the chart for this depth.
      if (isNaN(d2_min) || d2_min < 0 || d2_min > maxTotalMin['limit']) {
         throw new InputError('d2_min', '1 to ' + maxTotalMin['limit']);
      }

      var retVal = {};

      try {
         var firstDiveStats = this._getDiveStats(d1_min, d1_depth);
      } catch(e) {
         if (e instanceof InputError && e.fieldName === 'min') {
            throw new InputError('d1_min', e.humanReadableExpectedValue);
         } else {
            throw e;
         }
      }

      if (this.debug) {
         console.log('Group after dive 1: ' + firstDiveStats.group);
         console.log('AM dive1: ' + firstDiveStats.assumedMin);
         console.log('SS dive1? ' + !!firstDiveStats.safetyStop);
         console.log('DL dive1? ' + !!firstDiveStats.decompLimit);
      }

      // calculate the minimum minutes to wait between dives for each safety type
      Object.keys(maxTotalMin).forEach(function minTime(safetyType) {
         // max residual nitrogen time possible when making dive 2 at the
         // specified dive 2 safety type for the specified min.
         // calculated from
         //                      rnt + dive time = max total min
         //
         var maxResidualTime = maxTotalMin[safetyType] -  d2_min;
         // the minimum residual time on table 3 for depth2
         var minPossibleResidualTime =
          this._getMinPossibleResidualTimeForDepth(d2_depth);

         if (this.debug) {
            console.log('--------' + safetyType + '---------');
            console.log('Max total min dive2: ' + maxTotalMin[safetyType]);
            console.log('Residual time before dive2: ' + maxResidualTime);
         }

         if (maxTotalMin[safetyType] === Number.POSITIVE_INFINITY) {
            retVal['minutes_' + safetyType] = maxTotalMin[safetyType];
            if (this.debug) {
               console.log('Max group before dive2: ' + maxGroupAfterWait);
               console.log('min_' + safetyType + ': ' + retVal['minutes_' +
                safetyType]);
            }
            return;
         }

         // The second dive isn't possible given this saftey type for dive 2.
         if (maxResidualTime < 0) {
            retVal['minutes_' + safetyType] = Number.POSITIVE_INFINITY;
            if (this.debug) {
               console.log('Max group before dive2: ' + maxGroupAfterWait);
               console.log('min_' + safetyType + ': ' + retVal['minutes_' +
                safetyType]);
            }
            return;
         } else if (maxResidualTime < minPossibleResidualTime) {
            // must wait until rnt = 0
            // the group before making dive 2--or after waiting.
            var maxGroupAfterWait = -1;
         } else {
            // must wait until actualRNT < maxRNT
            try {
               var maxGroupAfterWait
                = this._findMaxGroupGivenMaxRNT(d2_depth, maxResidualTime);
            } catch (e) {
               if (e instanceof InputError) {
                  if (e.fieldName === 'rnt') {
                     // max rnt was too big; it wasn't found in table 3
                     // this shouldn't ever happen unless data is fucked up.
                     throw new TableDataError('group for maxRNT = ' +
                      maxResidualTime + ' was not found. (' +
                      e.humanReadableExpectedValue + ')');
                  } else {
                     throw e;
                  }
               }
               throw e;
            }
         }

         retVal['minutes_' + safetyType] =
          this._getMinTimeBetweenDives(firstDiveStats.group, maxGroupAfterWait);

         if (this.debug) {
            console.log('Max group before dive2: ' + maxGroupAfterWait);
            console.log('min_' + safetyType + ': ' + retVal['minutes_' +
             safetyType]);
         }
      }.bind(this));

      retVal['dive1_ss']    = !!firstDiveStats.safetyStop;
      retVal['dive1_limit'] = !!firstDiveStats.decompLimit;
      retVal['dive1_actual_min']   = firstDiveStats.assumedMin;

      return retVal;
   }

   /**
    * Get the maximum total time (residual + actual) a diver may be under
    * water at the specified `safety` and `depth`.
    * `safety` is either 'clear', 'ss', or 'limit'.
    *
    * return 0 if there is no applicable total time (eg clear on last few columns).
    */
   function _getMaxTotalTime(safetyType, depth) {
      if (!this._isValidDepth(depth, 1)) {
         throw new InputError('depth', this._getValidDepths(1).join(', '));
      }

      var col = this.tables[1].columns.filter(function hasDepth(col) {
         return col.depth == depth;
      })[0];

      switch (safetyType) {
         case 'clear':
            for (var rowIndex in col.rows) {
               var row = col.rows[rowIndex];
               if (lastRow && lastRow.min > row.min) {
                  throw new TableDataError('Minutes are not ascending in ' +
                   'table 1');
               }
               if (row.ss) {
                  if (!lastRow) {
                     throw new TableDataError('No clear rows in table 1');
                  }
                  return lastRow.min;
               }
               if (row.limit) {
                  throw new TableDataError('Jumped from clear rows to limit ' +
                   ' row in table 1');
               }
               var lastRow = row;
            }
            throw new TableDataError('Only clear rows in table 1');

         case 'ss':
            var ssFound = false;

            for (var rowIndex in col.rows) {
               var row = col.rows[rowIndex];
               if (lastRow && lastRow.min > row.min) {
                  throw new TableDataError('Minutes are not ascending in ' +
                   'table 1');
               }

               if (!ssFound) {
                  if (row.ss) {
                     ssFound = true;
                  } else if (row.limit) {
                     // limit should only come after a safetystop row.
                     throw new TableDataError('Jumped from clear row to ' + 
                      'limit row in table 1');
                  }
               } else {
                  if (row.limit) {
                     if (!lastRow.ss) {
                        throw new TableDataError('Safety stop cell is not the ' +
                         'column previous to the limit column.');
                     }
                     return lastRow.min;
                  } else if (!row.ss) {
                     // all safety stop rows should be consecuative
                     throw new TableDataError('Jumped from ss row to clear ' +
                      'row in table 1');
                  }
               }
               var lastRow = row;
            }
            throw new TableDataError('Table 1 doesn\'t have safety stop ' +
             'cells or ended on a safety stop (all should end in limit)');

         case 'limit':
            var ssFound = false;
            var limitFound = false;
            for (var rowIndex in col.rows) {
               var row = col.rows[rowIndex];
               if (lastRow && lastRow.min > row.min) {
                  throw new TableDataError('Minutes are not ascending in ' +
                   'table 1');
               }

               if (!ssFound) {
                  if (row.ss) {
                     ssFound = true;
                  } else if (row.limit) {
                     // limit should only come after a safetystop row.
                     throw new TableDataError('Jumped from clear row to ' + 
                      'limit row in table 1');
                  }
               } else { // ss found
                  if (!limitFound) {
                     if (row.limit) {
                        limitFound = true;
                        if (!lastRow.ss) {
                           throw new TableDataError('Safety stop cell is not '
                            + 'the column previous to the limit column.');
                        }
                     } else if (!row.ss) {
                        // all safety stop rows should be consecuative
                        throw new TableDataError('Jumped from ss row to clear ' +
                         'row in table 1');
                     }
                  } else {
                     throw new TableDataError('Multiple limit rows in table 1');
                  }
               }
               var lastRow = row;
            }
            if (!lastRow) {
               throw new TableDataError('No rows in table 1');
            }
            if (!ssFound) {
               throw new TableDataError('No ss rows in table 1');
            }
            if (!limitFound) {
               throw new TableDataError('No limit row in table 1');
            }
            if (!lastRow.limit) {
               throw new LogicError('Last row should have limit.');
            }
            return lastRow.min;
         default:
            throw new InputError('safety', "'clear', 'ss', or 'limit'");
      }
   }

   /**
    * Is the depth a depth in the table?
    */
   function _isValidDepth(depth, table) {
      switch (table) {
         case 1:
            return groupHasDepth(this.tables[table].columns);
            break;
         case 3:
            return groupHasDepth(this.tables[table].rows);
         default:
            throw new InputError('table', '1 or 3');
      }

      function groupHasDepth(rowsOrCols) {
         var groupsHavingDepth = rowsOrCols.filter(function hasDepth(rowOrCol) {
            return rowOrCol.depth === depth;
         });

         if (groupsHavingDepth.length > 1) {
            throw new TableDataError(
             'multiple columns with same depth in table ' + table);
         }

         return !!groupsHavingDepth.length;
      }
   }

   /**
    * Get the valid depths for the table.
    */
   function _getValidDepths(table) {
      switch (table) {
         case 1:
            return this.tables[table].columns.map(function hasCol(col) {
               return col.depth;
            });
         case 3:
            return this.tables[table].rows.map(function hasRow(row) {
               return row.depth;
            });
         default:
            throw new InputError('table', '1 or 3');
      }
   }

   /**
    * Get the lowest possible remaining nitrogen time (initial pressure group A)
    *  for a Nth dive (N > 1) from table 3.
    *
    * If you're making a dive other than your first, you have some residual
    *  nitrogen left in your system from the first dive.
    *
    * Table 3 shows the residual nitrogen time and absolute bottom time
    *  for a given depth and a given initial pressure group (where initial
    *  pressure group is the pressure group the diver is in when he makes
    *  dive 2.. a result of the pressure group after dive 1 and the time he
    *  waited betwen dive 1 and dive 2).
    */
   function _getMinPossibleResidualTimeForDepth(depth) {
      if (!this._isValidDepth(depth, 3)) {
         throw new InputError('depth', this._getValidDepths(3).join(', '));
      }
      var row = this.tables[3].rows.filter(function hasDepth(row) {
         return row.depth === depth;
      })[0];
      return row.cols[row.cols.length - 1].rnt;
   }

   /**
    * Find the appropriate group (column) from table 3 at the row given by
    *  `depth` which has an rnt <= `rnt`.
    */
   function _findMaxGroupGivenMaxRNT(depth, rnt) {
      var rowsWithDepth = this.tables[3].rows.filter(function hasDepth(row) {
         return row.depth === depth;
      });

      if (!rowsWithDepth.length) {
         throw new InputError('depth', this._getValidDepths(3).join(', '));
      } else if (rowsWithDepth.length > 1) {
         throw new TableDataError('Table 3 has multiple rows with depth ' +
          depth);
      } else {
         var row = rowsWithDepth[0];

         for (var i = row.cols.length - 1; i >= 0; --i) {
            var col = row.cols[i];

            if (col.rnt === null) {
               throw new InputError('rnt', '1 to ' + row.cols[i+1].rnt);
            } else if (col.rnt <= rnt) {
               var group = row.cols.length - i - 1;
               if (row[i] == rnt) {
                  break;
               }
            } else { // col.rnt > rnt
               break;
            }
         }

         return group;
      }
   }

   /**
    * Get the stats of the dive at the given `min` (minutes) and `depth`.
    * {
    *    group       : (int) dive group diver is in after dive
    *    assumedMin  : (int) the min assumed to get the group (always round
    *                   parameter-min up if no exact matches found)
    *    safetyStop  : (bool) is a safety stop required at this depth/min?
    *    decompLimit : (bool) did this diver hit a decompression limit?
    * }
    */
   function _getDiveStats(min, depth) {
      if (!this._isValidDepth(depth, 1)) {
         throw new InputError('depth', this._getValidDepths(1).join(', '));
      } 

      var col = this.tables[1].columns.filter(hasDepth)[0];
      var max = col.rows[col.rows.length - 1].min;

      if (isNaN(min) || min < 1 || min > max) {
         throw new InputError('min', '1 to ' + max);
      }

      var row = null;
      if (min < col.rows[0].min) {
         row = col.rows[0];
      }

      // Find the row. Always round up if min isn't exactly equal.
      for (var i = 0; !row && i < col.rows.length - 1; ++i) {
         if (min >= col.rows[i].min) {
            if (min < col.rows[i+1].min) {
               if (min == col.rows[i].min) {
                  // Sometimes there are two rows consecuatively with the same
                  // minutes (maybe even 3?) always round up the group for
                  // safety reasons.
                  for(var j = i; j < col.rows.length &&
                   col.rows[i] === col.rows[j]; ++j) {
                     row = col.rows[j];
                  }
               } else { // greater than; round up
                  row = col.rows[i+1];
               }
            } else if (i == col.rows.length - 2) {
               // If unequal, row won't be set and an error is thrown below.
               if (min == col.rows[i+1].min) {
                  row = col.rows[i+1];
               }
            }
         } else {
            throw new TableDataError('Column for depth ' + depth + ' in ' +
             'table 1 has non-increasing min values');
         }
      }

      if (!row) {
         throw new LogicError('No appropriate minutes row found.');
      }

      var group = col.rows.indexOf(row);
      if (group == -1) {
         throw new LogicError('Row not found in table 1 rows.');
      }

      return {
         'group'       : group,
         'assumedMin'  : row.min,
         'safetyStop'  : row.ss,
         'decompLimit' : row.limit
      };

      function hasDepth(col) {
         return col.depth === depth;
      }
   }

   /**
    * Get the minimum minutes the diver should wait given that the group after
    *  their first dive and the maximum group they can be in before their second
    *  dive.
    */
   function _getMinTimeBetweenDives(groupAfterFirstDive,
    maxGroupBeforeSecondDive) {
      if (groupAfterFirstDive < 0 || groupAfterFirstDive > 25) {
         throw new InputError('groupAfterFirstDive', '0 to 25');
      }
      if (maxGroupBeforeSecondDive < -1 || maxGroupBeforeSecondDive > 25) {
         throw new InputError('maxGroupBeforeSecondDive', '-1 to 25');
      }

      var row = this.tables[2].rows[25 - groupAfterFirstDive];

      // Must wait until all residual nitrogen vanishes.
      if (maxGroupBeforeSecondDive === -1) {
         var cell = row[row.length - 1];
         return cell.max.hour * 60 + cell.max.min + 1;
      } else if (groupAfterFirstDive <= maxGroupBeforeSecondDive) {
         return 0;
      } else {
         var diff = groupAfterFirstDive - maxGroupBeforeSecondDive;
         var cell = row[diff];
         return cell.min.hour * 60 + cell.min.min;
      }
   }
})();

function TableDataError() {
   ExtendableError.apply(this, arguments);
}
TableDataError.prototype = Object.create(ExtendableError.prototype);
TableDataError.prototype.name = 'TableDataError';
TableDataError.prototype.constructor = TableDataError;
