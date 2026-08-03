import fs from 'fs';
let code = fs.readFileSync('src/store/DataStore.ts', 'utf-8');
code = code.replace(/    return Array\.from\(contents\);\n  }\n\n  syncKhoToSheet:/, "    return Array.from(contents);\n  },\n\n  syncKhoToSheet:");
fs.writeFileSync('src/store/DataStore.ts', code);
