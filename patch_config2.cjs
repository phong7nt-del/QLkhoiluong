const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const oldHeaderMatch = `       var data = payload.data;
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
       }`;

const newHeaderMatch = `       var data = payload.data;
       var sheetDataDisplay = sheet.getDataRange().getDisplayValues(); // Get as string
       
       var loaiXlCol = -1, nguoiXlCol = -1, thoiGianXlCol = -1, maDdCol = -1, cachXlCol = -1, ketQuaCol = -1, ghiChuCol = -1;
       var headerRowIdx = 0;
       
       // Scan first 5 rows for headers
       for (var rIdx = 0; rIdx < Math.min(5, sheetDataDisplay.length); rIdx++) {
           var tempHeaders = sheetDataDisplay[rIdx] || [];
           var tempMaDdCol = -1, tempThoiGianCol = -1;
           for (var c = 0; c < tempHeaders.length; c++) {
               var h = String(tempHeaders[c]).toLowerCase().replace(/[\\s_]+/g, '');
               if (h === 'madd' || h === 'mãđđ' || h === 'mãdd') tempMaDdCol = c;
               else if (h === 'thoigianxl' || h === 'thờigianxl') tempThoiGianCol = c;
           }
           if (tempMaDdCol > -1) {
               headerRowIdx = rIdx;
               break;
           }
       }
       
       var headers = sheetDataDisplay[headerRowIdx] || [];
       for (var c = 0; c < headers.length; c++) {
           var h = String(headers[c]).toLowerCase().replace(/[\\s_]+/g, '');
           if (h === 'loaixl' || h === 'loạixl') loaiXlCol = c;
           else if (h === 'nguoixl' || h === 'ngườixl') nguoiXlCol = c;
           else if (h === 'thoigianxl' || h === 'thờigianxl') thoiGianXlCol = c;
           else if (h === 'madd' || h === 'mãđđ' || h === 'mãdd') maDdCol = c;
           else if (h === 'cachxl' || h === 'cáchxl') cachXlCol = c;
           else if (h === 'ketqua' || h === 'kếtquả') ketQuaCol = c;
           else if (h === 'ghichu' || h === 'ghichú') ghiChuCol = c;
       }`;

code = code.replace(oldHeaderMatch, newHeaderMatch);

const oldFail = `       }
       return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Không tìm thấy mã ĐĐ: ' + inputMaDd })).setMimeType(ContentService.MimeType.JSON);`;

const newFail = `       }
       if (maDdCol === -1 || thoiGianXlCol === -1) {
           return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Lỗi cấu trúc Sheet: maDdCol=' + maDdCol + ', thoiGianCol=' + thoiGianXlCol + '. Các cột tìm thấy: ' + headers.join(', ') })).setMimeType(ContentService.MimeType.JSON);
       }
       return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Không tìm thấy mã ĐĐ: ' + inputMaDd + ' trong ' + (sheetDataDisplay.length - headerRowIdx - 1) + ' dòng (bỏ qua ' + headerRowIdx + ' dòng đầu).' })).setMimeType(ContentService.MimeType.JSON);`;

code = code.replace(oldFail, newFail);

// Ensure the loop for data starts AFTER headerRowIdx
const oldLoopStart = `          for (var r = 1; r < sheetDataDisplay.length; r++) {`;
const newLoopStart = `          for (var r = headerRowIdx + 1; r < sheetDataDisplay.length; r++) {`;
code = code.replace(oldLoopStart, newLoopStart);

fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
