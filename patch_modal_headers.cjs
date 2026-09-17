const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

code = code.replace(/var workloads = \[\];/, `var workloads = [];
      var headerRowDebug = data[startRow > 1 ? startRow - 2 : 0] || [];`);

code = code.replace(/return ContentService.createTextOutput\(JSON.stringify\(\{/, `return ContentService.createTextOutput(JSON.stringify({
        headerDebug: headerRowDebug,`);

fs.writeFileSync('src/components/ConfigModal.tsx', code);
