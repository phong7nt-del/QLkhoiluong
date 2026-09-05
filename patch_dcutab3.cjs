const fs = require('fs');
let content = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

content = content.replace(
    `<td className="px-4 py-3 font-medium text-slate-700 border-b border-slate-100">{row.stt}</td>`,
    `<td className="px-4 py-3 font-medium text-slate-700 border-b border-slate-100">{row.stt || (idx + 1)}</td>`
);

fs.writeFileSync('src/components/DcuTab.tsx', content, 'utf8');
console.log('Patched STT display');
