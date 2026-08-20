const fs = require('fs');

let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

// Remove from isDeleteAllowed
code = code.replace("const canBaoCaoHo = PermissionStore.hasActionAccess('bao_cao_ho', roleStr);\n", "");

// Add to the main component scope
const oldScope = `const [isBaoCaoHo, setIsBaoCaoHo] = useState(false);`;
const newScope = `const [isBaoCaoHo, setIsBaoCaoHo] = useState(false);
  const canBaoCaoHo = sessionUser ? PermissionStore.hasActionAccess('bao_cao_ho', sessionUser.role || '') : false;`;

code = code.replace(oldScope, newScope);
fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
console.log("Fixed canBaoCaoHo scope");
