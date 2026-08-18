const fs = require('fs');
let code = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

const oldCalc = `          let qtyPerMember = qty;
          let displayQty = qtyPerMember;`;

const newCalc = `          let qtyPerMember = qty;
          if (membersCount >= 3) {
              qtyPerMember = (qty * 2) / membersCount;
          }
          let displayQty = qtyPerMember;`;

if (code.includes(oldCalc)) {
    code = code.replace(oldCalc, newCalc);
    fs.writeFileSync('src/components/Analytics.tsx', code, 'utf8');
    console.log("Patched Analytics.tsx successfully for renderContentWithQuota");
} else {
    console.log("Could not find oldCalc in Analytics.tsx");
}
