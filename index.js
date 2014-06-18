document.onready = function() {
   $('#clear-button').click(clearAll);
   $('#calculate-button').click(calculate);
   $.get('decompression_tables.json', function(tables) {
      window.tables = JSON.parse(tables);
   });
};

function clearAll() {
   $('#panel input:not([type=button]').val('');
   $("#error").hide();
   $("#results").hide();
   $("#warning").hide();
   $("#notice").hide();
}

function calculate() {
   var results = $('#results');

   if (typeof window.tables == "undefined") {
      setError("please wait a second or so for the decompression tables " +
       "to finish downloading");
      return;
   }

   var d1 = $('#dive-1 .depth').val();
   var m1 = $('#dive-1 .minutes').val();
   var m2 = $('#dive-2 .minutes').val();
   var d2 = $('#dive-2 .depth').val();

   var matched = window.tables[0].columns.filter(function(col) {
      return col.depth == parseInt(d1);
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
   m1 = parseInt(m1);
   var max = dive1col.rows[dive1col.rows.length - 1].min;

   if (isNaN(m1) || m1 < 1 || m1 > max) {
      setError('value for dive-1 minutes must be greater than or equal to ' +
       '1 and less than or equal to ' + max);
      return;
   }

   var row = null;
   if (m1 > 0 && m1 < dive1col.rows[0].min) {
      row = dive1col.rows[0];
   }
   
   for (var i = 0; !row && i < dive1col.rows.length - 1; ++i) {
      if (m1 >= dive1col.rows[i].min) {
         if (m1 < dive1col.rows[i+1].min) {
            if (m1 == dive1col.rows[i].min) {
               row = dive1col.rows[i];
            } else { // greater than; round up
               row = dive1col.rows[i+1];
            }
         } else if (i == dive1col.rows.length - 2) {
            if (m1 != dive1col.rows[i+1].min) {
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

   if (row.min != m1) {
      var note = 'rounded dive 1 minutes from ' + m1 + ' to ' + row.min;
   }

   if (row.ss) {
      var warning = 'you must take a saftey-stop for 3min at 15ft after your ' +
       'first dive';
   }

   if (row.limit) {
      var warning = 'you hit a no-decompression limit! ' +
       'You must take a saftey-stop for 8min at 15ft, and remain ' +
       'out of the water for 6hours after surfacing';
   }

   setResults('After dive 1, you will be in group ' +
    String.fromCharCode('A'.charCodeAt(0) + group) + '.', note, warning);

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
}