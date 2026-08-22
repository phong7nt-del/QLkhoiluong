const fs = require('fs');
let code = fs.readFileSync('src/components/AnalysisTab.tsx', 'utf8');

const t1 = `  const [sortField, setSortField] = useState<'totalQuantity' | 'productivity' | 'totalTasks'>('productivity');`;
const r1 = `  const [sortField, setSortField] = useState<'totalQuantity' | 'productivity' | 'totalTasks'>('productivity');
  const excludeSat = useMemo(() => DataStore.getExcludeSaturday(), [refreshToggle]);
  const excludeSun = useMemo(() => DataStore.getExcludeSunday(), [refreshToggle]);`;

const t2 = `                const day = dObj.getDay();
                if (day !== 0 && day !== 6) {
                    stats[m].daysWorked.add(date);
                }`;
const r2 = `                const day = dObj.getDay();
                let shouldCount = true;
                if (day === 0 && excludeSun) shouldCount = false;
                if (day === 6 && excludeSat) shouldCount = false;
                if (shouldCount) {
                    stats[m].daysWorked.add(date);
                }`;

const t3 = `                const day = dObj.getDay();
                if (day !== 0 && day !== 6) {
                    teamMemberStats[m].daysWorked.add(date);
                }`;
const r3 = `                const day = dObj.getDay();
                let shouldCount = true;
                if (day === 0 && excludeSun) shouldCount = false;
                if (day === 6 && excludeSat) shouldCount = false;
                if (shouldCount) {
                    teamMemberStats[m].daysWorked.add(date);
                }`;

if (code.includes(t1) && code.includes(t2) && code.includes(t3)) {
    code = code.replace(t1, r1);
    code = code.replace(t2, r2);
    code = code.replace(t3, r3);
    fs.writeFileSync('src/components/AnalysisTab.tsx', code, 'utf8');
    console.log("Success: added config usage to AnalysisTab");
} else {
    console.log("Failed to find targets in AnalysisTab");
}
