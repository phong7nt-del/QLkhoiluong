const fs = require('fs');
let code = fs.readFileSync('src/components/SystemTab.tsx', 'utf8');
code = code.replace(/{ id: 'system', label: 'Hệ thống' }/, `{ id: 'birthday', label: 'Birthday' },
    { id: 'system', label: 'Hệ thống' }`);
fs.writeFileSync('src/components/SystemTab.tsx', code);
