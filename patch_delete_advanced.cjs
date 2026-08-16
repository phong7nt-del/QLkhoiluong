const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const newDeleteBlock = `    if (action === 'delete_workload_group') {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var sheet = getSheetFlexibly(ss, ['CongTac', 'Cong Tac', 'Công tác', 'Công Tác']);
      if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
      
      var data = payload.data;
      var sheetData = sheet.getDataRange().getValues();
      var nameIdx = -1;
      var headerRowIndex = -1;
      for (var r = 0; r < Math.min(5, sheetData.length); r++) {
        for (var c = 0; c < sheetData[r].length; c++) {
           var h = String(sheetData[r][c]).toLowerCase();
           if (h.includes('họ và tên') || h.includes('ho va ten')) {
              nameIdx = c; headerRowIndex = r; break;
           }
        }
        if (nameIdx !== -1) break;
      }
      if (nameIdx === -1) { nameIdx = 1; headerRowIndex = 1; }
      
      var headers = sheetData[headerRowIndex] || [];
      var dateParts = data.date.split('-');
      var targetDateStr = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
      var targetDateStrAlt = dateParts[2] + '/' + dateParts[1];
      
      var stripZero = function(s) { return String(s).replace(/(^|\\/)0+(\\d)/g, '$1$2'); };
      var cleanTarget = stripZero(targetDateStr);
      var cleanTargetAlt = stripZero(targetDateStrAlt);
      
      var dateColIndex = -1;
      for (var i = 0; i < headers.length; i++) {
         var h = headers[i];
         var cellDateStr = '';
         if (Object.prototype.toString.call(h) === '[object Date]') {
            cellDateStr = Utilities.formatDate(h, Session.getScriptTimeZone(), "dd/MM/yyyy");
         } else {
            cellDateStr = String(h).trim();
         }
         
         var cleanCell = stripZero(cellDateStr);
         if (cleanCell === cleanTarget || cleanCell === cleanTargetAlt || cleanCell === stripZero(data.date) || cellDateStr.includes(targetDateStrAlt) || cleanCell.includes(cleanTargetAlt)) {
            dateColIndex = i;
            break;
         }
      }
      
      if (dateColIndex !== -1) {
          var deletedCount = 0;
          for (var m = 0; m < data.members.length; m++) {
              var memberName = String(data.members[m]).trim().toLowerCase();
              var rowIndex = -1;
              for(var r = headerRowIndex + 1; r < sheetData.length; r++) {
                 var cellName = String(sheetData[r][nameIdx]).trim().toLowerCase();
                 if(cellName === memberName || cellName.includes(memberName) || memberName.includes(cellName)) {
                    rowIndex = r; break;
                 }
              }
              if (rowIndex !== -1) {
                  sheet.getRange(rowIndex + 1, dateColIndex + 1).setValue('');
                  deletedCount++;
              }
          }
          return ContentService.createTextOutput(JSON.stringify({ status: 'success', deleted: deletedCount, dateColIndex: dateColIndex })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', reason: 'date_not_found', headers: headers.map(String) })).setMimeType(ContentService.MimeType.JSON);
    }`;

// Replace the existing delete_workload_group block
let startIndex = code.indexOf("if (action === 'delete_workload_group') {");
let nextIndex = code.indexOf("if (action === 'update_progress') {", startIndex);
if (startIndex !== -1 && nextIndex !== -1) {
    code = code.substring(0, startIndex) + newDeleteBlock + "\n\n    " + code.substring(nextIndex);
    fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
    console.log("Patched delete logic successfully");
} else {
    console.log("Failed to find block");
}
