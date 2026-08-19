const fs = require('fs');

let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');
code = code.replace(/data\.quantity as number/g, 'Number(data.quantity)');
fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
console.log("Fixed cast");
