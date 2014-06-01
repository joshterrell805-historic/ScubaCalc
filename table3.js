document.onready = function()
{
   $.get('decompression_tables.json', function(tables)
   {
      tables = JSON.parse(tables);

      var table = tables[2];
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

      $('#table3').append(tr);

      table.rows.forEach(function(row)
      {
         var tr = $('<tr></tr>');
         var td = $('<td rowspan="2">' + row.depth + '</td>');
         tr.append(td);

         var tr_rnt = tr;
         tr_rnt.addClass('rnt');
         var tr_abt = $('<tr></tr>');
         tr_abt.addClass('abt');

         row.cols.forEach(function(col)
         {
            var rnt = col.rnt ? col.rnt : '';
            var abt = col.abt ? col.abt : '';
            tr_rnt.append($('<td>' + rnt + '</td>'));
            tr_abt.append($('<td>' + abt + '</td>'));
         });

         $('#table3').append(tr_rnt);
         $('#table3').append(tr_abt);
      });
   });
};
