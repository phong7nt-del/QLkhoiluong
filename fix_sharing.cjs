const fs = require('fs');

let config = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

config = config.replace(
    /file\.setSharing\(DriveApp\.Access\.ANYONE_WITH_LINK, DriveApp\.Permission\.VIEW\);/,
    `try {
               file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
           } catch(shareErr) {
               console.warn("Could not set public sharing (might be blocked by domain): ", shareErr);
           }`
);

config = config.replace(/2026\.09\.17/g, '2026.09.18');
fs.writeFileSync('src/components/ConfigModal.tsx', config, 'utf8');
console.log('Fixed ConfigModal.tsx sharing error');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(/2026\.09\.17/g, '2026.09.18');
fs.writeFileSync('src/App.tsx', appContent, 'utf8');

let loginContent = fs.readFileSync('src/components/Login.tsx', 'utf8');
loginContent = loginContent.replace(/2026\.09\.17/g, '2026.09.18');
fs.writeFileSync('src/components/Login.tsx', loginContent, 'utf8');
