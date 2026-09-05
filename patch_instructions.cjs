const fs = require('fs');
let content = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const strToReplace = `<ul className="list-decimal pl-5 space-y-1 mb-2">
                     <li>Đảm bảo bạn đã có Sheet <strong>DinhMuc</strong> (Cột A: Tên định mức/nội dung).</li>
                     <li>Copy toàn bộ mã trong ô màu đen bên dưới.</li>
                     <li>Dán đè vào <a href="https://script.google.com" target="_blank" rel="noreferrer" className="underline font-bold text-blue-700">Google Apps Script</a> của bạn.</li>
                     <li>Bấm <strong>Deploy {'->'} New deployment</strong>. (Không được chọn Manage Deployments bản cũ)</li>
                     <li>Sao chép Web App URL <strong>MỚI NHẤT</strong> và dán vào ô bên dưới rồi TẢI LẠI DỮ LIỆU.</li>
                  </ul>`;

const newStr = `<ul className="list-decimal pl-5 space-y-1 mb-2">
                     <li>Copy toàn bộ mã trong ô màu đen bên dưới.</li>
                     <li>Dán đè vào <a href="https://script.google.com" target="_blank" rel="noreferrer" className="underline font-bold text-blue-700">Google Apps Script</a> của bạn. Bấm nút Lưu (💾).</li>
                     <li><strong>CẤP QUYỀN LƯU ẢNH:</strong> Trên thanh công cụ, chọn hàm <strong>setup</strong> thay vì doPost. Bấm nút <strong>Run (Chạy)</strong>. Cửa sổ yêu cầu quyền hiện ra: Chọn <strong>Review permissions</strong> {'->'} <strong>Advanced</strong> {'->'} <strong>Go to Project (unsafe)</strong> {'->'} <strong>Allow</strong>.</li>
                     <li>Bấm <strong>Deploy {'->'} Manage deployments</strong>. Bấm nút chỉnh sửa (Cây bút), chọn <strong>New version</strong> và bấm Deploy.</li>
                  </ul>`;

content = content.replace(strToReplace, newStr);
fs.writeFileSync('src/components/ConfigModal.tsx', content, 'utf8');
console.log('Patched ConfigModal instructions');
