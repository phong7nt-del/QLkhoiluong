import fs from 'fs';
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf-8');

code = code.replace(
  "resetTasks[k] = { selected: false, quantity: selectedTasks[k].quantity };",
  "resetTasks[k] = { selected: false, quantity: '' };"
);

fs.writeFileSync('src/components/WorkloadForm.tsx', code);
