const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const t1 = `  setAppScriptUrl: (url: string) => safeSetItem(SCRIPT_URL_KEY, url),`;
const r1 = `  setAppScriptUrl: (url: string) => safeSetItem(SCRIPT_URL_KEY, url),

  getExcludeSaturday: () => {
      const val = safeGetItem('config_exclude_saturday');
      return val === 'true'; // Default is false
  },
  setExcludeSaturday: (val: boolean) => safeSetItem('config_exclude_saturday', val ? 'true' : 'false'),
  getExcludeSunday: () => {
      const val = safeGetItem('config_exclude_sunday');
      return val === 'true'; // Default is false
  },
  setExcludeSunday: (val: boolean) => safeSetItem('config_exclude_sunday', val ? 'true' : 'false'),`;

if (code.includes(t1)) {
    code = code.replace(t1, r1);
    fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
    console.log("Success: added config to DataStore");
} else {
    console.log("Failed to find target in DataStore");
}
