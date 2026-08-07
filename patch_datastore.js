import fs from 'fs';
let code = fs.readFileSync('src/store/DataStore.ts', 'utf-8');

// 1. Extend type
code = code.replace("getDinhMuc: (): { name: string; quota: number; isGroup?: boolean }[] => {", 
"getDinhMuc: (): { name: string; quota: number; isGroup?: boolean; history?: Record<string, number> }[] => {");

// 2. Extract history
const newDinhMucDef = `const newDinhMuc: any[] = [];`;
code = code.replace(/const newDinhMuc: {name: string, quota: number, isGroup: boolean}\[\] = \[\];/, newDinhMucDef);

const csvParseDinhMuc = `
                                 let isGroupStr = groupKey ? String(row[groupKey] || '').toLowerCase().trim() : '';
                                 let isGroup = isGroupStr === 'x';
                                 
                                 let history: Record<string, number> = {};
                                 keys.forEach(k => {
                                     if (k.toLowerCase().includes('tháng') || k.toLowerCase().includes('thang')) {
                                         let hVal = parseFloat(String(row[k] || '0').replace(/,/g, '.'));
                                         if (!isNaN(hVal)) history[k.trim()] = hVal;
                                     }
                                 });

                                 if (val1 && val1.toLowerCase() !== 'stt') {
                                     newDinhMuc.push({ name: val1, quota: val2, isGroup, history });
                                 }`;
code = code.replace(/let isGroupStr = groupKey \? String\(row\[groupKey\] \|\| ''\)\.toLowerCase\(\)\.trim\(\) : '';[\s\S]*?newDinhMuc\.push\(\{ name: val1, quota: val2, isGroup \}\);\n                                 \}/, csvParseDinhMuc);

// 3. Add syncPlanToSheet function
const syncPlanFunc = `
  syncPlanToSheet: async (monthYear: string, items: {name: string, quantity: number}[]) => {
     try {
         const url = DataStore.getAppScriptUrl();
         if (!url) return false;
         
         const payload = {
            action: 'update_plan_month',
            monthYear,
            items
         };
         
         await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
         });
         return true;
     } catch (e) {
         return false;
     }
  },`;

code = code.replace("syncMasterData: async () => {", syncPlanFunc + "\n  syncMasterData: async () => {");

fs.writeFileSync('src/store/DataStore.ts', code);
