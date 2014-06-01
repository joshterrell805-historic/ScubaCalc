var fs = require('fs');
var assert = require('assert');
var CsvToArray = require('./CsvToArray.njs');

if (require.main === module)
{
   var table1 = table1ToObject(
      CsvToArray(fs.readFileSync('./table1.csv').toString())
   );
   var table2 = table2ToObject(
      CsvToArray(fs.readFileSync('./table2.csv').toString())
   );
   var tables = [
      table1, table2
   ];
   tables = JSON.stringify(tables);
   fs.writeFile('./decompression_tables.json', tables);
}

function table2ToObject(table2Array)
{
   var table = {
      'name'    : table2Array[0][0],
      'rows' : []
   };

   assert(table.name);

   assert.strictEqual(table2Array[28][0], 'Z');
   assert.strictEqual(table2Array[29][26], 'A');
   assert.strictEqual(table2Array[3][25], 'A');

   for (var r = 28, c_start = 1; r >= 3 && c_start < 27; --r, ++c_start)
   {
      var row = [];
      for (var c = c_start; c < 27; ++c)
      {
         var str = table2Array[r][c];
         var col = {
            'min' : {
               'hour' : parseInt(str[0]),
               'min'  : parseInt(str.substr(2, 2))
            },
            'max' : {
               'hour' : parseInt(str[5]),
               'min'  : parseInt(str.substr(7, 2))
            }
         };
         row.push(col);
      }

      table.rows.push(row);
   }

   return table;
}

function table1ToObject(table1Array)
{
   var table = {
      'name'    : table1Array[0][0],
      'columns' : []
   };

   assert(table.name);

   var depths = table1Array[2];
   assert(depths.length > 1);
   assert.strictEqual(depths[0], '');

   for (var col = 1; col < depths.length; ++col)
   {
      var column = {
         'depth' : parseInt(depths[col]),
         'rows' : []
      };

      table.columns.push(column);

      for (var rowNumber = 3; rowNumber < table1Array.length; ++rowNumber)
      {
         var row = {};
         var min = table1Array[rowNumber][col];

         if (min[min.length - 1] === 's')
         {
            row.ss = true;
            min = min.slice(0, -1);
         }

         row.min = parseInt(min);

         column.rows.push(row);


         if (rowNumber + 1 == table1Array.length)
         {
            row.limit = true;
         }
         else if(table1Array[rowNumber+1][col] === '')
         {
            row.limit = true;
            break;
         }
      }
   }

   return table;
}
