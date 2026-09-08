const fs = require('fs');

function updateFile(file) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/2026\.08\.23|2026\.09\.24|2026\.09\.25|2026\.09\.26|2026\.09\.27/g, '2026.09.28');
        fs.writeFileSync(file, content, 'utf8');
        console.log("Updated " + file);
    }
}

updateFile('src/App.tsx');
updateFile('src/components/Login.tsx');
updateFile('src/components/ConfigModal.tsx');

