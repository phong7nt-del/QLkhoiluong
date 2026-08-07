import fs from 'fs';
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf-8');
code = code.replace(
  "if (!dm.isGroup && e.content.includes(dm.name)) {",
  "if (e.content.includes(dm.name)) {"
);
fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
