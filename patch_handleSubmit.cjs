const fs = require('fs');
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

const oldCheck = `    if (!team || members.length === 0 || !date || selectedList.length === 0) {
      setMessage({ type: 'error', text: "Vui lòng điền đầy đủ thông tin nội dung và có ít nhất 1 nội dung được chọn" });
      setTimeout(() => setMessage(null), 5000);
      return;
    }`;

const newCheck = `    if (!team || members.length === 0 || !date || selectedList.length === 0) {
      setMessage({ type: 'error', text: "Vui lòng điền đầy đủ thông tin nội dung và có ít nhất 1 nội dung được chọn" });
      setTimeout(() => setMessage(null), 5000);
      return;
    }
    
    if (sessionUser && sessionUser.name && !members.includes(sessionUser.name)) {
      setMessage({ type: 'error', text: "Bạn chỉ được phép nhập báo cáo cho chính mình hoặc nhóm mà bạn là thành viên." });
      setTimeout(() => setMessage(null), 5000);
      return;
    }`;

if (code.includes(oldCheck)) {
    code = code.replace(oldCheck, newCheck);
    fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
    console.log("Patched handleSubmit successfully");
} else {
    console.log("Could not find oldCheck in handleSubmit");
}
