const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

code = code.replace(/getExcludeNghi: \(\) => \{/, `getAllowAllLockPlan: () => {
      const val = safeGetItem('config_allow_all_lock_plan');
      return val === 'true'; // Default is false
  },
  setAllowAllLockPlan: (val: boolean) => safeSetItem('config_allow_all_lock_plan', val ? 'true' : 'false'),
  
  getExcludeNghi: () => {`);

fs.writeFileSync('src/store/DataStore.ts', code);
