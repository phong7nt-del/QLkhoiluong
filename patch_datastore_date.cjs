const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const t1 = `                                       if (formattedDate <= '2026-08-20') {
                                           // We use a global registry for this parsing session to assign unique IDs per date + coreContent
                                           if (!json._tempGroupIds) json._tempGroupIds = {};
                                           if (!json._tempGroupIds[formattedDate]) json._tempGroupIds[formattedDate] = {};
                                           if (!json._tempGroupIds[formattedDate][coreContent]) {
                                               const count = Object.keys(json._tempGroupIds[formattedDate]).length + 1;
                                               json._tempGroupIds[formattedDate][coreContent] = 10000 + count; // Use a high unique ID like 10001, 10002
                                           }
                                           const uniqueId = json._tempGroupIds[formattedDate][coreContent];
                                           normalizedContent = coreContent + '\\n' + uniqueId;
                                       } else {
                                           normalizedContent = coreContent + '\\n' + gId;
                                       }`;

const r1 = `                                       normalizedContent = coreContent + '\\n' + gId;`;

const t2 = `                               if (formattedDate <= '2026-08-20') {
                                   // old behavior: merge if content is exactly the same
                                   existing = newWorkloads.find(w => w.date === formattedDate && w.team === finalTeam && w.content === normalizedContent);
                               } else {
                                   // new behavior: merge by gId across different teams and content 
                                   // NEVER merge ID 0
                                   if (gIdNorm > 0) {
                                       existing = newWorkloads.find(w => {
                                           if (w.date !== formattedDate) return false;
                                           const wLines = w.content.split('\\n');
                                           const wLast = wLines[wLines.length - 1].trim();
                                           const wId = /^\\d+$/.test(wLast) ? parseInt(wLast, 10) : 0;
                                           return wId === gIdNorm;
                                       });
                                   }
                               }`;

const r2 = `                               // new behavior: merge by gId across different teams and content 
                               // NEVER merge ID 0
                               if (gIdNorm > 0) {
                                   existing = newWorkloads.find(w => {
                                       if (w.date !== formattedDate) return false;
                                       const wLines = w.content.split('\\n');
                                       const wLast = wLines[wLines.length - 1].trim();
                                       const wId = /^\\d+$/.test(wLast) ? parseInt(wLast, 10) : 0;
                                       return wId === gIdNorm;
                                   });
                               }`;

if (code.includes(t1) && code.includes(t2)) {
    code = code.replace(t1, r1);
    code = code.replace(t2, r2);
    fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
    console.log("Success: removed old date hack from DataStore");
} else {
    console.log("Failed to find targets!");
}
