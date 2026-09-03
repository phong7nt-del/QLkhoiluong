const fs = require('fs');
let content = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');
content = content.replace(
    "thoiGianXl: row['Thời gian thực hiện'] || row['Thời gian XL'] || row['thời gian thực hiện'] || defaultThoiGian,",
    "thoiGianXl: row['Thời gian thực hiện'] || row['Thời gian XL'] || row['thời gian thực hiện'] || '',"
);
fs.writeFileSync('src/components/XuLyDoXaView.tsx', content, 'utf8');

function updateVersion(file) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/2026\.08\.24/g, '2026.08.25');
    fs.writeFileSync(file, content, 'utf8');
}
updateVersion('src/App.tsx');
updateVersion('src/components/ConfigModal.tsx');
updateVersion('src/components/Login.tsx');
