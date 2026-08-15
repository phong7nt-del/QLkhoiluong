const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const oldHeaderMatch = `       // Scan first 5 rows for headers
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

const newHeaderMatch = `       function normalizeHeader(raw) {
           var s = String(raw).toLowerCase();
           if (s.normalize) {
               s = s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, "");
           }
           s = s.replace(/đ/g, "d");
           s = s.replace(/[^a-z0-9]/g, "");
           return s;
       }

       // Scan first 5 rows for headers
       for (var rIdx = 0; rIdx < Math.min(5, sheetDataDisplay.length); rIdx++) {
           var tempHeaders = sheetDataDisplay[rIdx] || [];
           var tempMaDdCol = -1, tempThoiGianCol = -1;
           for (var c = 0; c < tempHeaders.length; c++) {
               var h = normalizeHeader(tempHeaders[c]);
               if (h === 'madd') tempMaDdCol = c;
               else if (h === 'thoigianxl') tempThoiGianCol = c;
           }
           if (tempMaDdCol > -1) {
               headerRowIdx = rIdx;
               break;
           }
       }
       
       var headers = sheetDataDisplay[headerRowIdx] || [];
       for (var c = 0; c < headers.length; c++) {
           var h = normalizeHeader(headers[c]);
           if (h === 'loaixl') loaiXlCol = c;
           else if (h === 'nguoixl') nguoiXlCol = c;
           else if (h === 'thoigianxl') thoiGianXlCol = c;
           else if (h === 'madd') maDdCol = c;
           else if (h === 'cachxl') cachXlCol = c;
           else if (h === 'ketqua') ketQuaCol = c;
           else if (h === 'ghichu') ghiChuCol = c;
       }`;

code = code.replace(oldHeaderMatch, newHeaderMatch);
fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
