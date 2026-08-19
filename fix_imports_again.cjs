const fs = require('fs');

function fixFile(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');
    
    // Fix literal \n
    code = code.replace(/;\\nimport \{ PermissionStore/g, ";\nimport { PermissionStore");
    
    fs.writeFileSync(filePath, code, 'utf8');
    console.log("Fixed newlines in " + filePath);
}

fixFile('src/App.tsx');
fixFile('src/components/WorkloadForm.tsx');
