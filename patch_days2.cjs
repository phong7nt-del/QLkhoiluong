const fs = require('fs');
let code = fs.readFileSync('src/components/AnalysisTab.tsx', 'utf8');

const t1 = `                const dObj = new Date(date);
                const day = dObj.getDay();`;
const r1 = `                const parts = date.split('-');
                const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                const day = dObj.getDay();`;

code = code.split(t1).join(r1);

fs.writeFileSync('src/components/AnalysisTab.tsx', code, 'utf8');
console.log("Patched date parsing");
