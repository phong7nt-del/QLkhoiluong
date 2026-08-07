import fs from 'fs';
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf-8');

code = code.replace(
  "      return dinhMucList.filter(dm => !dm.isGroup).map(dm => {",
  "      console.log('Selected Month:', selectedMonth, 'Selected Team:', selectedTeam, 'PlanColumnKey:', planColumnKey);\n      console.log('DinhMuc[0] history:', dinhMucList.find(d => !d.isGroup)?.history);\n      return dinhMucList.filter(dm => !dm.isGroup).map(dm => {"
);

fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
