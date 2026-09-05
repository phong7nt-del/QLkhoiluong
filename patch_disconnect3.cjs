const fs = require('fs');
let content = fs.readFileSync('src/components/DisconnectRateTab.tsx', 'utf8');

const oldEffect = `  useEffect(() => {
    if (subTab === 'xuly') {
        fetchXuLyData();
    } else {
        fetchData();
    }
  }, [refreshToggle]);`;

const newEffect = `  useEffect(() => {
    if (subTab === 'xuly') {
        fetchXuLyData();
    } else if (subTab !== 'dcu') {
        fetchData();
    }
  }, [refreshToggle]);`;

content = content.replace(oldEffect, newEffect);

fs.writeFileSync('src/components/DisconnectRateTab.tsx', content, 'utf8');
console.log("Patched DisconnectRateTab.tsx (fetch logic again)");
