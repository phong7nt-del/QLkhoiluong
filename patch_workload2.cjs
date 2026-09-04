const fs = require('fs');
let content = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

content = content.replace(
    "const qty = selectedTasks[dm.name]?.quantity || 1;",
    "const qty = selectedTasks[dm.name]?.quantity ?? '';"
);

fs.writeFileSync('src/components/WorkloadForm.tsx', content, 'utf8');
console.log("Patched WorkloadForm.tsx (render qty fallback)");
