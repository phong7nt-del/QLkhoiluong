const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const target = `                               // new behavior: merge by gId across different teams and content 
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

const replacement = `                               // new behavior: merge by gId AND EXACT CONTENT across different teams
                               // NEVER merge ID 0
                               if (gIdNorm > 0) {
                                   existing = newWorkloads.find(w => {
                                       if (w.date !== formattedDate) return false;
                                       if (w.content !== normalizedContent) return false;
                                       const wLines = w.content.split('\\n');
                                       const wLast = wLines[wLines.length - 1].trim();
                                       const wId = /^\\d+$/.test(wLast) ? parseInt(wLast, 10) : 0;
                                       return wId === gIdNorm;
                                   });
                               }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
    console.log("Success: updated merge logic in DataStore");
} else {
    console.log("Failed: could not find merge target in DataStore");
}
