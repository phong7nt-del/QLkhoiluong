const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

code = code.replace(
  "sheet.appendRow(['STT', 'Loại XL', 'Người XL', 'Thời gian XL', 'Mã DD', 'Cách XL', 'Ghi chú']);",
  "sheet.appendRow(['STT', 'Loại XL', 'Người XL', 'Thời gian XL', 'Mã DD', 'Cách XL', 'Kết quả', 'Ghi chú']);"
);

code = code.replace(
  "data.cachXl || '',\n          data.ghiChu || ''",
  "data.cachXl || '',\n          data.ketQua || '',\n          data.ghiChu || ''"
);

fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
