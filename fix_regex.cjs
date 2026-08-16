const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

// Replace all occurrences of /(^|\/)0+(\d)/g with /(^|\\/)0+(\\d)/g
// In the node source here, I need to escape backslashes so they literally appear in the string.
const oldRegexString = "/(^|\\/)0+(\\d)/g";
const newRegexString = "/(^|\\\\/)0+(\\\\d)/g";
code = code.split(oldRegexString).join(newRegexString);

fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
console.log("Fixed regex successfully.");
