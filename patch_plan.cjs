const fs = require('fs');
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf8');

// Remove from top
code = code.replace(/<button\s*onClick=\{handleLockInit\}\s*disabled=\{filteredData\.length === 0 \|\| isLocking \|\| selectedTeam === 'Đội'\}\s*className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200"\s*>\s*<CheckCircle className="w-4 h-4" \/>\s*\{isLocking \? 'Đang chốt\.\.\.' : \(selectedMonth\.includes\('\/'\) \? 'Chốt TH Tháng' : 'Chốt TH Năm'\)\}\s*<\/button>\n\s*/, '');

// Put into bottom
code = code.replace(/<div className="flex items-center gap-6 self-end md:self-auto">/, `<div className="flex flex-col md:flex-row items-end md:items-center gap-6 self-end md:self-auto">
                <button
                   onClick={handleLockInit}
                   disabled={filteredData.length === 0 || isLocking}
                   className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200"
                >
                   <CheckCircle className="w-4 h-4" />
                   {isLocking ? 'Đang chốt...' : (selectedMonth.includes('/') ? 'Chốt TH Tháng' : 'Chốt TH Năm')}
                </button>`);

fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
