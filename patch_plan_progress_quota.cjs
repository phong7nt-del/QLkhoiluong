const fs = require('fs');

let fileContent = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf8');

// 1. Update mappedData
const targetMappedData = `          const actualQty = actualQtyMap.get(dm.name) || 0;
          
          return {
              name: dm.name,
              planQty,
              actualQty,
              progress: 0,
              isGroup: dm.isGroup,
              relation: (dm.relation || '').trim()
          };`;

const insertMappedData = `          const actualQty = actualQtyMap.get(dm.name) || 0;
          const quotaStr = dm ? String(dm.quota).replace(/,/g, '.') : "0";
          const quota = parseFloat(quotaStr) || 0;
          
          return {
              name: dm.name,
              planQty,
              actualQty,
              progress: 0,
              isGroup: dm.isGroup,
              relation: (dm.relation || '').trim(),
              quota: quota
          };`;

fileContent = fileContent.replace(targetMappedData, insertMappedData);

// 2. Update summaryStats
const targetSummaryStats = `  const summaryStats = useMemo(() => {
    let totalPlan = 0;
    let totalActual = 0;
    planData.forEach(d => {
       if (d.planQty > 0 || d.actualQty > 0) {
          totalPlan += d.planQty;
          totalActual += d.actualQty;
       }
    });
    const avgProgress = totalPlan > 0 ? (totalActual / totalPlan) * 100 : 0;
    
    let statusColor = "";`;

const insertSummaryStats = `  const summaryStats = useMemo(() => {
    let totalPlanRaw = 0;
    let totalActualRaw = 0;
    let totalPlanStandard = 0;
    let totalActualStandard = 0;

    planData.forEach(d => {
       if (d.planQty > 0 || d.actualQty > 0) {
          totalPlanRaw += d.planQty;
          totalActualRaw += d.actualQty;
          
          if (d.quota > 0) {
              totalPlanStandard += d.planQty / d.quota;
              totalActualStandard += d.actualQty / d.quota;
          } else {
              totalPlanStandard += d.planQty * 0.05;
              totalActualStandard += d.actualQty * 0.05;
          }
       }
    });
    const avgProgress = totalPlanStandard > 0 ? (totalActualStandard / totalPlanStandard) * 100 : 0;
    
    let statusColor = "";`;

fileContent = fileContent.replace(targetSummaryStats, insertSummaryStats);

// Update return of summaryStats
const targetSummaryReturn = `    return { totalPlan, totalActual, avgProgress, statusColor, statusText };
  }, [planData]);`;

const insertSummaryReturn = `    return { totalPlan: totalPlanRaw, totalActual: totalActualRaw, totalPlanStandard, totalActualStandard, avgProgress, statusColor, statusText };
  }, [planData]);`;

fileContent = fileContent.replace(targetSummaryReturn, insertSummaryReturn);


// 3. Update exportToExcel
const targetExport = `  const exportToExcel = () => {
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
    
    const summaryData = [`;

const insertExport = `  const exportToExcel = () => {
    // Tổng quát
    const { totalPlan, totalActual, avgProgress } = summaryStats;
    
    const summaryData = [`;

fileContent = fileContent.replace(targetExport, insertExport);

// 4. Also we want to update the UI slightly to hint the user about the standard days?
// User said: để nhận định chính xác tỷ lệ hoàn thành kế hoạch, cần quy đổi theo định mức của từng loại công việc để tính khối lượng thực hiện so với khối lượng kế hoạch giao
// We can just add a tooltip or show it in the UI, but let's keep the UI clean. Just updating the logic is probably what they want.

fs.writeFileSync('src/components/PlanProgressTab.tsx', fileContent, 'utf8');
console.log("Patched PlanProgressTab with quota logic!");

