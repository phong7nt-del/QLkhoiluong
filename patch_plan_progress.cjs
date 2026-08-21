const fs = require('fs');
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf8');

const oldMap = `      return dinhMucList.map(dm => {
          let planQty = 0;
          if (dm.history) {
              // Try exact match first
              if (dm.history[planColumnKey] !== undefined) {
                  planQty = dm.history[planColumnKey];
              } else if (selectedTeam.includes('Đội') && dm.history[\`D - \${selectedMonth}\`] !== undefined) {
                  planQty = dm.history[\`D - \${selectedMonth}\`];
              } else if (dm.history[planColumnKey] !== undefined) {
                  planQty = dm.history[planColumnKey];
              } else if (dm.history[\`Tháng \${selectedMonth}\`] !== undefined) {
                  // Fallback for old format
                  planQty = dm.history[\`Tháng \${selectedMonth}\`];
              }
          }
          
          const actualQty = actualQtyMap.get(dm.name) || 0;
          const progress = planQty > 0 ? (actualQty / planQty) * 100 : (actualQty > 0 ? 100 : 0);
          
          return {
              name: dm.name,
              planQty,
              actualQty,
              progress
          };
      });`;

const newMap = `      let mappedData = dinhMucList.map((dm: any) => {
          let planQty = 0;
          if (dm.history) {
              // Try exact match first
              if (dm.history[planColumnKey] !== undefined) {
                  planQty = dm.history[planColumnKey];
              } else if (selectedTeam.includes('Đội') && dm.history[\`D - \${selectedMonth}\`] !== undefined) {
                  planQty = dm.history[\`D - \${selectedMonth}\`];
              } else if (dm.history[\`Tháng \${selectedMonth}\`] !== undefined) {
                  // Fallback for old format
                  planQty = dm.history[\`Tháng \${selectedMonth}\`];
              }
          }
          
          const actualQty = actualQtyMap.get(dm.name) || 0;
          
          return {
              name: dm.name,
              planQty,
              actualQty,
              progress: 0,
              isGroup: dm.isGroup,
              relation: (dm.relation || '').trim()
          };
      });
      
      // Aggregate relations: Parent (1 char) += Children (starts with parent char, length > 1)
      mappedData.forEach(item => {
          if (item.relation && item.relation.length === 1) {
              const children = mappedData.filter(c => c.relation && c.relation.length > 1 && c.relation.startsWith(item.relation));
              let addedActual = 0;
              let addedPlan = 0;
              children.forEach(c => {
                  addedActual += c.actualQty;
                  addedPlan += c.planQty;
              });
              item.actualQty += addedActual;
              // Depending on requirements, we might want to aggregate planQty as well
              // item.planQty += addedPlan; 
          }
      });
      
      mappedData.forEach(item => {
          item.progress = item.planQty > 0 ? (item.actualQty / item.planQty) * 100 : (item.actualQty > 0 ? 100 : 0);
      });
      
      return mappedData;`;

if(code.includes(oldMap)) {
    code = code.replace(oldMap, newMap);
} else {
    console.log("Could not find oldMap");
    // Fallback regex
    const fallbackRegex = /return dinhMucList\.map\(dm => \{[\s\S]*?progress\s*\}\;\s*\}\)\;/;
    if (code.match(fallbackRegex)) {
        code = code.replace(fallbackRegex, newMap);
        console.log("Replaced with fallback regex");
    } else {
        console.log("Fallback regex also failed");
    }
}

fs.writeFileSync('src/components/PlanProgressTab.tsx', code, 'utf8');
console.log("Patched PlanProgressTab.tsx");
