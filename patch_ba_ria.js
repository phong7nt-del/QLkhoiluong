import fs from 'fs';
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf-8');
code = code.replace(
  'else if (team.includes("Bà Rịa")) prefix = "B -";',
  'else if (team.includes("Bà Rịa") || team.includes("Bà Ria")) prefix = "B -";'
);
fs.writeFileSync('src/components/WorkloadForm.tsx', code);

let code2 = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf-8');
code2 = code2.replace(
  'else if (selectedTeam.includes("Bà Rịa")) prefix = "B -";',
  'else if (selectedTeam.includes("Bà Rịa") || selectedTeam.includes("Bà Ria")) prefix = "B -";'
);
fs.writeFileSync('src/components/PlanProgressTab.tsx', code2);
