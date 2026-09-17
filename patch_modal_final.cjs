const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const targetStr = `      if (teamIdx === -1) { teamIdx = 2; }
      
      var debugPayload = { headerDebug: headerRowDebug, idxDebug: { nameIdx: nameIdx, teamIdx: teamIdx, msnvIdx: msnvIdx, roleIdx: roleIdx, sinhNhatIdx: sinhNhatIdx } };`;

const replaceStr = `      if (teamIdx === -1) { teamIdx = 2; }
      
      var headerRowDebug = data[startRow > 1 ? startRow - 2 : 0] || [];
      var debugPayload = { headerDebug: headerRowDebug, idxDebug: { nameIdx: nameIdx, teamIdx: teamIdx, msnvIdx: msnvIdx, roleIdx: roleIdx, sinhNhatIdx: sinhNhatIdx } };`;

if (!code.includes("var debugPayload")) {
    console.log("Not found");
} else {
    code = code.replace(/if \(teamIdx === -1\) \{ teamIdx = 2; \}\s+var debugPayload = \{ headerDebug: headerRowDebug, idxDebug: \{ nameIdx: nameIdx, teamIdx: teamIdx, msnvIdx: msnvIdx, roleIdx: roleIdx, sinhNhatIdx: sinhNhatIdx \} \};/, replaceStr);
    fs.writeFileSync('src/components/ConfigModal.tsx', code);
    console.log("Patched successfully");
}
