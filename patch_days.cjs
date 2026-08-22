const fs = require('fs');
let code = fs.readFileSync('src/components/AnalysisTab.tsx', 'utf8');

const t1 = `            if (date) stats[m].daysWorked.add(date);`;
const r1 = `            if (date) {
                const dObj = new Date(date);
                const day = dObj.getDay();
                if (day !== 0 && day !== 6) {
                    stats[m].daysWorked.add(date);
                }
            }`;

const t2 = `            if (date) teamMemberStats[m].daysWorked.add(date);`;
const r2 = `            if (date) {
                const dObj = new Date(date);
                const day = dObj.getDay();
                if (day !== 0 && day !== 6) {
                    teamMemberStats[m].daysWorked.add(date);
                }
            }`;

if (code.includes(t1)) {
    code = code.replace(t1, r1);
    console.log("Replaced t1!");
} else {
    console.log("Could not find t1");
}

if (code.includes(t2)) {
    code = code.replace(t2, r2);
    console.log("Replaced t2!");
} else {
    console.log("Could not find t2");
}

fs.writeFileSync('src/components/AnalysisTab.tsx', code, 'utf8');
