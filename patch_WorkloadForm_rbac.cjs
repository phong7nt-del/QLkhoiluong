const fs = require('fs');
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

code = code.replace(`import DataStore from '../store/DataStore';`, `import DataStore from '../store/DataStore';\nimport { PermissionStore } from '../store/PermissionStore';`);

const oldChecks = `const roleStr = sessionUser.role ? sessionUser.role.toLowerCase() : '';
      const isTeamLeader = roleStr.includes('tổ trưởng') || roleStr.includes('tổ phó');
      const isDeptLeader = roleStr.includes('đội trưởng') || roleStr.includes('đội phó') || roleStr.includes('giám đốc');`;

const newChecks = `const roleStr = sessionUser.role ? sessionUser.role.toLowerCase() : '';
      // isManagement logic replaced with PermissionStore check
      const canEditOthers = PermissionStore.hasActionAccess('edit_others_workload', roleStr);`;

if (code.includes(oldChecks)) {
    code = code.replace(oldChecks, newChecks);
}

const oldBlock = `if (!isDeptLeader && !isTeamLeader) {
        if (!members.includes(sessionUser.name)) {
          return false;
        }
      } else if (isTeamLeader && !isDeptLeader) {
        if (team !== sessionUser.team) {
          return false;
        }
      }`;

const newBlock = `if (!canEditOthers && !members.includes(sessionUser.name)) {
        return false;
      }`;

if (code.includes(oldBlock)) {
    code = code.replace(oldBlock, newBlock);
}

fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
