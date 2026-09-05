const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

code = code.replace(
    /headers = \['stt', 'id', 'tên', 'địa chỉ', 'tọa độ x', 'tọa độ y', 'hình ảnh', 'ghi chú'\];/g,
    "headers = ['stt', 'id', 'tên', 'địa chỉ', 'tọa độ x', 'tọa độ y', 'hình ảnh', 'ghi chú', 'user'];"
);
code = code.replace(
    /sheet\.appendRow\(\['STT', 'ID', 'Tên', 'Địa chỉ', 'Tọa độ X', 'Tọa độ Y', 'Hình ảnh', 'Ghi chú'\]\);/g,
    "sheet.appendRow(['STT', 'ID', 'Tên', 'Địa chỉ', 'Tọa độ X', 'Tọa độ Y', 'Hình ảnh', 'Ghi chú', 'User']);"
);

fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
