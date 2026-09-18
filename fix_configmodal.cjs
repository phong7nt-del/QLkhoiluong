const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

code = code.replace(/\\n\\n/g, '\n\n');

fs.writeFileSync('src/components/ConfigModal.tsx', code);
