import fs from 'fs';
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf-8');

code = code.replace(
  "    const success = await DataStore.syncPlanToSheet(monthYear, selectedList);",
  "    const success = await DataStore.syncPlanToSheet(monthYear, selectedList);\n    if (success) {\n       await DataStore.syncMasterData(); // Refresh to get newly added plan data\n    }"
);

fs.writeFileSync('src/components/WorkloadForm.tsx', code);
