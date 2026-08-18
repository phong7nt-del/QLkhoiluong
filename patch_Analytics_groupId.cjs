const fs = require('fs');
let code = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

const oldCalc1 = `          let qtyPerMember = qty;
          if (membersCount >= 3) {
              qtyPerMember = (qty * 2) / membersCount;
          }`;

const newCalc1 = `          const linesAll = content.split('\\n');
          const lastLine = linesAll[linesAll.length - 1].trim();
          const isGroupReport = /^\\d+$/.test(lastLine) && parseInt(lastLine, 10) > 0;

          let qtyPerMember = qty;
          if (isGroupReport && membersCount >= 3) {
              qtyPerMember = (qty * 2) / membersCount;
          }`;

if (code.includes(oldCalc1)) {
    code = code.replace(oldCalc1, newCalc1);
    console.log("Patched Analytics renderContentWithQuota");
} else {
    console.log("Could not find oldCalc1 in Analytics");
}

const oldCalc2 = `                let qtyPerMember = totalQty;
                if (membersCount >= 3) {
                    qtyPerMember = (totalQty * 2) / membersCount;
                }`;

const newCalc2 = `                const linesAll = content.split('\\n');
                const lastLine = linesAll[linesAll.length - 1].trim();
                const isGroupReport = /^\\d+$/.test(lastLine) && parseInt(lastLine, 10) > 0;

                let qtyPerMember = totalQty;
                if (isGroupReport && membersCount >= 3) {
                    qtyPerMember = (totalQty * 2) / membersCount;
                }`;

if (code.includes(oldCalc2)) {
    code = code.replace(oldCalc2, newCalc2);
    console.log("Patched Analytics processContentLines");
} else {
    console.log("Could not find oldCalc2 in Analytics");
}

fs.writeFileSync('src/components/Analytics.tsx', code, 'utf8');
