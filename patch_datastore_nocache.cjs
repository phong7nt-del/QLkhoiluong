const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

code = code.replace(
    "const res = await fetch(\`https://docs.google.com/spreadsheets/d/\${sheetId}/gviz/tq?tqx=out:csv&sheet=\${encodeURIComponent(\"XuLyDoXa\")}\`);",
    "const res = await fetch(\`https://docs.google.com/spreadsheets/d/\${sheetId}/gviz/tq?tqx=out:csv&sheet=\${encodeURIComponent(\"XuLyDoXa\")}&_=\${Date.now()}\`);"
);

fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
