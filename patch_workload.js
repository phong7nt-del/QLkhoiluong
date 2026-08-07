import fs from 'fs';
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf-8');

// 1. Set teams to include "Đội" and remove disabled styles
code = code.replace(
  "setAvailableTeams(teams);",
  "setAvailableTeams(['Đội', ...teams.filter(t => t !== 'Đội')]);"
);

code = code.replace(
  'className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 font-semibold text-slate-600 focus:outline-none transition-all cursor-not-allowed opacity-90"',
  'className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"'
);

code = code.replace(
  'required\n              disabled\n            >',
  'required\n            >'
);

// 2. Format monthYear for Plan
const newMonthYearLogic = `    const d = new Date(date);
    let prefix = "Tháng";
    if (team === 'Đội') prefix = "D -";
    else if (team.includes("Phú Mỹ")) prefix = "P -";
    else if (team.includes("Bà Rịa")) prefix = "B -";
    else if (team.includes("Vũng Tàu")) prefix = "V -";
    const monthYear = \`\${prefix} \${d.getMonth() + 1}/\${d.getFullYear()}\`;`;

code = code.replace(
  "    const d = new Date(date);\n    const monthYear = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;",
  newMonthYearLogic
);

// 3. Clear form after success
const clearFormLogic = `       setMessage({ type: 'success', text: "Đã lưu kế hoạch tháng thành công!" });
       setTimeout(() => setMessage(null), 5000);
       // Reset form
       setTeam('');
       setMembers([]);
       const resetTasks: any = {};
       Object.keys(selectedTasks).forEach(k => {
          resetTasks[k] = { selected: false, quantity: selectedTasks[k].quantity };
       });
       setSelectedTasks(resetTasks);`;

code = code.replace(
  "       setMessage({ type: 'success', text: \"Đã lưu kế hoạch tháng thành công!\" });\n       setTimeout(() => setMessage(null), 5000);",
  clearFormLogic
);

fs.writeFileSync('src/components/WorkloadForm.tsx', code);
