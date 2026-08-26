const fs = require('fs');
let cm = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

// Header replacement
cm = cm.replace(
    /sheet\.appendRow\(\['STT', 'Loại XL', 'Người XL', 'Thời gian XL', 'Mã DD', 'Cách XL', 'Kết quả', 'Ghi chú'\]\);/g,
    "sheet.appendRow(['STT', 'Loại XL', 'Người XL', 'Thời gian XL', 'Mã DD', 'Tên KH', 'Cách XL', 'Kết quả', 'Ghi chú']);"
);

// add_xulydoxa data push
cm = cm.replace(
    "data.maDd || '',\n          data.cachXl || '',",
    "data.maDd || '',\n          data.tenKh || '',\n          data.cachXl || '',"
);

// add_xulydoxa_bulk data push
cm = cm.replace(
    "d.maDd || '',\n             d.cachXl || '',",
    "d.maDd || '',\n             d.tenKh || '',\n             d.cachXl || '',"
);

// update_xulydoxa setup variables
cm = cm.replace(
    "var loaiXlCol = -1, nguoiXlCol = -1, thoiGianXlCol = -1, maDdCol = -1, cachXlCol = -1, ketQuaCol = -1, ghiChuCol = -1;",
    "var loaiXlCol = -1, nguoiXlCol = -1, thoiGianXlCol = -1, maDdCol = -1, tenKhCol = -1, cachXlCol = -1, ketQuaCol = -1, ghiChuCol = -1;"
);

// update_xulydoxa header matching
cm = cm.replace(
    "else if (h === 'madd') maDdCol = c;\n           else if (h === 'cachxl') cachXlCol = c;",
    "else if (h === 'madd') maDdCol = c;\n           else if (h === 'tenkh') tenKhCol = c;\n           else if (h === 'cachxl') cachXlCol = c;"
);

// update_xulydoxa assignment
cm = cm.replace(
    "if (maDdCol > -1) sheet.getRange(r + 1, maDdCol + 1).setValue(inputMaDd);",
    "if (maDdCol > -1) sheet.getRange(r + 1, maDdCol + 1).setValue(inputMaDd);\n                  if (tenKhCol > -1) sheet.getRange(r + 1, tenKhCol + 1).setValue(data.tenKh || '');"
);

fs.writeFileSync('src/components/ConfigModal.tsx', cm, 'utf8');
console.log("Patched ConfigModal.tsx");

