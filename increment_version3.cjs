const fs = require('fs');
let content = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');
content = content.replace(/2026\.08\.23/g, '2026.08.24');
fs.writeFileSync('src/components/ConfigModal.tsx', content, 'utf8');

content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/2026\.08\.23/g, '2026.08.24');
fs.writeFileSync('src/App.tsx', content, 'utf8');
