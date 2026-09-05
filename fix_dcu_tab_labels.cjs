const fs = require('fs');
let code = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

code = code.replace(/Danh sách đã phân công/g, 'Danh sách đang phân công');
code = code.replace(/Danh sách đã hoàn tất/g, 'Danh sách đã xử lý');
code = code.replace(/danh sách đã hoàn tất/g, 'danh sách đã xử lý');

fs.writeFileSync('src/components/DcuTab.tsx', code, 'utf8');
