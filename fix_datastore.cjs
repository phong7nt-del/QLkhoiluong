const fs = require('fs');

let content = fs.readFileSync('src/store/DataStore.ts', 'utf8');
content = content.replace(
    /stt: findKey\(\['STT'\]\),/,
    "stt: findKey(['STT', 'TT', 'Số TT', 'SOTT']),"
);
fs.writeFileSync('src/store/DataStore.ts', content, 'utf8');
console.log('Fixed DataStore.ts');
