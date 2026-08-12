const fs = require('fs');

let content = fs.readFileSync('full-apps-script.js', 'utf8');

// 1. Add spreadsheetId to doGet response
content = content.replace(
    "return ContentService.createTextOutput(JSON.stringify({",
    "return ContentService.createTextOutput(JSON.stringify({ spreadsheetId: SPREADSHEET_ID, "
);

// 2. Add savePlan to doPost
const savePlanCode = `
    if (action === 'savePlan') {
       var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
       var sheet = getSheetFlexibly(ss, ['Nhật ký/CongTac', 'Nhat ky/CongTac', 'CongTac', 'Cong Tac', 'Công tác']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Not found'})).setMimeType(ContentService.MimeType.JSON);
       
       var data = sheet.getDataRange().getValues();
       var nameIdx = -1;
       var startRow = 1;
       for (var r = 0; r < 5 && r < data.length; r++) {
         for (var c = 0; c < data[r].length; c++) {
           var val = String(data[r][c]).toLowerCase().trim();
           if (val.includes('họ và tên') || val === 'họ tên') nameIdx = c;
         }
         if (nameIdx !== -1) { startRow = r + 1; break; }
       }
       if (nameIdx === -1) { nameIdx = 1; startRow = 2; }
       
       var dateCols = {};
       var headerRowIndex = startRow - 1;
       if (headerRowIndex >= 0) {
          var headers = data[headerRowIndex] || [];
          for (var c = nameIdx + 1; c < headers.length; c++) {
             var h = headers[c];
             var dateStr = '';
             if (Object.prototype.toString.call(h) === '[object Date]') {
                dateStr = Utilities.formatDate(h, Session.getScriptTimeZone(), "yyyy-MM-dd");
             } else {
                var s = String(h).replace(/'/g, '').trim();
                var p1 = s.split('/');
                if (p1.length === 3) {
                   dateStr = p1[2] + '-' + (p1[1].length===1?'0'+p1[1]:p1[1]) + '-' + (p1[0].length===1?'0'+p1[0]:p1[0]);
                } else if (p1.length === 2) {
                   var year = new Date().getFullYear();
                   dateStr = year + '-' + (p1[1].length===1?'0'+p1[1]:p1[1]) + '-' + (p1[0].length===1?'0'+p1[0]:p1[0]);
                } else if (s.indexOf('-') > -1) {
                   dateStr = s; 
                }
             }
             if (dateStr && dateStr.length >= 8 && dateStr.indexOf('-') > -1) {
                dateCols[dateStr] = c;
             }
          }
       }
       
       var workloads = payload.workloads || [];
       for (var i = 0; i < workloads.length; i++) {
          var wl = workloads[i];
          var dateCol = dateCols[wl.date];
          if (dateCol !== undefined) {
             for (var r = startRow; r < data.length; r++) {
                var rowName = String(data[r][nameIdx] || '').trim();
                if (rowName === wl.members[0]) {
                   sheet.getRange(r + 1, dateCol + 1).setValue(wl.content);
                   break;
                }
             }
          }
       }
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
`;

content = content.replace(
    "var action = payload.action;",
    "var action = payload.action;" + savePlanCode
);

fs.writeFileSync('full-apps-script.js', content, 'utf8');

