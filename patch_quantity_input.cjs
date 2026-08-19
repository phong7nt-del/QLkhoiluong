const fs = require('fs');

let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

// The input uses parseInt: 
// const val = e.target.value;
// updateQuantity(dm.name, val === '' ? '' : (parseInt(val) || 1));
// It also has min="1"

// Wait, the requested feature is only for "Học/họp" to allow 0.5.
// Let's change min="1" to min="0.1" step="0.1" and use parseFloat instead of parseInt for everything?
// Or specifically for "Học/họp"? It's better to just allow floats everywhere and use parseFloat, min="0" step="any".
// Actually, using parseFloat is safer.

code = code.replace(/min="1"/g, 'min="0" step="any"');
code = code.replace(/parseInt\(val\)/g, 'parseFloat(val)');

fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
console.log("Patched input for quantity to allow floats");
