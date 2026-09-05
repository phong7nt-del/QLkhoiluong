const fs = require('fs');
let content = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const strToReplace = "function doPost(e) {";
const setupFunc = `// --- BƯỚC QUAN TRỌNG ĐỂ LƯU ẢNH: CẤP QUYỀN TRUY CẬP (CHẠY 1 LẦN DUY NHẤT) ---
// 1. Trên thanh công cụ, chọn hàm "setup" (thay vì doPost).
// 2. Bấm "Chạy" (Run). Trình duyệt sẽ hiển thị thông báo "Yêu cầu cấp quyền".
// 3. Chọn "Xem lại quyền" -> Chọn Tài khoản Google của bạn -> Bấm "Nâng cao" (Advanced) -> Chọn "Đi tới dự án (Không an toàn)" -> Bấm "Cho phép" (Allow).
function setup() {
  DriveApp.getFiles();
  SpreadsheetApp.getActive();
}

function doPost(e) {`;

content = content.replace(strToReplace, setupFunc);
fs.writeFileSync('src/components/ConfigModal.tsx', content, 'utf8');
console.log('Patched ConfigModal.tsx');
