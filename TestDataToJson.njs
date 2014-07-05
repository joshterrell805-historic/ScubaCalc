var fs = require('fs');
var assert = require('assert');
var CsvToArray = require('./CsvToArray.njs');

if (require.main === module) {
   var testDataObj = testDataToObj(
    CsvToArray(fs.readFileSync('./test_data.csv').toString()));
   fs.writeFile('./test_data.json', JSON.stringify(testDataObj));
}

function testDataToObj(testDataArray) {
   var startRow = 2; // the index where the first row of testing data is

   var tests = [];

   for (var rowIndex = startRow; rowIndex < testDataArray.length; ++rowIndex) {
      var row = testDataArray[rowIndex];

      // no more tests
      if (row[0] === '') {
         break;
      }

      var test = {
         description : row[0],
         input       : {
            min1        : row[1],
            depth1      : row[2],
            min2        : row[3],
            depth2      : row[4]
         },
      };

      var errors = {
         d1_depth      : strToBool(row[12]),
         d2_depth      : strToBool(row[13]),
         d1_min        : strToBool(row[14]),
         d2_min        : strToBool(row[15])
      };

      if (!anyErrors()) {
         test.expectedErrors = false;
         test.expectedOutput= {
            minutes_clear     : strToTime(row[5]),
            minutes_ss        : strToTime(row[6]),
            minutes_limit     : strToTime(row[7]),
            dive1_ss          : strToBool(row[8]),
            dive1_limit       : strToBool(row[9]),
            dive1_actual_min  : strToTime(row[10])
            /* groupAfterDive1 : 11 .. not used atm*/
         };
      } else {
         test.expectedErrors = errors;
         test.expectedOutput = false;
      }

      tests.push(test);
   }

   return tests;

   function anyErrors() {
      return errors.d1_depth || errors.d2_depth ||
       errors.d1_min || errors.d2_min;
   }
}

// our bool format (yes/no);
function strToBool(str) {
   if (str === 'yes') {
      return true;
   } else {
      assert.strictEqual(str, 'no');
      return false;
   }
}

// our string format to minutes (int)
// our string format for time is XhYm where X is a number (or nothing) and Y is
// a number
// or the string is 'inf'
function strToTime (str) {
   if (str === 'inf') {
      // JSON can't store NUMBER.POSTIVE_INFINITY
      // use null to denote infinity
      return null;
   } else {
      var matches = str.match(/^((\d*)h){0,1}(\d*)m$/);
      assert(matches.length > 0);

      var hour = typeof matches[2] === 'undefined' ? 0 : parseInt(matches[2]);
      var min = parseInt(matches[3]);

      return hour * 60 + min;
   }
}
