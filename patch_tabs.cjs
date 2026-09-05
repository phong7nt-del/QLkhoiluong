const fs = require('fs');
let content = fs.readFileSync('src/components/DisconnectRateTab.tsx', 'utf8');

// Update lucide-react imports
content = content.replace(
    "import { RefreshCw, AlertCircle, WifiOff, Users, ChevronRight, Search, Filter, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';",
    "import { RefreshCw, AlertCircle, WifiOff, Users, ChevronRight, Search, Filter, ArrowUp, ArrowDown, ArrowUpDown, Wrench, Cpu, PieChart, Building2 } from 'lucide-react';"
);

const startStr = "{/* Sub-tab Navigation */}";
const endStr = "         )}";

const startIndex = content.indexOf(startStr);
const subTabDcuIndex = content.indexOf("subTab === 'dcu'", startIndex);
const nextEndIndex = content.indexOf("</div>", subTabDcuIndex) + 6;

const oldNav = content.substring(startIndex, nextEndIndex);

const newNav = `{/* Sub-tab Navigation */}
      <div className="flex border-b border-[#141414]/20 bg-white shadow-sm overflow-x-auto">
         <button 
            onClick={() => setSubTab('xuly')}
            className={\`px-6 py-3.5 font-extrabold uppercase tracking-widest text-sm transition-all whitespace-nowrap flex items-center gap-2 \${
                subTab === 'xuly' 
                ? 'bg-[#141414] text-white' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }\`}
         >
            <Wrench size={16} />
            Xử lý
         </button>
         <button 
            onClick={() => setSubTab('dcu')}
            className={\`px-6 py-3.5 font-extrabold uppercase tracking-widest text-sm transition-all whitespace-nowrap flex items-center gap-2 \${
                subTab === 'dcu' 
                ? 'bg-[#141414] text-white' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }\`}
         >
            <Cpu size={16} />
            Thông tin DCU
         </button>
         <button 
            onClick={() => setSubTab('overview')}
            className={\`px-6 py-3.5 font-extrabold uppercase tracking-widest text-sm transition-all whitespace-nowrap flex items-center gap-2 \${
                subTab === 'overview' 
                ? 'bg-[#141414] text-white' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }\`}
         >
            <PieChart size={16} />
            Thống kê khu vực
         </button>
         <button 
            onClick={() => setSubTab('details')}
            className={\`px-6 py-3.5 font-extrabold uppercase tracking-widest text-sm transition-all whitespace-nowrap flex items-center gap-2 \${
                subTab === 'details' 
                ? 'bg-[#141414] text-white' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }\`}
         >
            <Building2 size={16} />
            Thống kê Trạm
         </button>
         <button 
            onClick={() => setSubTab('statistics')}
            className={\`px-6 py-3.5 font-extrabold uppercase tracking-widest text-sm transition-all whitespace-nowrap flex items-center gap-2 \${
                subTab === 'statistics' 
                ? 'bg-[#141414] text-white' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }\`}
         >
            <Users size={16} />
            Thống kê KH
         </button>
      </div>`;

content = content.replace(oldNav, newNav);
fs.writeFileSync('src/components/DisconnectRateTab.tsx', content, 'utf8');
console.log('Patched DisconnectRateTab.tsx navigation');
