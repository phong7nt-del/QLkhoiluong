const fs = require('fs');

let content = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

const target = `const allMembers = DataStore.getMembers().filter(m => {
        const r = (m.role || '').toLowerCase();
        return !r.includes('tổ trưởng') && 
               !r.includes('tổ phó') && 
               !r.includes('đội trưởng') && 
               !r.includes('đội phó') && 
               !r.includes('giám đốc');
    });`;

const replacement = `const allMembers = DataStore.getMembers().filter(m => {
        const r = (m.role || '').toLowerCase();
        return !r.includes('tổ trưởng') && 
               !r.includes('tổ phó') && 
               !r.includes('đội trưởng') && 
               !r.includes('đội phó') && 
               !r.includes('giám đốc') &&
               !r.includes('phó giám đốc') &&
               !r.includes('pgđ');
    });`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/Analytics.tsx', content, 'utf8');
console.log("Patched Analytics.tsx successfully!");

