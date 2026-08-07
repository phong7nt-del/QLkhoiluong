import fs from 'fs';
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf-8');
console.log(code.match(/let planQty = 0;[\s\S]*?const actualQty/)[0]);
