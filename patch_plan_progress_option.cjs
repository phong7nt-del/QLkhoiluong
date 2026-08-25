const fs = require('fs');

let fileContent = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf8');

// 1. Add state
const targetState = `  const [showAllTasks, setShowAllTasks] = useState(false);`;
const insertState = `  const [showAllTasks, setShowAllTasks] = useState(false);
  const [onlyPlannedTasks, setOnlyPlannedTasks] = useState(false);`;
fileContent = fileContent.replace(targetState, insertState);

// 2. Update summaryStats logic
const targetSummaryStats = `  const summaryStats = useMemo(() => {
    let totalPlanRaw = 0;
    let totalActualRaw = 0;
    let totalPlanStandard = 0;
    let totalActualStandard = 0;

    planData.forEach(d => {
       if (d.planQty > 0 || d.actualQty > 0) {`;
const insertSummaryStats = `  const summaryStats = useMemo(() => {
    let totalPlanRaw = 0;
    let totalActualRaw = 0;
    let totalPlanStandard = 0;
    let totalActualStandard = 0;

    planData.forEach(d => {
       if (d.planQty > 0 || (d.actualQty > 0 && !onlyPlannedTasks)) {`;
fileContent = fileContent.replace(targetSummaryStats, insertSummaryStats);

const targetSummaryDeps = `  }, [planData]);`;
const insertSummaryDeps = `  }, [planData, onlyPlannedTasks]);`;
fileContent = fileContent.replace(targetSummaryDeps, insertSummaryDeps);

// 3. Update footer UI
const targetFooter = `<div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex justify-end items-center shrink-0">
            <div className="flex items-center gap-6">`;
const insertFooter = `<div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row justify-between items-center shrink-0 gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-200/50 p-2 rounded-lg transition-colors -ml-2 self-start md:self-auto">
                <input 
                    type="checkbox" 
                    checked={onlyPlannedTasks} 
                    onChange={(e) => setOnlyPlannedTasks(e.target.checked)} 
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="font-medium text-slate-700">Chỉ tính tỷ lệ trên các mục có giao Kế hoạch</span>
            </label>
            <div className="flex items-center gap-6 self-end md:self-auto">`;
fileContent = fileContent.replace(targetFooter, insertFooter);

fs.writeFileSync('src/components/PlanProgressTab.tsx', fileContent, 'utf8');
console.log("Patched PlanProgressTab with onlyPlannedTasks option!");
