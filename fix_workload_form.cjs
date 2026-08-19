const fs = require('fs');

let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

const oldCheck = `      if (isDeptLeader) return true;
      if (isTeamLeader) {
          const allM = DataStore.getMembers();
          for (const m of members) {
              const memberInfo = allM.find(x => x.name === m);
              if (memberInfo && memberInfo.team === sessionUser.team) {
                  return true;
              }
          }
      }
      return false;`;

const newCheck = `      if (canEditOthers) return true;
      return false;`;

if (code.includes(oldCheck)) {
    code = code.replace(oldCheck, newCheck);
    console.log("Fixed isDeptLeader issue in WorkloadForm");
} else {
    console.log("Could not find old check");
}

fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
