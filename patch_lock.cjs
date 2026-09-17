const fs = require('fs');
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf8');

code = code.replace(/const \[onlyPlannedTasks, setOnlyPlannedTasks\] = useState\(false\);/, `const [onlyPlannedTasks, setOnlyPlannedTasks] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [lockConfirm, setLockConfirm] = useState({ isOpen: false, isYear: false, lockedKey: '', items: [] as any[] });
  const [message, setMessage] = useState<{type: 'success'|'error', text: string}|null>(null);`);

// insert lock handler before requestSort
code = code.replace(/const requestSort = \(key: string\) => \{/, `const handleLockInit = () => {
     if (selectedTeam === 'Đội' || !selectedTeam) {
        setMessage({ type: 'error', text: 'Vui lòng chọn 1 Đội/Tổ cụ thể (không phải Toàn Đội) để chốt thực hiện.' });
        setTimeout(() => setMessage(null), 5000);
        return;
     }
     
     const mMatch = selectedMonth.match(/(\\d+)\\/(\\d{4})/);
     const yMatch = selectedMonth.match(/^(\\d{4})$/);
     let isYearPlan = false;
     let targetMonth = -1;
     let targetYear = -1;
     
     if (mMatch) {
         targetMonth = parseInt(mMatch[1]);
         targetYear = parseInt(mMatch[2]);
     } else if (yMatch) {
         targetYear = parseInt(yMatch[1]);
         isYearPlan = true;
     }
     
     const now = new Date();
     const currentYear = now.getFullYear();
     const currentMonth = now.getMonth() + 1;
     
     if (isYearPlan) {
        if (currentYear <= targetYear) {
           setMessage({ type: 'error', text: \`Chưa hết năm \${targetYear}, không thể chốt số liệu thực hiện!\` });
           setTimeout(() => setMessage(null), 5000);
           return;
        }
     } else {
        if (currentYear < targetYear || (currentYear === targetYear && currentMonth <= targetMonth)) {
           setMessage({ type: 'error', text: \`Chưa hết tháng \${targetMonth}/\${targetYear}, không thể chốt số liệu thực hiện!\` });
           setTimeout(() => setMessage(null), 5000);
           return;
        }
     }
     
     const pChar = getTeamPrefix(selectedTeam);
     const prefix = pChar ? \`\${pChar} -\` : (isYearPlan ? "Năm" : "Tháng");
     const lockedKey = \`\${prefix} \${selectedMonth}R\`;
     
     const alreadyLocked = dinhMucList.some(dm => dm.history && dm.history[lockedKey] !== undefined);
     if (alreadyLocked) {
        setMessage({ type: 'error', text: \`Số liệu \${isYearPlan ? 'năm' : 'tháng'} này của \${selectedTeam} đã được chốt trước đó!\` });
        setTimeout(() => setMessage(null), 5000);
        return;
     }
     
     const actualItems = planData.filter(item => item.actualQty > 0).map(item => ({
        name: item.name,
        quantity: item.actualQty
     }));
     
     if (actualItems.length === 0) {
        setMessage({ type: 'error', text: 'Không có khối lượng thực hiện nào > 0 để chốt!' });
        setTimeout(() => setMessage(null), 5000);
        return;
     }
     
     setLockConfirm({ isOpen: true, isYear: isYearPlan, lockedKey, items: actualItems });
  };
  
  const executeLock = async () => {
     setIsLocking(true);
     const success = await DataStore.syncPlanToSheet(lockConfirm.lockedKey, lockConfirm.items);
     setIsLocking(false);
     setLockConfirm({ ...lockConfirm, isOpen: false });
     
     if (success) {
        setMessage({ type: 'success', text: 'Chốt số liệu thành công!' });
        await DataStore.syncMasterData();
     } else {
        setMessage({ type: 'error', text: 'Có lỗi xảy ra khi chốt số liệu!' });
     }
     setTimeout(() => setMessage(null), 5000);
  };
  
  const requestSort = (key: string) => {`);

// insert lock UI buttons near export excel
code = code.replace(/<button\s*onClick=\{exportToExcel\}/, `<button
               onClick={handleLockInit}
               disabled={filteredData.length === 0 || isLocking || selectedTeam === 'Đội'}
               className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200"
            >
               <CheckCircle className="w-4 h-4" />
               {isLocking ? 'Đang chốt...' : (selectedMonth.includes('/') ? 'Chốt TH Tháng' : 'Chốt TH Năm')}
            </button>
            <button
               onClick={exportToExcel}`);

code = code.replace(/return \(/, `return (
    <>
    {message && (
        <div className={\`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-lg border animate-in fade-in slide-in-from-top-4 \${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}\`}>
           {message.text}
        </div>
    )}
    
    {lockConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận chốt thực hiện {lockConfirm.isYear ? 'năm' : 'tháng'}</h3>
              <p className="text-slate-600 text-sm mb-6">
                Bạn có chắc chắn muốn chốt số liệu thực hiện <strong>{lockConfirm.isYear ? 'năm' : 'tháng'} {selectedMonth}</strong> cho <strong>{selectedTeam}</strong>?
                Hệ thống sẽ tổng hợp tất cả khối lượng đã thực hiện và lưu vĩnh viễn vào cột <strong>[{lockConfirm.lockedKey}]</strong>. Hành động này không thể hoàn tác trên app.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setLockConfirm({...lockConfirm, isOpen: false})}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={executeLock}
                  className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm shadow-rose-600/20"
                >
                  Đồng ý chốt
                </button>
              </div>
            </div>
          </div>
        </div>
    )}
`);
fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
