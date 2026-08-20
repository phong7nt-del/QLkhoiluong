const fs = require('fs');

function replaceInFile(file, regex, replacement) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
}

replaceInFile('src/components/Login.tsx', /Version 2026\.5\.1/, 'Phiên bản 2026.08.01');
replaceInFile('src/App.tsx', /Phiên bản 2026\.5\.1/, 'Phiên bản 2026.08.01');

// Update ConfigModal script template to include version
let configCode = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');
if (!configCode.includes('// VERSION: 2026.08.01')) {
    configCode = configCode.replace(/const SCRIPT_TEMPLATE = `/, 'const SCRIPT_TEMPLATE = `// VERSION: 2026.08.01\n');
    fs.writeFileSync('src/components/ConfigModal.tsx', configCode, 'utf8');
    console.log('Updated ConfigModal.tsx');
}

