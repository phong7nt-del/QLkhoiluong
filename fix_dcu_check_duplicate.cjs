const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

code = code.replace(
    /if \(action === 'add_dcu'\) \{/g,
    "if (action === 'add_dcu') {\\n       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));\\n       var sheet = getSheetFlexibly(ss, ['DCU', 'dcu']);\\n       if (sheet) {\\n           var data = payload.data;\\n           var lastRow = sheet.getLastRow();\\n           if (lastRow > 1) {\\n               var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });\\n               var idIndex = headers.indexOf('id');\\n               if (idIndex > -1) {\\n                   var existingIds = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues().map(function(r) { return String(r[0]).trim(); });\\n                   if (data.id && existingIds.indexOf(String(data.id).trim()) > -1) {\\n                       return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'ID đã tồn tại. Không thể thêm trùng lặp.' })).setMimeType(ContentService.MimeType.JSON);\\n                   }\\n               }\\n           }\\n       }"
);

fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
