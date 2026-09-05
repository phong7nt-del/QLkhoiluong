const fs = require('fs');
let content = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const strToReplace = `           var b64 = (payload.base64 || '').replace(/\\s/g, '');
           var bytes = Utilities.base64Decode(b64);
           var mime = payload.mimeType || 'image/jpeg';
           var blob = Utilities.newBlob(bytes, mime, payload.fileName);`;

const newStr = `           var b64 = (payload.base64 || '').replace(/\\s/g, '');
           var bytes = Utilities.base64Decode(b64);
           var mime = payload.mimeType || 'image/jpeg';
           var fName = payload.fileName || ('IMG_' + new Date().getTime() + '.jpg');
           var blob = Utilities.newBlob(bytes, mime, fName);`;

content = content.replace(strToReplace, newStr);
fs.writeFileSync('src/components/ConfigModal.tsx', content, 'utf8');
console.log('Patched ConfigModal.tsx blob filename');
