const fs = require('fs');
let config = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const authFunc = `
function capQuyen() {
  // Chạy hàm này một lần duy nhất trong trình chỉnh sửa Apps Script
  // để cấp quyền truy cập Google Drive cho script.
  var folder = DriveApp.getRootFolder();
  Logger.log("Đã cấp quyền thành công!");
}
`;

config = config.replace(
    /function getSheetFlexibly/,
    authFunc + "\nfunction getSheetFlexibly"
);

config = config.replace(/2026\.09\.18/g, '2026.09.19');
fs.writeFileSync('src/components/ConfigModal.tsx', config, 'utf8');
console.log('Added capQuyen function');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(/2026\.09\.18/g, '2026.09.19');
fs.writeFileSync('src/App.tsx', appContent, 'utf8');

let loginContent = fs.readFileSync('src/components/Login.tsx', 'utf8');
loginContent = loginContent.replace(/2026\.09\.18/g, '2026.09.19');
fs.writeFileSync('src/components/Login.tsx', loginContent, 'utf8');
