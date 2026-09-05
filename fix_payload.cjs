const fs = require('fs');
let content = fs.readFileSync('src/store/DataStore.ts', 'utf8');

content = content.replace(
    /action: 'add_dcu',\s*payload: \{ data \}/,
    "action: 'add_dcu', data: data"
);

content = content.replace(
    /action: 'upload_image',\s*payload: \{ base64, fileName, mimeType \}/,
    "action: 'upload_image', base64, fileName, mimeType"
);

fs.writeFileSync('src/store/DataStore.ts', content, 'utf8');
console.log('Fixed payload structure in DataStore.ts');
