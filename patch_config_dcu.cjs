const fs = require('fs');
let content = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const strToReplace = `    if (action === 'add_dcu') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['DCU', 'dcu']);
       if (!sheet) {
           sheet = ss.insertSheet('DCU');
           sheet.appendRow(['STT', 'ID', 'Tên', 'Tọa độ X', 'Tọa độ Y', 'Hình ảnh', 'Ghi chú']);
       }
       var data = payload.data;
       var lastRow = sheet.getLastRow();
       var headers = [];
       if (lastRow > 0) {
           headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
       }
       
       if (headers.length === 0) {
           headers = ['stt', 'id', 'tên', 'tọa độ x', 'tọa độ y', 'hình ảnh', 'ghi chú'];
           sheet.appendRow(['STT', 'ID', 'Tên', 'Tọa độ X', 'Tọa độ Y', 'Hình ảnh', 'Ghi chú']);
       }

       var nextStt = lastRow > 0 ? lastRow : 1;
       var newRow = new Array(headers.length).fill('');
       
       for (var i = 0; i < headers.length; i++) {
           var h = headers[i];
           if (h === 'stt') newRow[i] = nextStt;
           else if (h === 'id') newRow[i] = data.id || '';
           else if (h === 'tên' || h === 'ten' || h === 'tên dcu') newRow[i] = data.ten || '';
           else if (h === 'tọa độ x' || h === 'toạ độ x' || h === 'vĩ độ') newRow[i] = data.toadoX || '';
           else if (h === 'tọa độ y' || h === 'toạ độ y' || h === 'kinh độ') newRow[i] = data.toadoY || '';
           else if (h === 'hình ảnh' || h === 'hinh anh' || h === 'ảnh') newRow[i] = data.hinhAnh || '';
           else if (h === 'ghi chú' || h === 'ghi chu') newRow[i] = data.ghiChu || '';
       }
       
       sheet.appendRow(newRow);
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }`;

const newStr = `    if (action === 'add_dcu') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['DCU', 'dcu']);
       if (!sheet) {
           sheet = ss.insertSheet('DCU');
           sheet.appendRow(['STT', 'ID', 'Tên', 'Địa chỉ', 'Tọa độ X', 'Tọa độ Y', 'Hình ảnh', 'Ghi chú']);
       }
       var data = payload.data;
       var lastRow = sheet.getLastRow();
       var headers = [];
       if (lastRow > 0) {
           headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
       }
       
       if (headers.length === 0) {
           headers = ['stt', 'id', 'tên', 'địa chỉ', 'tọa độ x', 'tọa độ y', 'hình ảnh', 'ghi chú'];
           sheet.appendRow(['STT', 'ID', 'Tên', 'Địa chỉ', 'Tọa độ X', 'Tọa độ Y', 'Hình ảnh', 'Ghi chú']);
       }

       var nextStt = lastRow > 0 ? lastRow : 1;
       var newRow = new Array(headers.length).fill('');
       
       for (var i = 0; i < headers.length; i++) {
           var h = headers[i];
           if (h === 'stt') newRow[i] = nextStt;
           else if (h === 'id') newRow[i] = data.id || '';
           else if (h === 'tên' || h === 'ten' || h === 'tên dcu') newRow[i] = data.ten || '';
           else if (h === 'địa chỉ' || h === 'dia chi') newRow[i] = data.diaChi || '';
           else if (h === 'tọa độ x' || h === 'toạ độ x' || h === 'vĩ độ') newRow[i] = data.toadoX || '';
           else if (h === 'tọa độ y' || h === 'toạ độ y' || h === 'kinh độ') newRow[i] = data.toadoY || '';
           else if (h === 'hình ảnh' || h === 'hinh anh' || h === 'ảnh') newRow[i] = data.hinhAnh || '';
           else if (h === 'ghi chú' || h === 'ghi chu') newRow[i] = data.ghiChu || '';
       }
       
       sheet.appendRow(newRow);
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }`;

content = content.replace(strToReplace, newStr);
fs.writeFileSync('src/components/ConfigModal.tsx', content, 'utf8');
console.log('Patched ConfigModal add_dcu');
