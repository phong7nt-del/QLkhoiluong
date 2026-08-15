const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const oldCode = `      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'update_progress') {`;

const newCode = `      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'delete_workload_group') {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var sheet = getSheetFlexibly(ss, ['CongTac', 'Cong Tac', 'Công tác']);
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
      
      var dateColIndex = -1;
      for (var i = 0; i < headers.length; i++) {
         var h = headers[i];
         var cellDateStr = '';
         if (Object.prototype.toString.call(h) === '[object Date]') {
            cellDateStr = Utilities.formatDate(h, Session.getScriptTimeZone(), "dd/MM/yyyy");
         } else {
            cellDateStr = String(h).trim();
         }
         
         if (cellDateStr === targetDateStr || cellDateStr === targetDateStrAlt || cellDateStr === data.date) {
            dateColIndex = i;
            break;
         }
      }
      
      if (dateColIndex !== -1) {
          for (var m = 0; m < data.members.length; m++) {
              var memberName = data.members[m];
              var rowIndex = -1;
              for(var r = headerRowIndex + 1; r < sheetData.length; r++) {
                 if(String(sheetData[r][nameIdx]).trim() === memberName.trim()) {
                    rowIndex = r; break;
                 }
              }
              if (rowIndex !== -1) {
                  sheet.getRange(rowIndex + 1, dateColIndex + 1).setValue('');
              }
          }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'update_progress') {`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
