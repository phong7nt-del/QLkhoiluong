import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "<PlanProgressTab />",
  "<PlanProgressTab refreshToggle={refreshToggle} />"
);

fs.writeFileSync('src/App.tsx', code);
