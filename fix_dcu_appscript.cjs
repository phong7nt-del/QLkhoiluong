const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const regex = /if \(action === 'add_dcu'\) \{[\s\S]*?(var nextStt =)/;

// I'll just rely on the DataStore since we already edited ConfigModal with the same content! Wait, the google apps script is inside ConfigModal.tsx, I should apply the duplicate check there too!

const newAppScriptCheck = `if (action === 'add_dcu') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['DCU', 'dcu']);
       if (!sheet) {
           sheet = ss.insertSheet('DCU');
           sheet.appendRow(['STT', 'ID', 'Tên', 'Địa chỉ', 'Tọa độ X', 'Tọa độ Y', 'Hình ảnh', 'Ghi chú', 'User']);
       }
       var data = payload.data;
       var lastRow = sheet.getLastRow();
       
       if (lastRow > 1) {
           var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
           var idIndex = headers.indexOf('id');
           if (idIndex > -1) {
               var existingIds = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues().map(function(r) { return String(r[0]).trim(); });
               if (data.id && existingIds.indexOf(String(data.id).trim()) > -1) {
                   return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'ID đã tồn tại. Không thể thêm mới.' })).setMimeType(ContentService.MimeType.JSON);
               }
           }
       }
       
       var headers = [];`;

code = code.replace(/if \(action === 'add_dcu'\) \{[\s\S]*?var headers = \[\];/m, newAppScriptCheck);
fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
