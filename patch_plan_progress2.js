import fs from 'fs';
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf-8');
code = code.replace(
  "return dinhMucList.filter(dm => !dm.isGroup).map(dm => {",
  "return dinhMucList.map(dm => {"
);
fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
