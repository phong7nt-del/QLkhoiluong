const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

code = code.replace(
  `      const result = await response.json();
      return result.status === 'success';`,
  `      const result = await response.json();
      return result;`
);

fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');

let code2 = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');
const oldDeleteGroup = `          const ok = await DataStore.deleteWorkloadGroup({ date, members });
          if (ok) {
              setMessage({ type: 'success', text: "Đã xóa báo cáo nhóm thành công!" });
              setMembers([]); // reset
              onSaved();
          } else {
              setMessage({ type: 'error', text: "Có lỗi xảy ra khi xóa báo cáo nhóm." });
          }`;

const newDeleteGroup = `          const res = await DataStore.deleteWorkloadGroup({ date, members });
          if (res && res.status === 'success') {
              setMessage({ type: 'success', text: "Đã xóa báo cáo nhóm thành công!" });
              setMembers([]); // reset
              onSaved();
          } else if (res && res.reason === 'date_not_found') {
              setMessage({ type: 'error', text: "Không tìm thấy cột ngày tương ứng trong file Google Sheets (" + date.split('-').reverse().join('/') + ")" });
          } else {
              setMessage({ type: 'error', text: "Có lỗi xảy ra khi xóa báo cáo nhóm." });
          }`;

code2 = code2.replace(oldDeleteGroup, newDeleteGroup);
fs.writeFileSync('src/components/WorkloadForm.tsx', code2, 'utf8');
