const fs = require('fs');
let code = fs.readFileSync('src/store/PermissionStore.ts', 'utf8');
code = code.replace(/'system': \['đội trưởng'\], \/\/ specifically requested/, `'birthday': ALL_ROLES,
    'system': ['đội trưởng'], // specifically requested`);
fs.writeFileSync('src/store/PermissionStore.ts', code);
