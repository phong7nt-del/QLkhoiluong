const fs = require('fs');
let content = fs.readFileSync('src/store/DataStore.ts', 'utf8');

// 1. Add keys to initDB
content = content.replace(
    "'sheet_chitietmkn_v1', 'sheet_sangtai_v1', 'sheet_kho_v1', 'sheet_vttb_v1'",
    "'sheet_chitietmkn_v1', 'sheet_sangtai_v1', 'sheet_kho_v1', 'sheet_vttb_v1', 'config_exclude_saturday', 'config_exclude_sunday', 'config_exclude_nghi'"
);

// 2. Add getExcludeNghi / setExcludeNghi
const newMethods = `
  getExcludeSaturday: () => {
      const val = safeGetItem('config_exclude_saturday');
      return val === 'true'; // Default is false
  },
  setExcludeSaturday: (val: boolean) => safeSetItem('config_exclude_saturday', val ? 'true' : 'false'),
  getExcludeSunday: () => {
      const val = safeGetItem('config_exclude_sunday');
      return val === 'true'; // Default is false
  },
  setExcludeSunday: (val: boolean) => safeSetItem('config_exclude_sunday', val ? 'true' : 'false'),
  getExcludeNghi: () => {
      const val = safeGetItem('config_exclude_nghi');
      return val !== 'false'; // Default is true (không tính)
  },
  setExcludeNghi: (val: boolean) => safeSetItem('config_exclude_nghi', val ? 'true' : 'false'),
`;

content = content.replace(
    /getExcludeSaturday: \(\) => \{[\s\S]*?setExcludeSunday: \(val: boolean\) => safeSetItem\('config_exclude_sunday', val \? 'true' : 'false'\),/,
    newMethods.trim()
);

fs.writeFileSync('src/store/DataStore.ts', content, 'utf8');
console.log("Patched DataStore.ts");
