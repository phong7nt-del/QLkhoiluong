const fs = require('fs');
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

const oldErr = `setMessage({ type: 'error', text: "Có lỗi xảy ra khi xóa báo cáo nhóm." });`;
const newErr = `setMessage({ type: 'error', text: "Lỗi từ server: " + JSON.stringify(res) });`;

if (code.includes(oldErr)) {
    code = code.replace(oldErr, newErr);
    fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
    console.log("Patched error message");
}
