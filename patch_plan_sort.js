import fs from 'fs';
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf-8');

code = code.replace(
  "             const m = s.match(/Tháng (\\d+)\\/(\\d+)/i);",
  "             const m = s.match(/(\\d+)\\/(\\d{4})/);"
);

fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
