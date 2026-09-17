const fs = require('fs');
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf8');

code = code.replace(/const mMatch = selectedMonth\.match\(\/\\(\\\\d\+\\)\\\\/\\(\\\\d\{4\}\\)\/\);[\s\S]*?if \(targetYear !== -1 && targetMonth !== -1\) \{/, `const mMatch = selectedMonth.match(/(\\d+)\\/(\\d{4})/);
      const yMatch = selectedMonth.match(/^(\\d{4})$/);
      let targetMonth = -1;
      let targetYear = -1;
      let isYearPlan = false;
      if (mMatch) {
          targetMonth = parseInt(mMatch[1]);
          targetYear = parseInt(mMatch[2]);
      } else if (yMatch) {
          targetYear = parseInt(yMatch[1]);
          isYearPlan = true;
      }
          
      // Determine the plan key prefix based on selectedTeam
      const pChar = getTeamPrefix(selectedTeam);
      const prefix = pChar ? \`\${pChar} -\` : (isYearPlan ? "Năm" : "Tháng");
          
      const planColumnKey = \`\${prefix} \${selectedMonth}\`;
          
      // Calculate actual quantities
      const actualQtyMap = new Map<string, number>();
          
      if (targetYear !== -1) {`);

code = code.replace(/if \(eYear === targetYear && eMonth === targetMonth\) \{/, `if (eYear === targetYear && (isYearPlan || eMonth === targetMonth)) {`);

code = code.replace(/\} else if \(dm\.history\[\`Tháng \$\{selectedMonth\}\`\] !== undefined\) \{/, `} else if (dm.history[\`Năm \${selectedMonth}\`] !== undefined) {
                  planQty = dm.history[\`Năm \${selectedMonth}\`];
              } else if (dm.history[\`Tháng \${selectedMonth}\`] !== undefined) {`);

fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
