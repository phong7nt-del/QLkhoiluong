const fs = require('fs');
let content = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

content = content.replace(
    "'Mã DD': item.maDd,",
    "'Mã DD': item.maDd,\n          'Tên KH': item.tenKh,"
);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', content, 'utf8');
console.log("Patched XuLyDoXaView.tsx for exportExcel");
