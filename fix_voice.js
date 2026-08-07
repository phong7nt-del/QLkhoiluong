import fs from 'fs';
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf-8');
code = code.replace('currentMembers = [bestMatch]; // Thay thế hoàn toàn list members', 'currentMembers.push(bestMatch);');
fs.writeFileSync('src/components/WorkloadForm.tsx', code);
