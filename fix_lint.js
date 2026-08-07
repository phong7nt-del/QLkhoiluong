import fs from 'fs';
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf-8');

code = code.replace(
  "    const selectedList = entries.filter(([_, data]) => data.selected && typeof data.quantity === 'number' && data.quantity > 0);",
  "    const selectedList = entries.filter(([_, data]: [string, any]) => data.selected && typeof data.quantity === 'number' && data.quantity > 0);"
);

code = code.replace(
  "    const selectedList = entries.filter(([_, data]) => data.selected && typeof data.quantity === 'number' && data.quantity > 0).map(([name, data]) => ({name, quantity: data.quantity as number}));",
  "    const selectedList = entries.filter(([_, data]: [string, any]) => data.selected && typeof data.quantity === 'number' && data.quantity > 0).map(([name, data]: [string, any]) => ({name, quantity: data.quantity as number}));"
);

fs.writeFileSync('src/components/WorkloadForm.tsx', code);
