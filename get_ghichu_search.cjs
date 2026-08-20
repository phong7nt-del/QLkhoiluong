const fs = require('fs');
const content = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

console.log("=== Ghi Chu ===");
const ghiChuMatch = content.match(/<div[^>]*>[\s\S]*?<label[^>]*>Ghi chú[\s\S]*?<\/div>/);
if (ghiChuMatch) console.log(ghiChuMatch[0]);

console.log("\n=== Search ===");
const searchMatch = content.match(/<div className="relative w-full sm:w-64">[\s\S]*?<\/div>/);
if (searchMatch) console.log(searchMatch[0]);

