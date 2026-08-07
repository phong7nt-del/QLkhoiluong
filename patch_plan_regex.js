import fs from 'fs';
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf-8');

code = code.replace(
  "      const regex = /Tháng (\\d+)\\/(\\d+)/i;",
  "      const regex = /(\\d+)\\/(\\d{4})/;"
);

fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
