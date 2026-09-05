const fs = require('fs');
let content = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

// Replace openById
content = content.replace(/SpreadsheetApp\.openById\(SPREADSHEET_ID\)/g, "(SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID))");

fs.writeFileSync('src/components/ConfigModal.tsx', content, 'utf8');
console.log('Patched ConfigModal.tsx openById');
