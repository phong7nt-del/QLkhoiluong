const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

const oldInputClass = 'className="w-full px-2 py-1 text-xs text-black border rounded outline-none font-normal"';
const newInputClass = 'className="w-full px-2 py-1.5 text-sm bg-white text-slate-900 font-bold border-2 border-blue-200 focus:border-blue-500 rounded outline-none placeholder-slate-400"';

code = code.split(oldInputClass).join(newInputClass);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
console.log("Updated input classes in XuLyDoXaView.tsx");
