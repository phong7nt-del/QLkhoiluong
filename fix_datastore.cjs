const fs = require('fs');
let content = fs.readFileSync('src/store/DataStore.ts', 'utf8');
content = content.replace(/require\('papaparse'\)/g, 'Papa');
fs.writeFileSync('src/store/DataStore.ts', content, 'utf8');
console.log("Fixed Papa in DataStore.ts");
