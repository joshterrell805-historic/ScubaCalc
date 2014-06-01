document.onready = function()
{
   $.get('decompression_tables.json', function(tables)
   {
      tables = JSON.parse(tables);

      var table = tables[1];
      console.log(table);
      $('.name').html(table.name);

      var tr = $('<tr></tr>');
      var th = $('<th></th>');
      tr.append(th);
      for (var i = 0; i < 26; ++i)
      {
         var th = $(
            '<th>' + String.fromCharCode('Z'.charCodeAt(0) - i) + '</th>'
         );
         tr.append(th);
      }

      $('#table2').append(tr);

      var altColor = false;
      for (var row = 0, c_start = 0; row < 26; ++row, ++c_start)
      {
         var tr = $('<tr></tr>');
         if (altColor)
         {
            tr.addClass('alt-row-color');
         }
         altColor = !altColor;
         for (var i = 0; i < c_start; ++i)
         {
            tr.append($('<td></td>'));
         }
         var td = $(
            '<td>' + String.fromCharCode('Z'.charCodeAt(0) - row) + '</td>'
         );
         td.addClass('letter');
         tr.append(td);

         for (var col = 0; col < 26 - c_start; ++col)
         {
            var cell = table.rows[row][col];
            var td = $('<td>' + cellToString(cell) + '</td>');
            tr.append(td);
         }

         $('#table2').prepend(tr);
      }
   });
};

function twoDigits(n)
{
   return (n / 10 < 1 ? "0" : "") + n;
}

function cellToString(cell)
{
   return cell.min.hour + ":" + twoDigits(cell.min.min) + "\n" +
      cell.max.hour + ":" + twoDigits(cell.max.min);
}
