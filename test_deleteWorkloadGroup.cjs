const fs = require('fs');
const ds = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const match = ds.match(/deleteWorkloadGroup.*?catch \([^)]+\) \{[\s\S]*?\}/gs);
if(match) console.log(match[0]);
else console.log("Not found in DS");
