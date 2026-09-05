const fs = require('fs');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(/2026\.09\.19/g, '2026.09.20');
fs.writeFileSync('src/App.tsx', appContent, 'utf8');

let loginContent = fs.readFileSync('src/components/Login.tsx', 'utf8');
loginContent = loginContent.replace(/2026\.09\.19/g, '2026.09.20');
fs.writeFileSync('src/components/Login.tsx', loginContent, 'utf8');

let configContent = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');
configContent = configContent.replace(/2026\.09\.19/g, '2026.09.20');
// ensure 'tt' is matched for STT
if (!configContent.includes("h === 'tt'")) {
    configContent = configContent.replace(
        /if \(h === 'stt' \|\| h === 'số tt' \|\| h === 'sott' \|\| h === 'so tt'\) newRow\[i\] = nextStt;/,
        "if (h === 'tt' || h === 'stt' || h === 'số tt' || h === 'sott' || h === 'so tt') newRow[i] = nextStt;"
    );
}
fs.writeFileSync('src/components/ConfigModal.tsx', configContent, 'utf8');

console.log('Bumped version');
