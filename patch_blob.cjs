const fs = require('fs');
let content = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const strToReplace = `           var bytes = Utilities.base64Decode(payload.base64);
           var blob = Utilities.newBlob(bytes, payload.mimeType, payload.fileName);`;

const newStr = `           var b64 = (payload.base64 || '').replace(/\\s/g, '');
           var bytes = Utilities.base64Decode(b64);
           var mime = payload.mimeType || 'image/jpeg';
           var blob = Utilities.newBlob(bytes, mime, payload.fileName);`;

content = content.replace(strToReplace, newStr);
fs.writeFileSync('src/components/ConfigModal.tsx', content, 'utf8');
console.log('Patched ConfigModal.tsx blob creation');
