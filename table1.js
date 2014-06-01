document.onready = function()
{
   $.get('decompression_tables.json', function(tables)
   {
      tables = JSON.parse(tables);

      var table = tables[0];
      console.log(table);
      $('.name').html(table.name);

      var tr = $('<tr></tr>');
      var th = $('<th></th>');
      tr.append(th);
      table.columns.forEach(function(column)
      {
         var th = $('<th>' + column.depth + '</th>');
         tr.append(th);
      });

      $('#table1').append(tr);

      for (var row = 0; row < 26; ++row)
      {
         var tr = $('<tr></tr>');
         var td = $(
            '<td>' + String.fromCharCode('A'.charCodeAt(0) + row) + '</td>'
         );
         tr.append(td);

         for (var col = 0; col < table.columns.length; ++col)
         {
            if (row >= table.columns[col].rows.length)
            {
               var td = $('<td></td>');
            }
            else
            {
               var r = table.columns[col].rows[row];
               var td = $('<td>' + r.min + '</td>');
               r.ss && td.addClass('saftey-stop-required');
               r.limit && td.addClass('no-decompression-limit');
            }

            tr.append(td);
         }

         $('#table1').append(tr);
      }
   });
};
