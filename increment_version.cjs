const fs = require('fs');
function replaceInFile(file, regex, replacement) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
}
replaceInFile('src/components/Login.tsx', /2026\.09\.03/g, '2026.09.04');
replaceInFile('src/App.tsx', /2026\.09\.03/g, '2026.09.04');
replaceInFile('src/components/ConfigModal.tsx', /2026\.09\.03/g, '2026.09.04');
