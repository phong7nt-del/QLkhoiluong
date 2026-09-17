const fs = require('fs');
let code = fs.readFileSync('src/components/BirthdayTab.tsx', 'utf8');

const debugStart = `<div className="text-xs text-slate-400 bg-slate-50 p-2 rounded whitespace-pre-wrap">`;
const debugEnd = `</div>`;

// Actually regex is safer
code = code.replace(/<div className="flex flex-col gap-2 bg-white p-5 rounded-2xl shadow-sm border border-rose-100">\s*<div className="text-xs text-slate-400 bg-slate-50 p-2 rounded whitespace-pre-wrap">.*?<\/div>\s*<\/div>/s, '');

// The structure was: 
// <div className="flex flex-col gap-2 bg-white p-5 rounded-2xl shadow-sm border border-rose-100">
//   <div className="text-xs text-slate-400 bg-slate-50 p-2 rounded whitespace-pre-wrap">
//     ...
//   </div>
// </div>
// <div className="flex items-center gap-3">
// wait, I patched it as `</div><div className="flex items-center gap-3">` earlier.

fs.writeFileSync('src/components/BirthdayTab.tsx', code);
