const fs = require('fs');
let content = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const updateAndImport = `
    if (action === 'update_dcu') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['DCU', 'dcu']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Sheet DCU not found' })).setMimeType(ContentService.MimeType.JSON);
       
       var data = payload.data;
       var lastRow = sheet.getLastRow();
       if (lastRow < 2) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No data' })).setMimeType(ContentService.MimeType.JSON);
       
       var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
       var idCol = -1;
       var xCol = -1, yCol = -1, imgCol = -1, noteCol = -1, userCol = -1;
       for (var c = 0; c < headers.length; c++) {
           var h = String(headers[c]).toLowerCase().trim();
           if (h === 'id') idCol = c;
           else if (h === 'tọa độ x' || h === 'toạ độ x' || h === 'vĩ độ' || h === 'tọa độx' || h === 'toạ độx') xCol = c;
           else if (h === 'tọa độ y' || h === 'toạ độ y' || h === 'kinh độ' || h === 'tọa độy' || h === 'toạ độy') yCol = c;
           else if (h === 'hình ảnh' || h === 'hinh anh' || h === 'ảnh' || h === 'hinhảnh') imgCol = c;
           else if (h === 'ghi chú' || h === 'ghi chu') noteCol = c;
           else if (h === 'user' || h === 'người cập nhật' || h === 'nguoi cap nhat') userCol = c;
       }
       
       if (userCol === -1) {
           userCol = headers.length;
           sheet.getRange(1, userCol + 1).setValue('User');
       }
       
       var sheetData = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
       var updated = false;
       for (var r = 0; r < sheetData.length; r++) {
           if (String(sheetData[r][idCol]).trim() === String(data.id).trim()) {
               if (xCol > -1) sheet.getRange(r + 2, xCol + 1).setValue(data.toadoX || '');
               if (yCol > -1) sheet.getRange(r + 2, yCol + 1).setValue(data.toadoY || '');
               if (imgCol > -1) sheet.getRange(r + 2, imgCol + 1).setValue(data.hinhAnh || '');
               if (noteCol > -1) sheet.getRange(r + 2, noteCol + 1).setValue(data.ghiChu || '');
               sheet.getRange(r + 2, userCol + 1).setValue(data.user || '');
               updated = true;
               break;
           }
       }
       
       if (updated) {
           return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
       } else {
           return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Not found ID' })).setMimeType(ContentService.MimeType.JSON);
       }
    }

    if (action === 'import_dcu') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['DCU', 'dcu']);
       if (!sheet) {
           sheet = ss.insertSheet('DCU');
           sheet.appendRow(['STT', 'ID', 'Tên', 'Địa chỉ', 'Tọa độ X', 'Tọa độ Y', 'Hình ảnh', 'Ghi chú', 'User']);
       }
       
       var dataList = payload.data;
       if (!dataList || dataList.length === 0) {
           return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No data to import' })).setMimeType(ContentService.MimeType.JSON);
       }
       
       var lastRow = sheet.getLastRow();
       var headers = [];
       if (lastRow > 0) {
           headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
       }
       
       if (headers.length === 0) {
           headers = ['stt', 'id', 'tên', 'địa chỉ', 'tọa độ x', 'tọa độ y', 'hình ảnh', 'ghi chú', 'user'];
           sheet.appendRow(['STT', 'ID', 'Tên', 'Địa chỉ', 'Tọa độ X', 'Tọa độ Y', 'Hình ảnh', 'Ghi chú', 'User']);
           lastRow = 1;
       }
       
       var nextStt = lastRow > 1 ? lastRow : 1;
       var newRows = [];
       
       for (var d = 0; d < dataList.length; d++) {
           var data = dataList[d];
           var newRow = new Array(headers.length).fill('');
           for (var i = 0; i < headers.length; i++) {
               var h = headers[i];
               if (h === 'tt' || h === 'stt' || h === 'số tt' || h === 'sott' || h === 'so tt') newRow[i] = nextStt;
               else if (h === 'id') newRow[i] = data.id || '';
               else if (h === 'tên' || h === 'ten' || h === 'tên dcu') newRow[i] = data.ten || '';
               else if (h === 'địa chỉ' || h === 'dia chi') newRow[i] = data.diaChi || '';
           }
           newRows.push(newRow);
           nextStt++;
       }
       
       sheet.getRange(lastRow + 1, 1, newRows.length, headers.length).setValues(newRows);
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
`;

content = content.replace(/if \(action === 'add_dcu'\)/, updateAndImport + "\n    if (action === 'add_dcu')");
fs.writeFileSync('src/components/ConfigModal.tsx', content, 'utf8');
console.log('Added app script actions');
