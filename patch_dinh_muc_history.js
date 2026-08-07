import fs from 'fs';
let code = fs.readFileSync('src/store/DataStore.ts', 'utf-8');

code = code.replace(
  "                                     if (k.toLowerCase().includes('tháng') || k.toLowerCase().includes('thang')) {",
  "                                     if (k.toLowerCase().includes('tháng') || k.toLowerCase().includes('thang') || /\\d+\\/\\d{4}/.test(k)) {"
);

fs.writeFileSync('src/store/DataStore.ts', code);
