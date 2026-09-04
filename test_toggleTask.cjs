const fs = require('fs');
const content = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');
const match = content.match(/const toggleTask =[\s\S]*?\}\);[\s\S]*?};/);
console.log(match ? match[0] : "Not found");
