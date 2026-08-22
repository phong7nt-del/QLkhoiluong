const fs = require('fs');

let fileContent = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf8');

const target1 = `  const requestSort = (key: string) => {`;
const insert1 = `  const summaryStats = useMemo(() => {
    let totalPlan = 0;
    let totalActual = 0;
    planData.forEach(d => {
       if (d.planQty > 0 || d.actualQty > 0) {
          totalPlan += d.planQty;
          totalActual += d.actualQty;
       }
    });
    const avgProgress = totalPlan > 0 ? (totalActual / totalPlan) * 100 : 0;
    
    let statusColor = "";
    let statusText = "";
    if (avgProgress >= 100) {
        statusColor = "text-emerald-600";
        statusText = "Hoàn thành Tốt";
    } else if (avgProgress >= 75) {
        statusColor = "text-indigo-600";
        statusText = "Khá";
    } else if (avgProgress >= 50) {
        statusColor = "text-amber-600";
        statusText = "Đang thực hiện";
    } else {
        statusColor = "text-rose-600";
        statusText = "Chậm tiến độ";
    }

    return { totalPlan, totalActual, avgProgress, statusColor, statusText };
  }, [planData]);

  const requestSort = (key: string) => {`;

const target2 = `         </div>
      </div>
    </div>
  );
}`;
const insert2 = `         </div>
         
         <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex justify-end items-center shrink-0">
            <div className="flex items-center gap-6">
                <div className="text-right">
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                        Nhận định tỷ lệ thực hiện của {selectedTeam}
                    </p>
                    <div className="flex items-end gap-4 justify-end">
                        <div className="flex flex-col text-right">
                            <span className="text-[10px] text-slate-400 font-medium">Tổng Kế Hoạch</span>
                            <span className="text-sm font-bold text-slate-600">{summaryStats.totalPlan}</span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="text-[10px] text-slate-400 font-medium">Tổng Thực Hiện</span>
                            <span className="text-sm font-bold text-indigo-600">{summaryStats.totalActual}</span>
                        </div>
                        <div className="flex flex-col text-right ml-2 border-l border-slate-300 pl-4">
                            <span className="text-[10px] text-slate-400 font-medium">Tỷ lệ hoàn thành</span>
                            <div className="flex items-baseline gap-2">
                                <span className={\`text-xl font-black \${summaryStats.statusColor}\`}>
                                    {summaryStats.avgProgress.toFixed(1)}%
                                </span>
                                <span className={\`text-xs font-bold uppercase \${summaryStats.statusColor}\`}>
                                    ({summaryStats.statusText})
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
}`;

if (fileContent.includes(target1) && fileContent.includes(target2)) {
    fileContent = fileContent.replace(target1, insert1);
    fileContent = fileContent.replace(target2, insert2);
    fs.writeFileSync('src/components/PlanProgressTab.tsx', fileContent, 'utf8');
    console.log("Patched PlanProgressTab successfully!");
} else {
    console.log("Targets not found!");
}
