const fs = require('fs');
let content = fs.readFileSync('src/store/DataStore.ts', 'utf8');
content = content.replace(/https:\/\/script\.google\.com\/macros\/s\/[^'"`]+/g, 'https://script.google.com/macros/s/AKfycbzpw3SlqJxXYC29qjPRqH8ehfJp764bNvQFUzqIgMW_rMrpitMKvvRvWbbGrP505Sdi/exec');
fs.writeFileSync('src/store/DataStore.ts', content, 'utf8');
console.log('Updated DataStore.ts');
