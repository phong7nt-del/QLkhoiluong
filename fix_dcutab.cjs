const fs = require('fs');
let content = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

content = content.replace("const [ten,          diaChi, setTen] = useState('');", "const [ten, setTen] = useState('');");

fs.writeFileSync('src/components/DcuTab.tsx', content, 'utf8');
console.log('Fixed DcuTab syntax error');
