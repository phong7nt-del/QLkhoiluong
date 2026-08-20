const fs = require('fs');
const ds = fs.readFileSync('src/store/DataStore.ts', 'utf8');
const wf = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

console.log("DS deleteWorkloadGroup:");
const match = ds.match(/deleteWorkloadGroup.*?catch.*?\}/gs);
if(match) console.log(match[0].substring(0, 300));
else console.log("Not found in DS");
