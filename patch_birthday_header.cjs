const fs = require('fs');
let code = fs.readFileSync('src/components/BirthdayTab.tsx', 'utf8');

code = code.replace(/<div className="text-xs text-slate-400 bg-slate-50 p-2 rounded">/, `<div className="text-xs text-slate-400 bg-slate-50 p-2 rounded whitespace-pre-wrap">
             Header từ Sheet: {localStorage.getItem('HEADER_DEBUG')}
             <br/>`);

fs.writeFileSync('src/components/BirthdayTab.tsx', code);
