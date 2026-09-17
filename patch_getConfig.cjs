const fs = require('fs');
let code = fs.readFileSync('src/store/PermissionStore.ts', 'utf8');

code = code.replace(/return JSON\.parse\(stored\) as RBACConfig;/, `const parsed = JSON.parse(stored) as RBACConfig;
        // Merge with default to ensure new tabs/actions are included
        const merged: RBACConfig = {
           tabs: { ...DEFAULT_RBAC.tabs, ...(parsed.tabs || {}) },
           actions: { ...DEFAULT_RBAC.actions, ...(parsed.actions || {}) }
        };
        // Special case: if birthday was missing in parsed.tabs, it will now take DEFAULT_RBAC.tabs['birthday']
        return merged;`);

fs.writeFileSync('src/store/PermissionStore.ts', code);
