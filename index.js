document.onready = function() {
   $('#clear-button').click(clearAll);
   $('#calculate-button').click(calculate);
   $.get('decompression_tables.json', function(tables) {
      window.tables = JSON.parse(tables);
   });
};

/*********************
 *  clearAll
 *  calculate
 *  groupAfterDive1
 *  setError
 *  setResults
 *********************/

function clearAll() {
   $('#panel input:not([type=button]').val('');
   $("#error").hide();
   $("#results").hide();
   $("#warning").hide();
   $("#notice").hide();
}

function calculate() {
   if (typeof window.tables == "undefined") {
      setError("please wait a second or so for the decompression tables " +
       "to finish downloading");
      return;
   }

   var d1 = $('#dive-1 .depth').val();
   var m1 = $('#dive-1 .minutes').val();
   var m2 = $('#dive-2 .minutes').val();
   var d2 = $('#dive-2 .depth').val();

   var dive1data = dive1(d1, m1);
   var dive2data = dive2(d2, m2);
   if (!dive1data) return;

   if (dive1data.roundedMin != m1) {
      var note = 'rounded dive 1 minutes from ' + m1 + ' to ' +
       dive1data.roundedMin;
   }

   if (dive1data.safteyStop) {
      var warning = 'you must take a saftey-stop for 3min at 15ft after your ' +
       'first dive';
   }

   if (dive1data.decompressionLimit) {
      var warning = 'you hit a no-decompression limit in dive 1! ' +
       'You must take a saftey-stop for 8min at 15ft, and remain ' +
       'out of the water for 6hours after surfacing';
   }

   setResults('After dive 1, you will be in group ' +
    String.fromCharCode('A'.charCodeAt(0) + dive1data.pressureGroup) +
    '.', note, warning);
}

function dive1(depth, min) {
   var matched = window.tables[0].columns.filter(function(col) {
      return col.depth == parseInt(depth);
   });

   if (matched.length == 0) {
      setError("dive-1 depth is an invalid value." +
         "<br>Value must be one of: " +
         window.tables[0].columns.map(function(col) {
            return col.depth;
         }).join(', ')
      );
      return;
   }

   if (matched.length > 1) {
      setError('multiple columns with same depth in table 1', true);
      return;
   }

   var dive1col = matched[0];
   min = parseInt(min);
   var max = dive1col.rows[dive1col.rows.length - 1].min;

   if (isNaN(min) || min < 1 || min > max) {
      setError('value for dive-1 minutes must be greater than or equal to ' +
       '1 and less than or equal to ' + max);
      return;
   }

   var row = null;
   if (min > 0 && min < dive1col.rows[0].min) {
      row = dive1col.rows[0];
   }
   
   for (var i = 0; !row && i < dive1col.rows.length - 1; ++i) {
      if (min >= dive1col.rows[i].min) {
         if (min < dive1col.rows[i+1].min) {
            if (min == dive1col.rows[i].min) {
               row = dive1col.rows[i];
            } else { // greater than; round up
               row = dive1col.rows[i+1];
            }
         } else if (i == dive1col.rows.length - 2) {
            if (min != dive1col.rows[i+1].min) {
               setError('bad logic. no appropriate minutes row found', true);
               return;
            } else {
               row = dive1col.rows[i+1];
            }
         }
      } else {
         setError('a column in table 1 has non-increasing rows', true);
         return;
      }
   }

   if (!row) {
      setError('bad logic. `row` is not set', true);
      return;
   }

   var group = dive1col.rows.indexOf(row);
   if (group == -1) {
      setError('bad logic. `row` not found in table 1 rows', true);
      return;
   }

   return {
      'decompressionLimit' : row.limit,
      'safteyStop'         : row.ss,
      'roundedMin'         : row.min,
      'pressureGroup'      : group
   };
}

function dive2(depth, min) {
   var matched = window.tables[2].rows.filter(function(row) {
      return row.depth == parseInt(depth);
   });

   if (matched.length == 0) {
      setError("dive-2 depth is an invalid value." +
         "<br>Value must be one of: " +
         window.tables[1].rows.map(function(row) {
            return row.depth;
         }).join(', ')
      );
      return;
   }

   if (matched.length > 1) {
      setError('multiple rows with same depth in table 3', true);
      return;
   }

   var row = matched[0];
   min = parseInt(min);
   var max = row.cols[row.cols.length - 1].abt;
   if (isNaN(min) || min < 1 || min > max) {
      setError('value for dive-2 minutes must be greater than or equal to ' +
       '1 and less than or equal to ' + max);
      return;
   }

   // the number of columns removed from the beginning of this row..
   // this number must be added to the column index to calculate the group
   var removedCols = 0;
   row.cols = row.cols.reduce(function removeEmptyCols(cols, col) {
      if (col.abt) {
         if (removedCols) {
            setError('col exists in table 3 with abt that occurs after first ' +
             'col without an abt', true);
            return;
         }
         cols.push(col);
      } else {
         ++removedCols;
      }
      return cols;
   }, []);

   if (!row.cols) {
      return;
   }

   var col = null;
   if (min > 0 && min < row.cols[0].abt) {
      col = row.cols[0];
   }

   // find the appropriate column based on the minutes the user passed.
   // from the above check we know there is an appropriate column. We want to
   // round to the closest min
   for (var i = 0; !col && i < row.cols.length -1; ++i) {
      if (row.cols[i].abt > row.cols[i + 1]) {
         setError('table 3\'s abt values are not ascending', true);
         return;
      }
      // note: sometimes the columns have the same abt. In this case, the
      // max pressure group should be assumed (safety-precaution)
      // This code by happenstance chooses the lowest index col (highest
      // pressure group).
      var diff1 = Math.abs(row.cols[i].abt - min);
      var diff2 = Math.abs(row.cols[i+1].abt - min);
      if (diff1 <= diff2) {
         col = row.cols[i];
      }
   }

   // diff2 was always less than diff1, meaning the min the user supplied
   // is closest to the last column (because the columns are guarenteed to be
   // ascending).
   if (!col) {
      col = row.cols[row.cols.length - 1];
   }

   var colIndex = row.cols.indexOf(col);
   if (colIndex == -1) {
      setError('bad logic. `col` not found in table 3 cols', true);
      return;
   }

   // Z = 0; A = 25
   var group = 25 - (colIndex + removedCols);
}

function setError(str, internal) {
   var error = $("#error");
   var warning = $("#warning");
   var results = $("#results");
   var notice = $("#notice");

   results.hide();
   notice.hide();
   warning.hide();

   if (internal) {
      var data = {
         m1 : m1,
         m2 : m2,
         d1 : d1,
         d2 : d2
      }
   }

   error.html((internal ? 'Sorry, there has been an internal error. ' +
    'Please notify the maintainers.<br><br>' + JSON.stringify(data) +
    '<br><br>' : 'Error: ') + str + '.');
   error.show();
}

function setResults(res, note, warn) {
   var error = $("#error");
   var warning = $("#warning");
   var results = $("#results");
   var notice = $("#notice");

   error.hide();

   if (note) {
      notice.html("Note: " + note + ".");
      notice.show();
   } else {
      notice.hide();
   }

   if (warn) {
      warning.html("Warning: " + warn + ".");
      warning.show();
   } else {
      warning.hide();
   }

   results.html(res);
   results.show();
}
