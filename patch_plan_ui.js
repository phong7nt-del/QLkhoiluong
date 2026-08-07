import fs from 'fs';
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf-8');

const exportFn = `
  const exportToExcel = () => {
    // Tổng quát
    let totalPlan = 0;
    let totalActual = 0;
    planData.forEach(d => {
       if (d.planQty > 0 || d.actualQty > 0) {
          totalPlan += d.planQty;
          totalActual += d.actualQty;
       }
    });
    const avgProgress = totalPlan > 0 ? (totalActual / totalPlan) * 100 : 0;
    
    const summaryData = [
       ["BÁO CÁO TIẾN ĐỘ KẾ HOẠCH"],
       ["Tháng:", selectedMonth, "Tổ/Đội:", selectedTeam],
       ["Tổng khối lượng kế hoạch:", totalPlan],
       ["Tổng khối lượng thực hiện:", totalActual],
       ["Tỷ lệ hoàn thành tổng thể:", avgProgress.toFixed(2) + "%"],
       []
    ];
    
    // Chi tiết
    const detailData = [
       ["STT", "Nội dung công việc", "Kế hoạch", "Thực hiện", "Tỷ lệ (%)", "Đánh giá"]
    ];
    
    filteredData.forEach((row, idx) => {
       let statusText = "Chậm tiến độ";
       if (row.progress >= 100) statusText = "Hoàn thành";
       else if (row.progress >= 50) statusText = "Đang thực hiện";
       
       detailData.push([
          idx + 1,
          row.name,
          row.planQty,
          row.actualQty,
          row.progress.toFixed(2),
          statusText
       ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet([...summaryData, ...detailData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TienDo");
    XLSX.writeFile(wb, \`TienDo_\${selectedTeam}_\${selectedMonth.replace('/', '-')}.xlsx\`);
  };
`;

if (!code.includes("exportToExcel")) {
   code = code.replace("const requestSort", exportFn + "\n  const requestSort");
}

const buttonsUI = `
         <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
            <button
               onClick={() => setShowAllTasks(!showAllTasks)}
               className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
            >
               {showAllTasks ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
               {showAllTasks ? 'Ẩn mục KH = 0' : 'Hiện tất cả'}
            </button>
            <button
               onClick={exportToExcel}
               disabled={filteredData.length === 0}
               className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-200"
            >
               <FileSpreadsheet className="w-4 h-4" />
               Xuất Excel
            </button>
         </div>
         <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
`;

code = code.replace('<div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">', buttonsUI);

fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
