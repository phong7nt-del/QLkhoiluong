import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(
  "DataStore.initDB().then(() => setDbReady(true));",
  "DataStore.initDB().then(() => {\n      setDbReady(true);\n      DataStore.syncMasterData().then(() => setRefreshToggle(prev => prev + 1));\n    });"
);
fs.writeFileSync('src/App.tsx', code);
