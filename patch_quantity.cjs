const fs = require('fs');

let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

// The issue is in lines like:
// const selectedList = entries.filter(([_, data]: [string, any]) => data.selected && typeof data.quantity === 'number' && data.quantity > 0);
// We should allow quantity > 0 regardless of typeof.
// Wait, the quantity state is currently typed as `number | string`.
// When they type in an input, it might become a string.
// Let's modify the condition `typeof data.quantity === 'number' && data.quantity > 0`
// to just `Number(data.quantity) > 0`

code = code.replace(/typeof data\.quantity === 'number' && data\.quantity > 0/g, 'Number(data.quantity) > 0');

// Also update `hasSelectedTasks`
code = code.replace(/typeof data\.quantity === 'number' && data\.quantity > 0/g, 'Number(data.quantity) > 0');

fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
console.log("Patched quantity check");
