const fs = require('fs');

let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

const oldCheck = `    if (phatHien.trim()) {
       contentLines.push(\`Phát hiện: \${phatHien.trim()}\`);
    }`;
const newCheck = `    if (phatHien.trim()) {
       contentLines.push(\`Phát hiện: \${phatHien.trim()}\`);
    }
    if (isBaoCaoHo && sessionUser?.name) {
       contentLines.push(\`(Báo cáo hộ bởi: \${sessionUser.name})\`);
    }`;

if (code.includes(oldCheck)) {
    code = code.replace(oldCheck, newCheck);
    fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
    console.log("Patched WorkloadForm content Lines");
} else {
    console.log("Could not find old contentLines check");
}
