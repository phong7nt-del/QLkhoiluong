const fs = require('fs');

let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

// 1. Remove state and permission variable
code = code.replace(/const \[isBaoCaoHo, setIsBaoCaoHo\] = useState\(false\);\n\s*const canBaoCaoHo = [^\n]*;\n/g, '');

// 2. Change if statement
code = code.replace(/if \(\!isBaoCaoHo && sessionUser && sessionUser.name && \!members\.includes\(sessionUser\.name\)\) \{/, 'if (sessionUser && sessionUser.name && !members.includes(sessionUser.name)) {');

// 3. Remove content push
code = code.replace(/\s*if \(isBaoCaoHo && sessionUser\?\.name\) \{\s*contentLines\.push\(\`\(Báo cáo hộ bởi: \$\{sessionUser\.name\}\)\`\);\s*\}/g, '');

// 4. Remove setIsBaoCaoHo(false);
code = code.replace(/\s*setIsBaoCaoHo\(false\);/g, '');

// 5. Remove UI block
const uiBlockRegex = /\{\s*canBaoCaoHo\s*&&\s*\([\s\S]*?\)\s*\}/;
code = code.replace(uiBlockRegex, '');

fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
console.log("Removed BaoCaoHo logic");
