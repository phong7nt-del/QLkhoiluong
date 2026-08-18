const fs = require('fs');
let code = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

const oldCalc2 = `                let qtyPerMember = totalQty;
                
                return { isTask: true, taskName, cleanTaskName, qty: qtyPerMember, rawLine: cleanLine };`;

const newCalc2 = `                let qtyPerMember = totalQty;
                if (membersCount >= 3) {
                    qtyPerMember = (totalQty * 2) / membersCount;
                }
                
                return { isTask: true, taskName, cleanTaskName, qty: qtyPerMember, rawLine: cleanLine };`;

if (code.includes(oldCalc2)) {
    code = code.replace(oldCalc2, newCalc2);
    fs.writeFileSync('src/components/Analytics.tsx', code, 'utf8');
    console.log("Patched Analytics.tsx successfully for processContentLines");
} else {
    console.log("Could not find oldCalc2 in Analytics.tsx");
}
