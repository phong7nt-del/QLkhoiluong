const fs = require('fs');
let content = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');
content = content.replace(/else if \(h === 'user' \|\| h === 'người cập nhật' \|\| h === 'nguoi cap nhat'\) userCol = c;/g, '');
content = content.replace(/if \(userCol === -1\) \{\n\s*userCol = headers.length;\n\s*sheet.getRange\(1, userCol \+ 1\).setValue\('User'\);\n\s*\}/g, '');
content = content.replace(/if \(userCol !== -1\) sheet.getRange\(r \+ 2, userCol \+ 1\).setValue\(data.user \|\| ''\);/g, '');
content = content.replace(/sheet.getRange\(r \+ 2, userCol \+ 1\).setValue\(data.user \|\| ''\);/g, '');
fs.writeFileSync('src/components/ConfigModal.tsx', content, 'utf8');
