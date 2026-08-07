import fs from 'fs';
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf-8');
code = code.replace(
  "const actualQty = actualQtyMap.get(dm.name) || 0;\n          if (dm.name.includes('Thay bảo trì 1 pha TT')) console.log('DEBUG PLAN:', dm.name, 'history:', dm.history, 'planColumnKey:', planColumnKey, 'planQty:', planQty);",
  "const actualQty = actualQtyMap.get(dm.name) || 0;"
);
fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
