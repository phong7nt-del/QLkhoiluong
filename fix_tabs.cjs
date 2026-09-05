const fs = require('fs');
let code = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');
code = code.replace(/Danh sách đã hoàn tất \(\{data\.filter\(d => \!d\.toadoX \|\| \!d\.toadoY\)\.length\}\)/g, 'Danh sách đã phân công ({data.filter(d => !d.toadoX || !d.toadoY).length})');
fs.writeFileSync('src/components/DcuTab.tsx', code, 'utf8');
