const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const newCode = `
    if (action === 'add_xulydoxa_bulk') {
       var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
       var sheet = getSheetFlexibly(ss, ['XuLyDoXa', 'Xu Ly Do Xa', 'Xử lý đo xa']);
       if (!sheet) {
           sheet = ss.insertSheet('XuLyDoXa');
           sheet.appendRow(['STT', 'Loại XL', 'Người XL', 'Thời gian XL', 'Mã DD', 'Cách XL', 'Kết quả', 'Ghi chú']);
       }
       var dataList = payload.data;
       if (!Array.isArray(dataList)) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
       
       var lastRow = sheet.getLastRow();
       var nextStt = lastRow;
       
       var rows = [];
       for (var i = 0; i < dataList.length; i++) {
          var d = dataList[i];
          rows.push([
             nextStt + i,
             d.loaiXl || '',
             d.nguoiXl || '',
             d.thoiGianXl || '',
             d.maDd || '',
             d.cachXl || '',
             d.ketQua || '',
             d.ghiChu || ''
          ]);
       }
       
       if (rows.length > 0) {
          sheet.getRange(lastRow + 1, 1, rows.length, 8).setValues(rows);
       }
       
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'update_xulydoxa') {
       var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
       var sheet = getSheetFlexibly(ss, ['XuLyDoXa', 'Xu Ly Do Xa', 'Xử lý đo xa']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
       
       var data = payload.data;
       var sheetData = sheet.getDataRange().getValues();
       var headers = sheetData[0] || [];
       
       var sttCol = -1, loaiXlCol = -1, nguoiXlCol = -1, thoiGianXlCol = -1, maDdCol = -1, cachXlCol = -1, ketQuaCol = -1, ghiChuCol = -1;
       
       for (var c = 0; c < headers.length; c++) {
           var h = String(headers[c]).toLowerCase().replace(/[\\s_]+/g, '');
           if (h === 'stt') sttCol = c;
           else if (h === 'loaixl' || h === 'loạixl') loaiXlCol = c;
           else if (h === 'nguoixl' || h === 'ngườixl') nguoiXlCol = c;
           else if (h === 'thoigianxl' || h === 'thờigianxl') thoiGianXlCol = c;
           else if (h === 'madd' || h === 'mãđđ' || h === 'mãdd') maDdCol = c;
           else if (h === 'cachxl' || h === 'cáchxl') cachXlCol = c;
           else if (h === 'ketqua' || h === 'kếtquả') ketQuaCol = c;
           else if (h === 'ghichu' || h === 'ghichú') ghiChuCol = c;
       }
       
       if (sttCol > -1 && data.stt) {
          for (var r = 1; r < sheetData.length; r++) {
              if (String(sheetData[r][sttCol]).trim() === String(data.stt).trim()) {
                  if (loaiXlCol > -1 && data.loaiXl !== undefined) sheet.getRange(r + 1, loaiXlCol + 1).setValue(data.loaiXl);
                  if (nguoiXlCol > -1 && data.nguoiXl !== undefined) sheet.getRange(r + 1, nguoiXlCol + 1).setValue(data.nguoiXl);
                  if (thoiGianXlCol > -1 && data.thoiGianXl !== undefined) sheet.getRange(r + 1, thoiGianXlCol + 1).setValue(data.thoiGianXl);
                  if (maDdCol > -1 && data.maDd !== undefined) sheet.getRange(r + 1, maDdCol + 1).setValue(data.maDd);
                  if (cachXlCol > -1 && data.cachXl !== undefined) sheet.getRange(r + 1, cachXlCol + 1).setValue(data.cachXl);
                  if (ketQuaCol > -1 && data.ketQua !== undefined) sheet.getRange(r + 1, ketQuaCol + 1).setValue(data.ketQua);
                  if (ghiChuCol > -1 && data.ghiChu !== undefined) sheet.getRange(r + 1, ghiChuCol + 1).setValue(data.ghiChu);
                  
                  return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
              }
          }
       }
       return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Not found' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'update_sangtai_bulk') {`;

code = code.replace("    if (action === 'update_sangtai_bulk') {", newCode);

fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
