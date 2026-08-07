import fs from 'fs';
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf-8');

code = code.replace(
  "    if (!window.confirm(`Bạn có chắc muốn lưu Kế hoạch cho ${monthYear} không?`)) return;",
  "    // window.confirm blocked in iframe"
);

fs.writeFileSync('src/components/WorkloadForm.tsx', code);
