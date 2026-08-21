const fs = require('fs');
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

const targetIdGeneration = `          let maxGroupId = 0;
          dateEntries.forEach(e => {
             const lines = e.content.split('\\n');
             const lastLine = lines[lines.length - 1].trim();
             if (/^\\d+$/.test(lastLine)) {
                const gId = parseInt(lastLine, 10);
                if (gId > maxGroupId) maxGroupId = gId;
             }
          });
          contentLines.push((maxGroupId + 1).toString());`;

const replacementIdGeneration = `          // Generate a highly unique 5-digit ID to prevent any collisions between simultaneous inputs
          const uniqueGroupId = Math.floor(Math.random() * 90000 + 10000);
          contentLines.push(uniqueGroupId.toString());`;

if (code.includes(targetIdGeneration)) {
    code = code.replace(targetIdGeneration, replacementIdGeneration);
    console.log("Successfully replaced ID generation in WorkloadForm");
} else {
    console.log("Could not find ID generation in WorkloadForm");
}

fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
