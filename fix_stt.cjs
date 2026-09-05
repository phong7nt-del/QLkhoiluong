const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');
code = code.replace(/if \(h === 'stt' \|\| h === 'số tt' \|\| h === 'sott' \|\| h === 'so tt'\)/g, "if (h === 'stt' || h === 'số tt' || h === 'sott' || h === 'so tt' || h === 'tt')");
fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
