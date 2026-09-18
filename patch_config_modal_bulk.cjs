const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const injectionXulydoxa = `    if (action === 'delete_xulydoxa_bulk') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['XuLyDoXa', 'Xu Ly Do Xa', 'Xử lý đo xa']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
       
       var maDdList = payload.data; // Array of maDd strings
       var sheetData = sheet.getDataRange().getValues();
       var headers = sheetData[0] || [];
       var maDdCol = -1;
       for (var c = 0; c < headers.length; c++) {
           var h = String(headers[c]).toLowerCase().trim();
           h = h.normalize('NFD').replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");
           if (h === 'madd') maDdCol = c;
       }
       
       if (maDdCol === -1) return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'No maDd col'})).setMimeType(ContentService.MimeType.JSON);
       
       // delete from bottom to top
       for (var r = sheetData.length - 1; r > 0; r--) {
           var val = String(sheetData[r][maDdCol]).trim();
           if (maDdList.indexOf(val) !== -1) {
               sheet.deleteRow(r + 1);
           }
       }
       return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
    }`;

const injectionDcu = `    if (action === 'delete_dcu_bulk') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['DCU', 'dcu']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
       
       var idList = payload.data; // Array of id strings
       var sheetData = sheet.getDataRange().getValues();
       var headers = sheetData[0] || [];
       var idCol = -1;
       for (var c = 0; c < headers.length; c++) {
           var h = String(headers[c]).toLowerCase().trim();
           if (h === 'id') idCol = c;
       }
       
       if (idCol === -1) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
       
       for (var r = sheetData.length - 1; r > 0; r--) {
           var val = String(sheetData[r][idCol]).trim();
           if (idList.indexOf(val) !== -1) {
               sheet.deleteRow(r + 1);
           }
       }
       return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
    }`;

code = code.replace("if (action === 'update_xulydoxa') {", injectionXulydoxa + "\\n\\n    if (action === 'update_xulydoxa') {");
code = code.replace("if (action === 'update_dcu') {", injectionDcu + "\\n\\n    if (action === 'update_dcu') {");

fs.writeFileSync('src/components/ConfigModal.tsx', code);
