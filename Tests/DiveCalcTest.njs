var   assert = require('assert'),
      fs = require('fs'),
      async = require('async');

fs.readFile('DiveCalc.js', {'encoding': 'utf-8'}, function onFile(err, data) {
});

function DiveCalcTest() {
   async.map(['Error.js', 'decompression_tables.json', 'DiveCalc.js'],
    fs.readFile, function loadResources(err, buffers) {
      if (err) {
         throw err;
      }

      eval.call(global, buffers[0].toString());
      var tablesJson = buffers[1].toString();
      eval.call(global, buffers[2].toString());
      this.diveCalc = new global.DiveCalc(tablesJson, false);

      this.run();
   }.bind(this));
}

DiveCalcTest.prototype.run = run;
DiveCalcTest.prototype.test = test;

function test(input, output, errors) {
   try {
      var result = this.diveCalc.calcWaitTime.apply(this.diveCalc,
       Object.keys(input).map(function toVal(key) { return input[key];}));
   } catch (e) {
      var unexpected = false;
      if (typeof errors === 'undefined') {
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
         console.log('\nTest failed (unexpected error)');
         process.stdout.write('input: ');
         console.log(input);
         throw e;
      }
   }

   assert.deepEqual(result, output);
   process.stdout.write('.');
}

function run() {
   this.test({d1_min: 38, d1_depth: 35, d2_min: 34, d2_depth: 60},
    {minutes_clear: 54, minutes_ss: 7, minutes_limit: 0, dive1_ss: false,
    dive1_limit: false, dive1_actual_min: 40});
    console.log('\nAll tests passed.');
}

var test = new DiveCalcTest();
