const fs = require('fs');
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf8');

code = code.replace(/<option key={m} value={m}>Tháng \{m\}<\/option>/, `<option key={m} value={m}>{m.includes('/') ? \`Tháng \${m}\` : \`Năm \${m}\`}</option>`);
fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
