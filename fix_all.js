import fs from 'fs';

// 1. Fix TutiTab.tsx
let tutiCode = fs.readFileSync('src/components/TutiTab.tsx', 'utf-8');
tutiCode = tutiCode.replace("const newEntry = {", "const newEntry = {\n            id: Math.random().toString(36).substr(2, 9),");
fs.writeFileSync('src/components/TutiTab.tsx', tutiCode);

// 2. Fix DataStore.ts (remove duplicate getEntries, addEntry, updateEntry, deleteEntry, getUniqueContents)
let dsCode = fs.readFileSync('src/store/DataStore.ts', 'utf-8');
const regex = /  getEntries: \(\) => \{[\s\S]*?  syncKhoToSheet: /;
dsCode = dsCode.replace(regex, "  syncKhoToSheet: ");
fs.writeFileSync('src/store/DataStore.ts', dsCode);
