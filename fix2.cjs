const fs = require('fs');
let content = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

// regex replace
content = content.replace(/const \[ten,[\s\S]*?diaChi,\s*setTen\] = useState\(''\);/, "const [ten, setTen] = useState('');");

fs.writeFileSync('src/components/DcuTab.tsx', content, 'utf8');
