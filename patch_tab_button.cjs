const fs = require('fs');
let code = fs.readFileSync('src/components/DisconnectRateTab.tsx', 'utf8');

code = code.replace(
  '         <button \n            onClick={() => setSubTab(\'overview\')}',
  '         <button \n            onClick={() => setSubTab(\'xuly\')}\n            className={`px-6 py-3.5 font-extrabold uppercase tracking-widest text-sm transition-all whitespace-nowrap ${\n                subTab === \'xuly\' \n                ? \'bg-[#141414] text-white\' \n                : \'text-slate-500 hover:text-slate-800 hover:bg-slate-50\'\n            }`}\n         >\n            Xử lý\n         </button>\n         <button \n            onClick={() => setSubTab(\'overview\')}'
);

fs.writeFileSync('src/components/DisconnectRateTab.tsx', code, 'utf8');
