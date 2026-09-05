const fs = require('fs');
let content = fs.readFileSync('src/components/DisconnectRateTab.tsx', 'utf8');

content = content.replace(
    /if \(subTab !== 'xuly'\) \{/,
    "if (subTab !== 'xuly' && subTab !== 'dcu') {"
);

content = content.replace(
    /if \(subTab === 'xuly'\) \{[\s\S]*?fetchXuLyData\(\);\[\s\S]*?\} else \{[\s\S]*?fetchData\(\);[\s\S]*?\}/,
    `if (subTab === 'xuly') {
        fetchXuLyData();
    } else if (subTab !== 'dcu') {
        fetchData();
    }`
);

fs.writeFileSync('src/components/DisconnectRateTab.tsx', content, 'utf8');
console.log("Patched DisconnectRateTab.tsx (fetch logic)");
