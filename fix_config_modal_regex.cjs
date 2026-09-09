const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

// Replace the invalid regex
code = code.replace(/if \(h\.indexOf\('thang'\) > -1 \|\| \/\\d\+\\\/\\d\{4\}\/\.test\(h\)\) \{/, `if (h.indexOf('thang') > -1 || /\\\\d+\\\\/\\\\d{4}/.test(h)) {`);

// Replace the unicode
code = code.replace(/var h = rawVal\.toLowerCase\(\)\.normalize\('NFD'\)\.replace\(\/\[\\u0300-\\u036f\]\/g, ''\)\.replace\(\/đ\/g, 'd'\);/, `var h = rawVal.toLowerCase().normalize('NFD').replace(/[\\\\u0300-\\\\u036f]/g, '').replace(/đ/g, 'd');`);

fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');

