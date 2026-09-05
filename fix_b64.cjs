const fs = require('fs');

let config = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

config = config.replace(
    /var folder = DriveApp.getFolderById\("1eze4kVWtdUr0gjKSEAB_BKSfm5CNg3fv"\);\s*var bytes = Utilities.base64Decode\(b64\);/,
    `var folder = DriveApp.getFolderById("1eze4kVWtdUr0gjKSEAB_BKSfm5CNg3fv");
           var b64 = payload.base64.split(',')[1] || payload.base64;
           var bytes = Utilities.base64Decode(b64);`
);

config = config.replace(/2026\.09\.16/g, '2026.09.17');
fs.writeFileSync('src/components/ConfigModal.tsx', config, 'utf8');
console.log('Fixed ConfigModal.tsx b64 error');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(/2026\.09\.16/g, '2026.09.17');
fs.writeFileSync('src/App.tsx', appContent, 'utf8');

let loginContent = fs.readFileSync('src/components/Login.tsx', 'utf8');
loginContent = loginContent.replace(/2026\.09\.16/g, '2026.09.17');
fs.writeFileSync('src/components/Login.tsx', loginContent, 'utf8');
