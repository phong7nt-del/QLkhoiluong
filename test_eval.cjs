const fs = require('fs');
const content = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');
const match = content.match(/const SCRIPT_TEMPLATE = \`([\s\S]*?)\`;/);
if (match) {
    const evaluated = eval('\`' + match[1] + '\`');
    if (evaluated.includes('newVal = currentVal ? currentVal + "\\n- "')) {
        console.log("Success! Evaluated contains proper \\n-");
    } else {
        console.log("Failed! Evaluated string is: " + evaluated.substring(18000, 18500));
    }
}
