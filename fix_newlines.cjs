const fs = require('fs');
let code = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

code = code.replace(/\]\);\\n\\n  const groupedByWorkgroup = useMemo/g, ']);\n\n  const groupedByWorkgroup = useMemo');

fs.writeFileSync('src/components/Analytics.tsx', code, 'utf8');
console.log("Fixed newlines");
