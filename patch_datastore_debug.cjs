const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

code = code.replace(/if \(json\.workloads\) \{/, `if (json.headerDebug) {
           safeSetItem('HEADER_DEBUG', JSON.stringify(json.headerDebug));
         }
         if (json.workloads) {`);

fs.writeFileSync('src/store/DataStore.ts', code);
