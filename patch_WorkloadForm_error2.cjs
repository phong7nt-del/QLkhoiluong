const fs = require('fs');
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

const oldErr2 = `setMessage({ type: 'error', text: "Lỗi hệ thống khi xóa báo cáo." });`;
const newErr2 = `setMessage({ type: 'error', text: "Lỗi hệ thống khi xóa báo cáo: " + e.message });`;

if (code.includes(oldErr2)) {
    code = code.replace(oldErr2, newErr2);
    fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
    console.log("Patched catch error message");
}
