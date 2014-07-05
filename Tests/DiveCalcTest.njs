var   assert = require('assert'),
      fs = require('fs'),
      async = require('async');

function DiveCalcTest() {
   this.debug = false;
   this.diveCalcDebug = false;

   async.map(['Error.js', 'decompression_tables.json', 'DiveCalc.js',
    'test_data.json'],
    fs.readFile, function loadResources(err, buffers) {
      if (err) {
         throw err;
      }

      eval.call(global, buffers[0].toString());
      var tablesJson = buffers[1].toString();
      eval.call(global, buffers[2].toString());
      this.diveCalc = new global.DiveCalc(tablesJson, this.diveCalcDebug);
      this.tests = JSON.parse(buffers[3].toString());
      this.tests.forEach(function testNullToInfinity(test) {
         // as noted in the TestDataToJson conversion utility, JSON
         // doesn't store Number.POSITIVE_INFINITY. Use null to denote
         // infinity, and convert it here before running tests.
         if (test.expectedOutput) {
            var keys = Object.keys(test.expectedOutput);
            keys.forEach(function outputNullToInfinity(key) {
               if (test.expectedOutput[key] === null) {
                  test.expectedOutput[key] = Number.POSITIVE_INFINITY;
               }
            });
         }
      });

      this.run();
   }.bind(this));
}

DiveCalcTest.prototype.run = run;
DiveCalcTest.prototype.test = test;

function test(input, output, errors) {
   if (this.debug) {
      console.log('input: ', input);
      console.log('output: ', output);
      console.log('errors: ', errors);
   }
   try {
      var result = this.diveCalc.calcWaitTime.apply(this.diveCalc,
       Object.keys(input).map(function toVal(key) { return input[key];}));
   } catch (e) {
      var unexpected = false;
      if (errors === false) {
         unexpected = true;
      } else {
         if (e instanceof InputError) {
            if (!errors[e.fieldName]) {
               unexpected = true;
            }
         } else {
            unexpected = true;
         }
      }

      if (unexpected) {
         throw e;
      }
   }

   assert.deepEqual(result, output);
   process.stdout.write('.');
}

function run() {
   var errors = [];

   this.tests.forEach(function(test) {
      try {
         this.test(test.input, test.expectedOutput, test.expectedErrors);
      } catch (e) {
         e.test = test;
         errors.push(e);
      }
   }.bind(this));
   
   if (errors.length) {
      console.log('\n');
      errors.forEach(function(e) {
         console.error('=====================================================');
         console.error(e.test);
         console.error('\n');
         console.error(e.stack);
      });
      console.log('\n\n');
      console.log(errors.length + '/' + this.tests.length + ' tests failed.');
   } else {
      console.log('\nAll tests passed!');
   }
}

var test = new DiveCalcTest();
