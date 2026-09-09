const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

code = code.replace(/s = s\.normalize\('NFD'\)\.replace\(\/\[\\u0300-\\u036f\]\/g, ""\);/, `s = s.normalize('NFD').replace(/[\\\\u0300-\\\\u036f]/g, "");`);

fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');

