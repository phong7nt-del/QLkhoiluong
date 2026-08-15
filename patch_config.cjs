const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const oldFunc = `       function normalizeDateStr(dStr) {
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
       }`;

const newFunc = `       function normalizeDateStr(dStr) {
           if (!dStr) return '';
           var s = String(dStr).trim().split(' ')[0];
           if (s.indexOf('T') !== -1) s = s.split('T')[0];
           var parts = s.indexOf('-') !== -1 ? s.split('-') : s.split('/');
           if (parts.length >= 3) {
               var d, m, y;
               if (parts[0].length === 4) { y = parts[0]; m = parts[1]; d = parts[2]; } 
               else { d = parts[0]; m = parts[1]; y = parts[2]; }
               d = parseInt(d, 10); m = parseInt(m, 10);
               if (m > 12 && d <= 12) { var tmp = m; m = d; d = tmp; }
               return (d < 10 ? '0'+d : ''+d) + '/' + (m < 10 ? '0'+m : ''+m) + '/' + y;
           }
           return s;
       }`;

code = code.replace(oldFunc, newFunc);

const oldLoop = `       if (maDdCol > -1 && thoiGianXlCol > -1 && data.maDd) {
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
       return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Not found: ' + inputMaDd + ' at ' + inputDateStr })).setMimeType(ContentService.MimeType.JSON);`;

const newLoop = `       if (maDdCol > -1 && thoiGianXlCol > -1 && data.maDd) {
          var seenDates = [];
          for (var r = 1; r < sheetDataDisplay.length; r++) {
              var rMaDd = String(sheetDataDisplay[r][maDdCol]).trim().toLowerCase();
              var rawDate = String(sheetDataDisplay[r][thoiGianXlCol]);
              var rDateStr = normalizeDateStr(rawDate);
              
              if (rMaDd === inputMaDd) {
                  seenDates.push(rawDate + " => " + rDateStr);
              }
              
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
          if (seenDates.length > 0) {
             return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Mã ĐĐ có tồn tại, nhưng sai ngày. Của bạn gửi: ' + inputDateStr + '. Trên sheet là: ' + seenDates.join(', ') })).setMimeType(ContentService.MimeType.JSON);
          }
       }
       return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Không tìm thấy mã ĐĐ: ' + inputMaDd })).setMimeType(ContentService.MimeType.JSON);`;

code = code.replace(oldLoop, newLoop);

fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
