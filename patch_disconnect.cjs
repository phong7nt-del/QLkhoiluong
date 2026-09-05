const fs = require('fs');
let content = fs.readFileSync('src/components/DisconnectRateTab.tsx', 'utf8');

// 1. Import DcuTab
content = content.replace(
    "import XuLyDoXaView from './XuLyDoXaView';",
    "import XuLyDoXaView from './XuLyDoXaView';\nimport DcuTab from './DcuTab';"
);

// 2. Change subTab type
content = content.replace(
    "const [subTab, setSubTab] = useState<'xuly' | 'overview' | 'details' | 'statistics'>('xuly');",
    "const [subTab, setSubTab] = useState<'xuly' | 'overview' | 'details' | 'statistics' | 'dcu'>('xuly');"
);

// 3. Add button in navigation
const btnStr = `
         <button 
            onClick={() => setSubTab('dcu')}
            className={\`px-6 py-3.5 font-extrabold uppercase tracking-widest text-sm transition-all whitespace-nowrap \${
                subTab === 'dcu' 
                ? 'bg-[#141414] text-white' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }\`}
         >
            Thông tin DCU
         </button>
`;

content = content.replace(
    /(<button\s+onClick=\{\(\) => setSubTab\('statistics'\)\}[\s\S]*?<\/button>)/,
    `$1\n${btnStr}`
);

// 4. Add rendering condition for DcuTab
const dcuRender = `
         {!loading && !error && subTab === 'dcu' && (
            <DcuTab />
         )}
`;

content = content.replace(
    /(\{\!loading && \!error && subTab === 'xuly' && \([\s\S]*?<\/XuLyDoXaView>\s*\)\})/,
    `$1\n${dcuRender}`
);

fs.writeFileSync('src/components/DisconnectRateTab.tsx', content, 'utf8');
console.log("Patched DisconnectRateTab.tsx");
