const fs = require('fs');
let code = fs.readFileSync('src/components/SystemTab.tsx', 'utf8');

code = code.replace(/const \[excludeNghi, setExcludeNghi\] = useState\(DataStore\.getExcludeNghi\(\)\);/, `const [excludeNghi, setExcludeNghi] = useState(DataStore.getExcludeNghi());
    const [allowAllLock, setAllowAllLock] = useState(DataStore.getAllowAllLockPlan());`);

code = code.replace(/Tính năng suất cho các ngày nghỉ \(Báo cáo nội dung: Nghỉ\)<\/span>\n\s*<\/label>/, `Tính năng suất cho các ngày nghỉ (Báo cáo nội dung: Nghỉ)</span>
                        </label>
                        
                        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors -ml-2">
                            <input 
                                type="checkbox" 
                                checked={allowAllLock} 
                                onChange={(e) => {
                                    const newVal = e.target.checked;
                                    setAllowAllLock(newVal);
                                    DataStore.setAllowAllLockPlan(newVal);
                                }} 
                                className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
                            />
                            <span className="font-medium text-slate-700">Cho phép tất cả người dùng được quyền Chốt tiến độ (KH & TH) - Nếu tắt, chỉ "Đội trưởng" hoặc "Tổ trưởng" của Tổ Tổng hợp mới được quyền chốt.</span>
                        </label>`);

fs.writeFileSync('src/components/SystemTab.tsx', code);
