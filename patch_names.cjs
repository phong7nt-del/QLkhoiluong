const fs = require('fs');

function replaceAll(file, regex, replace) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(regex, replace);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Updated " + file);
}

replaceAll('src/App.tsx', /"KT TU - TI"/g, '"TU - TI"');
replaceAll('src/components/SystemTab.tsx', /'KT TU - TI'/g, "'TU - TI'");

// Increment version
replaceAll('src/components/Login.tsx', /2026\.08\.15/g, '2026.08.16');
replaceAll('src/App.tsx', /2026\.08\.15/g, '2026.08.16');
replaceAll('src/components/ConfigModal.tsx', /2026\.08\.15/g, '2026.08.16');

