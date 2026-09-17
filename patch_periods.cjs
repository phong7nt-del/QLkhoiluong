const fs = require('fs');
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf8');

code = code.replace(/const months = new Set<string>\(\);[\s\S]*?}, \[dinhMucList\]\);/, `const periods = new Set<string>();
     dinhMucList.forEach(dm => {
         if (dm.history) {
             Object.keys(dm.history).forEach(k => {
                 const mMonth = k.match(/(\\d+)\\/(\\d{4})/);
                 if (mMonth) {
                     periods.add(\`\${mMonth[1]}/\${mMonth[2]}\`);
                 } else {
                     const mYear = k.match(/(?:Năm| -)\\s*(\\d{4})/);
                     if (mYear) {
                         periods.add(mYear[1]);
                     }
                 }
             });
         }
     });
         
     const periodsArr = Array.from(periods).sort((a, b) => {
         const parseStr = (s) => {
             const m = s.match(/(\\d+)\\/(\\d{4})/);
             if (m) return parseInt(m[2]) * 100 + parseInt(m[1]);
             const y = s.match(/^(\\d{4})$/);
             if (y) return parseInt(y[1]) * 100 + 13;
             return 0;
         }
         return parseStr(b) - parseStr(a);
     });
         
     setAvailableMonths(periodsArr);
     if (periodsArr.length > 0 && !selectedMonth) {
         setSelectedMonth(periodsArr[0]);
     }
  }, [dinhMucList]);`);

fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
