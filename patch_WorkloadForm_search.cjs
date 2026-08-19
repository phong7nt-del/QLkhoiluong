const fs = require('fs');
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

// 1. Add state
const oldState = `const [selectedTasks, setSelectedTasks] = useState<Record<string, {selected: boolean, quantity: number | string}>>({});`;
const newState = `const [selectedTasks, setSelectedTasks] = useState<Record<string, {selected: boolean, quantity: number | string}>>({});
  const [taskSearch, setTaskSearch] = useState('');`;

if (code.includes(oldState)) {
    code = code.replace(oldState, newState);
} else {
    console.log("Could not find oldState");
}

// 2. Add input and filter mapping
const oldRender = `<label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Các Nội Dung Công Việc</label>
           <div className="space-y-1.5 bg-slate-50/50 rounded-xl p-3 border border-slate-200 max-h-[28rem] overflow-y-auto">
             {dinhMucList.length > 0 ? (
               dinhMucList.map(dm => {`;
const newRender = `<label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Các Nội Dung Công Việc</label>
           <div className="mb-3 relative">
               <input 
                 type="text" 
                 value={taskSearch} 
                 onChange={e => setTaskSearch(e.target.value)}
                 placeholder="Tìm nhanh nội dung công việc..."
                 className="w-full bg-[#E4E3E0]/50 border border-[#141414]/20 p-2 text-sm focus:outline-none focus:border-[#141414]"
               />
           </div>
           <div className="space-y-1.5 bg-slate-50/50 rounded-xl p-3 border border-slate-200 max-h-[28rem] overflow-y-auto">
             {dinhMucList.length > 0 ? (
               dinhMucList.filter(dm => dm.name.toLowerCase().includes(taskSearch.toLowerCase())).map(dm => {`;

if (code.includes(oldRender)) {
    code = code.replace(oldRender, newRender);
} else {
    console.log("Could not find oldRender");
}

fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
console.log("Patched taskSearch");
