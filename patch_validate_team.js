import fs from 'fs';
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf-8');

code = code.replace(
  "    if (selectedList.length === 0) {",
  "    if (!team) {\n      setMessage({ type: 'error', text: \"Vui lòng chọn Đội hoặc Tổ công tác để lưu kế hoạch\" });\n      setTimeout(() => setMessage(null), 5000);\n      return;\n    }\n\n    if (selectedList.length === 0) {"
);

fs.writeFileSync('src/components/WorkloadForm.tsx', code);
