const fs = require('fs');

let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

const oldCheck = `onChange={e => {
                                 const val = e.target.value;
                                 updateQuantity(dm.name, val === '' ? '' : (parseFloat(val) || 1));
                              }}`;
const newCheck = `onChange={e => {
                                 updateQuantity(dm.name, e.target.value);
                              }}`;

if (code.includes(oldCheck)) {
    code = code.replace(oldCheck, newCheck);
    fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
    console.log("Fixed input 0 bug");
} else {
    console.log("Could not find the target codeblock");
}
