const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

code = code.replace(/if \\(\\!sheet\\) return ContentService\\.createTextOutput.*?setMimeType\\(ContentService\\.MimeType\\.JSON\\);/s, `if (!sheet) return ContentService.createTextOutput(JSON.stringify({ spreadsheetId: SPREADSHEET_ID, error: "Not found sheet CongTac"})).setMimeType(ContentService.MimeType.JSON);`);

fs.writeFileSync('src/components/ConfigModal.tsx', code);
