const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const startIndex = code.indexOf("if (action === 'update_xulydoxa') {");
const nextActionIndex = code.indexOf("if (action === 'update_sangtai_bulk') {", startIndex);

const newBlock = `if (action === 'update_xulydoxa') {
       var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
       var sheet = getSheetFlexibly(ss, ['XuLyDoXa', 'Xu Ly Do Xa', 'Xử lý đo xa']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Sheet not found'})).setMimeType(ContentService.MimeType.JSON);
       
       var data = payload.data;
       var sheetDataDisplay = sheet.getDataRange().getDisplayValues(); // Get as string
       var headers = sheetDataDisplay[0] || [];
       
       var loaiXlCol = -1, nguoiXlCol = -1, thoiGianXlCol = -1, maDdCol = -1, cachXlCol = -1, ketQuaCol = -1, ghiChuCol = -1;
       
       for (var c = 0; c < headers.length; c++) {
           var h = String(headers[c]).toLowerCase().replace(/[\\s_]+/g, '');
           if (h === 'loaixl' || h === 'loạixl') loaiXlCol = c;
           else if (h === 'nguoixl' || h === 'ngườixl') nguoiXlCol = c;
           else if (h === 'thoigianxl' || h === 'thờigianxl') thoiGianXlCol = c;
           else if (h === 'madd' || h === 'mãđđ' || h === 'mãdd') maDdCol = c;
           else if (h === 'cachxl' || h === 'cáchxl') cachXlCol = c;
           else if (h === 'ketqua' || h === 'kếtquả') ketQuaCol = c;
           else if (h === 'ghichu' || h === 'ghichú') ghiChuCol = c;
       }
       
       function normalizeDateStr(dStr) {
           if (!dStr) return '';
           var s = String(dStr).trim();
           var parts = s.indexOf('-') !== -1 ? s.split('-') : s.split('/');
           if (parts.length >= 3) {
               var d, m, y;
               if (parts[0].length === 4) { y = parts[0]; m = parts[1]; d = parts[2]; } 
               else { d = parts[0]; m = parts[1]; y = parts[2]; }
               d = parseInt(d, 10); m = parseInt(m, 10);
               return (d < 10 ? '0'+d : ''+d) + '/' + (m < 10 ? '0'+m : ''+m) + '/' + y;
           }
           return s;
       }
       
       var inputDateStr = normalizeDateStr(data.thoiGianXl);
       var inputMaDd = String(data.maDd).trim().toLowerCase();
       
       if (maDdCol > -1 && thoiGianXlCol > -1 && data.maDd) {
          for (var r = 1; r < sheetDataDisplay.length; r++) {
              var rMaDd = String(sheetDataDisplay[r][maDdCol]).trim().toLowerCase();
              var rDateStr = normalizeDateStr(sheetDataDisplay[r][thoiGianXlCol]);
              
              if (rMaDd === inputMaDd && rDateStr === inputDateStr) {
                  // Found! Update values
                  if (loaiXlCol > -1 && data.loaiXl !== undefined) sheet.getRange(r + 1, loaiXlCol + 1).setValue(data.loaiXl);
                  if (nguoiXlCol > -1 && data.nguoiXl !== undefined) sheet.getRange(r + 1, nguoiXlCol + 1).setValue(data.nguoiXl);
                  if (cachXlCol > -1 && data.cachXl !== undefined) sheet.getRange(r + 1, cachXlCol + 1).setValue(data.cachXl);
                  if (ketQuaCol > -1 && data.ketQua !== undefined) sheet.getRange(r + 1, ketQuaCol + 1).setValue(data.ketQua);
                  if (ghiChuCol > -1 && data.ghiChu !== undefined) sheet.getRange(r + 1, ghiChuCol + 1).setValue(data.ghiChu);
                  
                  return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
              }
          }
       }
       return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Not found: ' + inputMaDd + ' at ' + inputDateStr })).setMimeType(ContentService.MimeType.JSON);
    }

    `;

code = code.substring(0, startIndex) + newBlock + code.substring(nextActionIndex);
fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
