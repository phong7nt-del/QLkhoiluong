const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

code = code.replace(
  /fetch\(\`\/api\/proxy\/gviz\?sheet=\$\{encodeURIComponent\((.*?)\)\}&sheetId=\$\{sheetId\}\`\)/g,
  "fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent($1)}`)"
);

fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
