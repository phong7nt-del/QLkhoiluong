import fs from 'fs';
let code = fs.readFileSync('src/store/DataStore.ts', 'utf-8');

const newLogic = `         const resData = await response.json();
         if (resData && resData.status === 'success') {
             try {
                let dmList = DataStore.getDinhMuc();
                let updated = false;
                for (const item of items) {
                    const dm = dmList.find(d => d.name === item.name);
                    if (dm) {
                        if (!dm.history) dm.history = {};
                        dm.history[monthYear] = item.quantity;
                        updated = true;
                    }
                }
                if (updated) {
                    safeSetItem(DINHMUC_KEY, JSON.stringify(dmList));
                }
             } catch(err) {
                 console.error('Error updating local cache for plan:', err);
             }
             return true;
         }
         return false;`;

code = code.replace(
  "         const resData = await response.json();\n         return resData && resData.status === 'success';",
  newLogic
);

fs.writeFileSync('src/store/DataStore.ts', code);
