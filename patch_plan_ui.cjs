const fs = require('fs');

let fileContent = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf8');

const targetUI = `                        <div className="flex flex-col text-right">
                            <span className="text-[10px] text-slate-400 font-medium">Tổng Kế Hoạch</span>
                            <span className="text-sm font-bold text-slate-600">{summaryStats.totalPlan}</span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="text-[10px] text-slate-400 font-medium">Tổng Thực Hiện</span>
                            <span className="text-sm font-bold text-indigo-600">{summaryStats.totalActual}</span>
                        </div>
                        <div className="flex flex-col text-right ml-2 border-l border-slate-300 pl-4">`;

const insertUI = `                        <div className="flex flex-col text-right" title="Giá trị thô (chưa quy đổi định mức)">
                            <span className="text-[10px] text-slate-400 font-medium">Tổng Kế Hoạch</span>
                            <span className="text-sm font-bold text-slate-600">{summaryStats.totalPlan}</span>
                            <span className="text-[9px] text-slate-500 font-medium">~ {summaryStats.totalPlanStandard.toFixed(1)} ngày</span>
                        </div>
                        <div className="flex flex-col text-right" title="Giá trị thô (chưa quy đổi định mức)">
                            <span className="text-[10px] text-slate-400 font-medium">Tổng Thực Hiện</span>
                            <span className="text-sm font-bold text-indigo-600">{summaryStats.totalActual}</span>
                            <span className="text-[9px] text-indigo-400 font-medium">~ {summaryStats.totalActualStandard.toFixed(1)} ngày</span>
                        </div>
                        <div className="flex flex-col text-right ml-2 border-l border-slate-300 pl-4">`;

fileContent = fileContent.replace(targetUI, insertUI);

fs.writeFileSync('src/components/PlanProgressTab.tsx', fileContent, 'utf8');
console.log("Patched PlanProgressTab UI!");

