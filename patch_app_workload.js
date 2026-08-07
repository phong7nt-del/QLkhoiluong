import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "<WorkloadForm onSaved={() => setRefreshToggle(prev => prev + 1)} refreshToggle={refreshToggle} />",
  "<WorkloadForm onSaved={() => setRefreshToggle(prev => prev + 1)} refreshToggle={refreshToggle} isManagement={isManagement} />"
);

fs.writeFileSync('src/App.tsx', code);
