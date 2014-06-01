module.exports = toArray;

// returns array indexible by [row][col]
function toArray(csvString)
{
   var array = csvString.split('\n');
   array = array.map(function(rowString) {
      return rowString.split(',');
   });
   return array;
}
