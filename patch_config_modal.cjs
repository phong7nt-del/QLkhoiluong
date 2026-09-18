const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const target = `       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);\n    }\n\n    if (action === 'update_sangtai') {`;

const injection = `       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'delete_tuti') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['TUTI', 'Tuti', 'TuTi', 'tu ti']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
       
       var sheetData = sheet.getDataRange().getValues();
       var headers = sheetData[0] || [];
       var hm = {};
       for (var c = 0; c < headers.length; c++) {
          var rawH = String(headers[c]).toLowerCase().trim();
          var h = rawH.normalize('NFD').replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/\\s+/g, ' ');
          if (h === 'ma tram') hm.maTramCol = c;
          if (h === 'ten diem do' || h === 'ten tram') hm.tenDiemDoCol = c;
       }
       
       var targetRow = -1;
       var data = payload.data;
       if (data.maTram && data.tenDiemDo) {
          for (var r = 1; r < sheetData.length; r++) {
             if (hm.maTramCol !== undefined && hm.tenDiemDoCol !== undefined &&
                 String(sheetData[r][hm.maTramCol]).trim() === String(data.maTram).trim() &&
                 String(sheetData[r][hm.tenDiemDoCol]).trim() === String(data.tenDiemDo).trim()) {
                 targetRow = r; break;
             }
          }
       }
       
       if (targetRow !== -1) {
          sheet.deleteRow(targetRow + 1);
       }
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'update_sangtai') {`;

code = code.replace(target, injection);
fs.writeFileSync('src/components/ConfigModal.tsx', code);
