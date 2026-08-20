const fs = require('fs');

let wf = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');
wf = wf.replace(/https:\/\/script\.google\.com\/macros\/s\/[^'"`]+/g, 'https://script.google.com/macros/s/AKfycbzpw3SlqJxXYC29qjPRqH8ehfJp764bNvQFUzqIgMW_rMrpitMKvvRvWbbGrP505Sdi/exec');
fs.writeFileSync('src/components/WorkloadForm.tsx', wf, 'utf8');

console.log('Updated WorkloadForm.tsx');
