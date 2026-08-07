import fs from 'fs';
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf-8');
console.log(code.match(/const planData = useMemo\(\(\) => \{[\s\S]*?return \{/)[0]);
