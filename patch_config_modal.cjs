const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const stateTarget = `  const [syncing, setSyncing] = useState(false);`;
const stateReplace = `  const [excludeSat, setExcludeSat] = useState(DataStore.getExcludeSaturday());
  const [excludeSun, setExcludeSun] = useState(DataStore.getExcludeSunday());
  const [syncing, setSyncing] = useState(false);`;

const uiTarget = `            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">`;
const uiReplace = `            <div className="space-y-3 bg-[#E4E3E0] bg-opacity-20 p-4 border border-[#141414]">
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
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">`;

if (code.includes(stateTarget) && code.includes(uiTarget)) {
    code = code.replace(stateTarget, stateReplace);
    code = code.replace(uiTarget, uiReplace);
    code = code.replace(`2. Mã Code Apps Script Mới`, `3. Mã Code Apps Script Mới`);
    fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
    console.log("Success: added config UI to ConfigModal");
} else {
    console.log("Failed to find targets in ConfigModal");
}
