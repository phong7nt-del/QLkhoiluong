import fs from 'fs';

let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf-8');

// Replace enter handler
code = code.replace(/if \(members\.length >= 2\) \{[\s\S]*?\} else \{[\s\S]*?setMembers\(prev => \[\.\.\.prev, exactMatch\.name\]\);[\s\S]*?\}/, 'setMembers(prev => [...prev, exactMatch.name]);');

// Replace suggestion click handler
code = code.replace(/if \(members\.length >= 2\) \{[\s\S]*?\} else \{[\s\S]*?setMembers\(prev => \[\.\.\.prev, suggestion\]\);[\s\S]*?\}/, 'setMembers(prev => [...prev, suggestion]);');

fs.writeFileSync('src/components/WorkloadForm.tsx', code);
