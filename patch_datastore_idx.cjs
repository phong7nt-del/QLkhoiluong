const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

code = code.replace(/if \(json\.workloads\) \{/, `if (json.idxDebug) {
           safeSetItem('IDX_DEBUG', JSON.stringify(json.idxDebug));
         }
         if (json.workloads) {`);

fs.writeFileSync('src/store/DataStore.ts', code);
