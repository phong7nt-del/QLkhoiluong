const fs = require('fs');

// 1. Fix DcuTab.tsx
let dcuContent = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');
dcuContent = dcuContent.replace(
    /const newDcu = {\s*id,\s*ten,\s*toadoX,/,
    "const newDcu = { id, ten, diaChi, toadoX,"
);
fs.writeFileSync('src/components/DcuTab.tsx', dcuContent, 'utf8');
console.log('Fixed DcuTab.tsx newDcu payload');

// 2. Fix ConfigModal.tsx
let config = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

// Replace upload folder and URL
config = config.replace(
    /var folders = DriveApp\.getFoldersByName\("App_Images"\);[\s\S]*?var bytes = Utilities\.base64Decode\(b64\);/,
    `var folder = DriveApp.getFolderById("1eze4kVWtdUr0gjKSEAB_BKSfm5CNg3fv");
           var bytes = Utilities.base64Decode(b64);`
);

config = config.replace(
    /url: file\.getUrl\(\)/g,
    'url: "https://drive.google.com/uc?id=" + file.getId()'
);

// Fix STT condition
config = config.replace(
    /if \(h === 'stt'\) newRow\[i\] = nextStt;/,
    "if (h === 'stt' || h === 'số tt' || h === 'sott' || h === 'so tt') newRow[i] = nextStt;"
);

// Increment version
config = config.replace(/2026\.09\.14/g, '2026.09.15');

fs.writeFileSync('src/components/ConfigModal.tsx', config, 'utf8');
console.log('Fixed ConfigModal.tsx');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(/2026\.09\.14/g, '2026.09.15');
fs.writeFileSync('src/App.tsx', appContent, 'utf8');

let loginContent = fs.readFileSync('src/components/Login.tsx', 'utf8');
loginContent = loginContent.replace(/2026\.09\.14/g, '2026.09.15');
fs.writeFileSync('src/components/Login.tsx', loginContent, 'utf8');
