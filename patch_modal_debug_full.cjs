const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

code = code.replace(/headerDebug: headerRowDebug,/, `headerDebug: headerRowDebug,
        idxDebug: { nameIdx: nameIdx, teamIdx: teamIdx, msnvIdx: msnvIdx, roleIdx: roleIdx, sinhNhatIdx: sinhNhatIdx },`);

fs.writeFileSync('src/components/ConfigModal.tsx', code);
