const fs = require('fs');
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf8');

code = code.replace(/team === 'tổ tổng hợp' \|\| team === 'tổng hợp'/, `team === 'tổ tổng hợp' || team === 'tổng hợp' || team === 'tổ th'`);

fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
