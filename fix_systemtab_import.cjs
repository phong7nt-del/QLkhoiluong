const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import SystemTab from')) {
    code = code.replace(/import ConfigModal from "\.\/components\/ConfigModal";/, 'import ConfigModal from "./components/ConfigModal";\\nimport SystemTab from "./components/SystemTab";');
    fs.writeFileSync('src/App.tsx', code.replace(/\\n/g, '\n'), 'utf8');
    console.log("Fixed SystemTab import");
} else {
    console.log("SystemTab import already exists");
}
