const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const oldUpdateBlock = /if \\(action === 'update_xulydoxa'\\) \\{[\\s\\S]*?return ContentService\\.createTextOutput\\(JSON\\.stringify\\(\\{ status: 'error', message: 'Not found' \\}\\)\\)\\.setMimeType\\(ContentService\\.MimeType\\.JSON\\);\\n    \\}/;

const newUpdateBlock = `if (action === 'update_xulydoxa') {
       var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
       var sheet = getSheetFlexibly(ss, ['XuLyDoXa', 'Xu Ly Do Xa', 'Xử lý đo xa']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
       
       var data = payload.data;
       var sheetData = sheet.getDataRange().getValues();
       var headers = sheetData[0] || [];
       
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
       
       if (maDdCol > -1 && thoiGianXlCol > -1 && data.maDd) {
          for (var r = 1; r < sheetData.length; r++) {
              var rMaDd = String(sheetData[r][maDdCol]).trim();
              var rThoiGian = String(sheetData[r][thoiGianXlCol]).trim();
              
              if (rMaDd === String(data.maDd).trim() && rThoiGian === String(data.thoiGianXl).trim()) {
                  if (loaiXlCol > -1 && data.loaiXl !== undefined) sheet.getRange(r + 1, loaiXlCol + 1).setValue(data.loaiXl);
                  if (nguoiXlCol > -1 && data.nguoiXl !== undefined) sheet.getRange(r + 1, nguoiXlCol + 1).setValue(data.nguoiXl);
                  // We don't update thoiGianXl because it's our match key, but we could
                  if (cachXlCol > -1 && data.cachXl !== undefined) sheet.getRange(r + 1, cachXlCol + 1).setValue(data.cachXl);
                  if (ketQuaCol > -1 && data.ketQua !== undefined) sheet.getRange(r + 1, ketQuaCol + 1).setValue(data.ketQua);
                  if (ghiChuCol > -1 && data.ghiChu !== undefined) sheet.getRange(r + 1, ghiChuCol + 1).setValue(data.ghiChu);
                  
                  return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
              }
          }
       }
       return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Not found' })).setMimeType(ContentService.MimeType.JSON);
    }`;

code = code.replace(oldUpdateBlock, newUpdateBlock);
fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
