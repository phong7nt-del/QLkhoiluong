const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const oldLogic = `      var dateColIndex = -1;
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

const newLogic = `      var dateColIndex = -1;
      for (var i = 0; i < headers.length; i++) {
         var h = headers[i];
         var cellDateStr = '';
         if (Object.prototype.toString.call(h) === '[object Date]') {
            cellDateStr = Utilities.formatDate(h, Session.getScriptTimeZone(), "dd/MM/yyyy");
         } else {
            cellDateStr = String(h).trim();
         }
         
         if (cellDateStr === targetDateStr || cellDateStr === targetDateStrAlt || cellDateStr === data.date || cellDateStr.includes(targetDateStrAlt)) {
            dateColIndex = i;
            break;
         }
      }`;

// Only patch the second occurrence which is inside delete_workload_group
let parts = code.split("if (action === 'delete_workload_group') {");
if (parts.length === 2) {
    parts[1] = parts[1].replace(oldLogic, newLogic);
    code = parts.join("if (action === 'delete_workload_group') {");
    fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
    console.log("Patched successfully");
} else {
    console.log("Could not find delete_workload_group");
}
