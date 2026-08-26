const fs = require('fs');
let content = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

content = content.replace(
    "colSpan={8}",
    "colSpan={9}"
);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', content, 'utf8');
console.log("Patched XuLyDoXaView.tsx for colSpan");
