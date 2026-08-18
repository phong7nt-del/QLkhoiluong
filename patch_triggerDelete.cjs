const fs = require('fs');
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

const oldDelete = `  const triggerDeleteConfirm = () => {
      if (members.length === 0) {
          setMessage({ type: 'error', text: "Bạn phải nhập tên của ít nhất 1 thành viên nhóm để xóa báo cáo."});
          return;
      }
      setShowDeleteConfirm(true);
  };`;

const newDelete = `  const triggerDeleteConfirm = () => {
      if (members.length === 0) {
          setMessage({ type: 'error', text: "Bạn phải nhập tên của ít nhất 1 thành viên nhóm để xóa báo cáo."});
          return;
      }
      if (members.length >= 2) {
          setMessage({ type: 'error', text: "Chỉ được xóa báo cáo cá nhân. Không được phép xóa báo cáo nhóm từ 2 người trở lên." });
          return;
      }
      setShowDeleteConfirm(true);
  };`;

if (code.includes(oldDelete)) {
    code = code.replace(oldDelete, newDelete);
    fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
    console.log("Patched triggerDeleteConfirm successfully");
} else {
    console.log("Could not find triggerDeleteConfirm");
}
