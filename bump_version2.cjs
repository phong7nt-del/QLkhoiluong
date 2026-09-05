const fs = require('fs');
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(/2026\.09\.20/g, '2026.09.21');
fs.writeFileSync('src/App.tsx', appContent, 'utf8');

let loginContent = fs.readFileSync('src/components/Login.tsx', 'utf8');
loginContent = loginContent.replace(/2026\.09\.20/g, '2026.09.21');
fs.writeFileSync('src/components/Login.tsx', loginContent, 'utf8');

let configContent = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');
configContent = configContent.replace(/2026\.09\.20/g, '2026.09.21');
fs.writeFileSync('src/components/ConfigModal.tsx', configContent, 'utf8');
