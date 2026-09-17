const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const targetReturnStr = `        status: 'success',
        teams: teams,`;

const replaceReturnStr = `        status: 'success',
        headerDebug: debugPayload.headerDebug,
        idxDebug: debugPayload.idxDebug,
        teams: teams,`;

if (!code.includes(targetReturnStr)) {
    console.log("Could not find target return str");
} else {
    code = code.replace(targetReturnStr, replaceReturnStr);
    fs.writeFileSync('src/components/ConfigModal.tsx', code);
    console.log("Patched successfully");
}
