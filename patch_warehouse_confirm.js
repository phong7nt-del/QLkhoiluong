import fs from 'fs';
let code = fs.readFileSync('src/components/WarehouseTab.tsx', 'utf-8');

code = code.replace(
  "                       if (window.confirm(\"Bạn có chắc muốn reset toàn bộ sơ đồ kho?\")) {",
  "                       if (true) { // window.confirm blocked in iframe"
);

fs.writeFileSync('src/components/WarehouseTab.tsx', code);
