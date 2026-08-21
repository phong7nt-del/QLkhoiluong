const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const targetLoop = `                               const parts = dateStr.split('/');
                               let formattedDate = dateStr;
                               if (parts.length >= 2) {
                                   let day = parts[0];
                                   let month = parts[1];
                                   let year = parts[2] || new Date().getFullYear().toString();
                                   formattedDate = \`\${year}-\${month.padStart(2, '0')}-\${day.padStart(2, '0')}\`;
                               }

                               // Combine duplicate entries
                               let existing = newWorkloads.find(w => w.date === formattedDate && w.team === finalTeam && w.content === cellValue);
                               if (existing) {
                                   if (!existing.members.includes(memberName)) {
                                       existing.members.push(memberName);
                                   }
                               } else {
                                   newWorkloads.push({
                                       id: Math.random().toString(36).substring(2, 9),
                                       content: cellValue,
                                       team: finalTeam,
                                       members: [memberName],
                                       timestamp: Date.now(),
                                       date: formattedDate
                                   });
                               }`;

const replacementLoop = `                               const parts = dateStr.split('/');
                               let formattedDate = dateStr;
                               if (parts.length >= 2) {
                                   let day = parts[0];
                                   let month = parts[1];
                                   let year = parts[2] || new Date().getFullYear().toString();
                                   formattedDate = \`\${year}-\${month.padStart(2, '0')}-\${day.padStart(2, '0')}\`;
                               }

                               // Normalize group IDs based on content
                               let normalizedContent = cellValue;
                               const lines = cellValue.split('\\n');
                               const lastLine = lines[lines.length - 1].trim();
                               if (/^\\d+$/.test(lastLine)) {
                                   const gId = parseInt(lastLine, 10);
                                   if (gId > 0) {
                                       const coreContent = lines.slice(0, lines.length - 1).join('\\n').trim();
                                       // We use a global registry for this parsing session to assign unique IDs per date + coreContent
                                       if (!json._tempGroupIds) json._tempGroupIds = {};
                                       if (!json._tempGroupIds[formattedDate]) json._tempGroupIds[formattedDate] = {};
                                       if (!json._tempGroupIds[formattedDate][coreContent]) {
                                           const count = Object.keys(json._tempGroupIds[formattedDate]).length + 1;
                                           json._tempGroupIds[formattedDate][coreContent] = 10000 + count; // Use a high unique ID like 10001, 10002
                                       }
                                       const uniqueId = json._tempGroupIds[formattedDate][coreContent];
                                       normalizedContent = coreContent + '\\n' + uniqueId;
                                   }
                               }

                               // Combine duplicate entries using normalized content
                               let existing = newWorkloads.find(w => w.date === formattedDate && w.team === finalTeam && w.content === normalizedContent);
                               if (existing) {
                                   if (!existing.members.includes(memberName)) {
                                       existing.members.push(memberName);
                                   }
                               } else {
                                   newWorkloads.push({
                                       id: Math.random().toString(36).substring(2, 9),
                                       content: normalizedContent,
                                       team: finalTeam,
                                       members: [memberName],
                                       timestamp: Date.now(),
                                       date: formattedDate
                                   });
                               }`;

if (code.includes(targetLoop)) {
    code = code.replace(targetLoop, replacementLoop);
    console.log("Successfully replaced parsing logic in DataStore");
} else {
    console.log("Could not find parsing logic in DataStore");
}

fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
