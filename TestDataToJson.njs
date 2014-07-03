var fs = require('fs');
var assert = require('assert');
var CsvToArray = require('./CsvToArray.njs');

if (require.main === module) {
   var testDataObj = testDataToObj(
    CsvToArray(fs.readFileSync('./test_data.csv').toString()));
   fs.writeFile('./test_data.json', testDataObj);
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
         depth1      : strToBool(row[12]),
         depth2      : strToBool(row[13]),
         min1        : strToBool(row[14]),
         min2        : strToBool(row[15])
      };

      if (!anyErrors()) {
         test.expectedErrors = false;
         test.expectedOutput= {
            minTime_clear  : strToTime(row[5]),
            minTime_ss     : strToTime(row[6]),
            minTime_limit  : strToTime(row[7]),
            dive1SS        : strToBool(row[8]),
            dive1Limit     : strToBool(row[9]),
            dive1Min       : strToTime(row[10])
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
      return errors.depth1 || errors.depth2 || errors.min1 || errors.min2;
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
      return Number.POSITIVE_INFINITY;
   } else {
      var matches = str.match(/^((\d*)h){0,1}(\d*)m$/);
      assert(matches.length > 0);

      var hour = typeof matches[2] === 'undefined' ? 0 : parseInt(matches[2]);
      var min = parseInt(matches[3]);

      return hour * 60 + min;
   }
}
