import fs from 'fs';
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf-8');

code = code.replace(
  "       setSelectedTasks(resetTasks);",
  "       setSelectedTasks(resetTasks);\n       onSaved();"
);

fs.writeFileSync('src/components/WorkloadForm.tsx', code);
