const fs = require('fs');
let content = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

const normalizeNew = `const normalizeStr = (s: string) => {
    return String(s || '')
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .toLowerCase()
        .replace(/\\s+/g, '');
};`;

content = content.replace(/const normalizeStr = \(s: string\) => String\(s \|\| ''\)\.toLowerCase\(\)\.replace\(\/\\s\/g, ''\);/g, normalizeNew);
fs.writeFileSync('src/components/DcuTab.tsx', content, 'utf8');
