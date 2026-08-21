const fs = require('fs');
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf8');

code = code.replace(/\/\/ item.planQty \+\= addedPlan;/g, 'item.planQty += addedPlan;');
fs.writeFileSync('src/components/PlanProgressTab.tsx', code, 'utf8');
console.log("Patched PlanProgressTab.tsx for planQty");
