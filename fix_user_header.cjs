const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

code = code.replace(
    /else if \(h === 'user' \|\| h === 'người cập nhật' \|\| h === 'nguoi cap nhat' \|\| h === 'người thực hiện' \|\| h === 'nguoi thuc hien' \|\| h === 'nhân viên' \|\| h === 'nhan vien'\) newRow\[i\] = data\.user \|\| '';/g,
    "else if (h === 'user' || h === 'người cập nhật' || h === 'nguoi cap nhat' || h === 'người thực hiện' || h === 'nguoi thuc hien' || h === 'nhân viên' || h === 'nhan vien' || h === 'người được giao' || h === 'nguoi duoc giao') newRow[i] = data.user || '';"
);

fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
