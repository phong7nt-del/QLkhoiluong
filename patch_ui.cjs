const fs = require('fs');

let configModal = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

// Remove excludeSat/excludeSun from state in ConfigModal
configModal = configModal.replace(
`  const [excludeSat, setExcludeSat] = useState(DataStore.getExcludeSaturday());
  const [excludeSun, setExcludeSun] = useState(DataStore.getExcludeSunday());
  const [syncing, setSyncing] = useState(false);`,
`  const [syncing, setSyncing] = useState(false);`
);

// Remove the UI for "Cấu hình Năng Suất" from ConfigModal
const configUiTarget = `            <div className="space-y-3 bg-[#E4E3E0] bg-opacity-20 p-4 border border-[#141414]">
              <label className="block text-[10px] font-mono opacity-50 uppercase font-bold">2. Cấu hình Năng Suất</label>
              <div className="flex flex-col gap-2">
                 <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-black/5 p-1 -ml-1">
                    <input 
                       type="checkbox" 
                       checked={!excludeSat} 
                       onChange={(e) => {
                          const newVal = !e.target.checked;
                          setExcludeSat(newVal);
                          DataStore.setExcludeSaturday(newVal);
                       }} 
                       className="w-4 h-4"
                    />
                    Tính năng suất cho ngày Thứ Bảy
                 </label>
                 <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-black/5 p-1 -ml-1">
                    <input 
                       type="checkbox" 
                       checked={!excludeSun} 
                       onChange={(e) => {
                          const newVal = !e.target.checked;
                          setExcludeSun(newVal);
                          DataStore.setExcludeSunday(newVal);
                       }} 
                       className="w-4 h-4"
                    />
                    Tính năng suất cho ngày Chủ Nhật
                 </label>
              </div>
            </div>`;

configModal = configModal.replace(configUiTarget, '');
configModal = configModal.replace('3. Mã Code Apps Script Mới', '2. Mã Code Apps Script Mới');

fs.writeFileSync('src/components/ConfigModal.tsx', configModal, 'utf8');
console.log("Patched ConfigModal.tsx");

// Now update SystemTab.tsx
let systemTab = fs.readFileSync('src/components/SystemTab.tsx', 'utf8');

// Add import DataStore to SystemTab
if (!systemTab.includes("import { DataStore }")) {
    systemTab = systemTab.replace(
        `import { Shield, Save, CheckSquare, Square, RotateCcw } from 'lucide-react';`,
        `import { Shield, Save, CheckSquare, Square, RotateCcw } from 'lucide-react';\nimport { DataStore } from '../store/DataStore';`
    );
}

// Add state to SystemTab
systemTab = systemTab.replace(
    `    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);`,
    `    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [excludeSat, setExcludeSat] = useState(DataStore.getExcludeSaturday());
    const [excludeSun, setExcludeSun] = useState(DataStore.getExcludeSunday());`
);

// Add UI to SystemTab
const systemUiTarget = `                <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-4 border-slate-800 pl-2">Quyền Thao tác (Functions)</h3>`;

const systemUiReplace = `                <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-4 border-slate-800 pl-2">Cấu hình Năng Suất</h3>
                    <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 space-y-3">
                        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors -ml-2">
                            <input 
                                type="checkbox" 
                                checked={!excludeSat} 
                                onChange={(e) => {
                                    const newVal = !e.target.checked;
                                    setExcludeSat(newVal);
                                    DataStore.setExcludeSaturday(newVal);
                                }} 
                                className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
                            />
                            <span className="font-medium text-slate-700">Tính năng suất cho ngày Thứ Bảy</span>
                        </label>
                        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors -ml-2">
                            <input 
                                type="checkbox" 
                                checked={!excludeSun} 
                                onChange={(e) => {
                                    const newVal = !e.target.checked;
                                    setExcludeSun(newVal);
                                    DataStore.setExcludeSunday(newVal);
                                }} 
                                className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
                            />
                            <span className="font-medium text-slate-700">Tính năng suất cho ngày Chủ Nhật</span>
                        </label>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-4 border-slate-800 pl-2">Quyền Thao tác (Functions)</h3>`;

systemTab = systemTab.replace(systemUiTarget, systemUiReplace);

fs.writeFileSync('src/components/SystemTab.tsx', systemTab, 'utf8');
console.log("Patched SystemTab.tsx");

