const fs = require('fs');
let code = fs.readFileSync('src/components/BirthdayTab.tsx', 'utf8');

code = code.replace(/<div className="flex items-center gap-3">/, `</div><div className="flex items-center gap-3">`);

fs.writeFileSync('src/components/BirthdayTab.tsx', code);
