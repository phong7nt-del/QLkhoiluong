const fs = require('fs');
let metadata = JSON.parse(fs.readFileSync('metadata.json', 'utf8'));
metadata.requestFramePermissions = ["microphone", "geolocation", "camera"];
fs.writeFileSync('metadata.json', JSON.stringify(metadata, null, 2), 'utf8');
console.log('Patched metadata.json');
