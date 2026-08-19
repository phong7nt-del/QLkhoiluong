const fs = require('fs');

function fixFile(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');
    if (!code.includes('import { PermissionStore }')) {
        // Find DataStore import
        if (filePath === 'src/App.tsx') {
            code = code.replace(/import \{ DataStore[^}]*\} from "\.\/store\/DataStore";/, `$&\\nimport { PermissionStore } from './store/PermissionStore';`);
        } else if (filePath === 'src/components/WorkloadForm.tsx') {
            code = code.replace(/import \{ DataStore[^}]*\} from '\.\.\/store\/DataStore';/, `$&\\nimport { PermissionStore } from '../store/PermissionStore';`);
            // just in case it used double quotes
            code = code.replace(/import \{ DataStore[^}]*\} from "\.\.\/store\/DataStore";/, `$&\\nimport { PermissionStore } from '../store/PermissionStore';`);
        }
        fs.writeFileSync(filePath, code, 'utf8');
        console.log("Fixed imports in " + filePath);
    }
}

fixFile('src/App.tsx');
fixFile('src/components/WorkloadForm.tsx');
