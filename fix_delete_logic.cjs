const fs = require('fs');
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

const oldLogic = `          if (/^\\d+$/.test(lastLine)) {
              // This is a group report, find everyone with the same group ID
              const groupId = lastLine;
              groupToDelete = [];
              dateEntries.forEach(e => {
                  const elines = e.content.split('\\n');
                  if (elines[elines.length - 1].trim() === groupId) {
                      groupToDelete.push(...e.members);
                  }
              });
              // remove duplicates
              groupToDelete = [...new Set(groupToDelete)];
          }`;

const newLogic = `          if (/^\\d+$/.test(lastLine)) {
              const groupId = lastLine;
              // Only group them if groupId is strictly greater than 0
              if (parseInt(groupId, 10) > 0) {
                  groupToDelete = [];
                  dateEntries.forEach(e => {
                      const elines = e.content.split('\\n');
                      if (elines[elines.length - 1].trim() === groupId) {
                          groupToDelete.push(...e.members);
                      }
                  });
                  groupToDelete = [...new Set(groupToDelete)];
              }
          }`;

if (code.includes(oldLogic)) {
    code = code.replace(oldLogic, newLogic);
    fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
    console.log("Fixed delete logic successfully!");
} else {
    console.log("Could not find oldLogic in WorkloadForm.tsx");
}
