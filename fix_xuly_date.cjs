const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

// 1. Move defaultThoiGian to the top
const dateStr = `const now = new Date();
  const defaultThoiGian = \`\${now.getDate().toString().padStart(2, '0')}/\${(now.getMonth() + 1).toString().padStart(2, '0')}/\${now.getFullYear()}\`;`;

code = code.replace(/const now = new Date\(\);\n\s*const defaultThoiGian = `\$\{now\.getDate\(\)\.toString\(\)\.padStart\(2, '0'\)\}\/\$\{\(now\.getMonth\(\) \+ 1\)\.toString\(\)\.padStart\(2, '0'\)\}\/\$\{now\.getFullYear\(\)\}`;\n\s*/, '');

// Insert it before useState
code = code.replace(/const \[formData, setFormData\] = useState<Partial<XuLyDoXaEntry>>\(\{/, `${dateStr}\n\n  const [formData, setFormData] = useState<Partial<XuLyDoXaEntry>>({`);

// Change thoiGianXl: '' to thoiGianXl: defaultThoiGian in useState
code = code.replace(/thoiGianXl: '',/, `thoiGianXl: defaultThoiGian,`);

// In handleSubmit
code = code.replace(/thoiGianXl: formData\.thoiGianXl \|\| defaultThoiGian,/g, `thoiGianXl: formData.thoiGianXl !== undefined ? formData.thoiGianXl : defaultThoiGian,`);

// In input
code = code.replace(/value=\{formData\.thoiGianXl \|\| defaultThoiGian\}/g, `value={formData.thoiGianXl ?? ''}`);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
