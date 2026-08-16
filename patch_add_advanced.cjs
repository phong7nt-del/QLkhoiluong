const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const oldLogic = `      var dateParts = data.date.split('-'); // data.date format: YYYY-MM-DD
      var targetDateStr = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0]; // DD/MM/YYYY
      var targetDateStrAlt = dateParts[2] + '/' + dateParts[1]; // DD/MM
      
      var dateColIndex = -1;
      for (var i = 0; i < headers.length; i++) {
         var h = headers[i];
         var cellDateStr = '';
         if (Object.prototype.toString.call(h) === '[object Date]') {
            cellDateStr = Utilities.formatDate(h, Session.getScriptTimeZone(), "dd/MM/yyyy");
         } else {
            cellDateStr = String(h).trim();
         }
         
         if (cellDateStr === targetDateStr || cellDateStr === targetDateStrAlt || cellDateStr === data.date) {
            dateColIndex = i;
            break;
         }
      }`;

const newLogic = `      var dateParts = data.date.split('-'); // data.date format: YYYY-MM-DD
      var targetDateStr = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0]; // DD/MM/YYYY
      var targetDateStrAlt = dateParts[2] + '/' + dateParts[1]; // DD/MM
      
      var stripZero = function(s) { return String(s).replace(/(^|\\/)0+(\\d)/g, '$1$2'); };
      var cleanTarget = stripZero(targetDateStr);
      var cleanTargetAlt = stripZero(targetDateStrAlt);
      
      var dateColIndex = -1;
      for (var i = 0; i < headers.length; i++) {
         var h = headers[i];
         var cellDateStr = '';
         if (Object.prototype.toString.call(h) === '[object Date]') {
            cellDateStr = Utilities.formatDate(h, Session.getScriptTimeZone(), "dd/MM/yyyy");
         } else {
            cellDateStr = String(h).trim();
         }
         
         var cleanCell = stripZero(cellDateStr);
         if (cleanCell === cleanTarget || cleanCell === cleanTargetAlt || cleanCell === stripZero(data.date) || cellDateStr.includes(targetDateStrAlt) || cleanCell.includes(cleanTargetAlt)) {
            dateColIndex = i;
            break;
         }
      }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
console.log("Patched add logic successfully");
