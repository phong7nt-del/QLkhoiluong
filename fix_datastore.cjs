const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

code = code.replace(/\\n\\n/g, '\n\n');

fs.writeFileSync('src/store/DataStore.ts', code);
