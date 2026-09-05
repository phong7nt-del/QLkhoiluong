const fs = require('fs');
let content = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

const targetHover = "className={`hover:bg-blue-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}\n                                title=\"Bấm để xem chi tiết trên form\"";
const replaceHover = "className={`hover:bg-blue-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}\n                                title={listType === 'chua_phan_cong' ? \"Bấm để cập nhật\" : \"Bấm để xem chi tiết\"}";

content = content.replace(targetHover, replaceHover);

fs.writeFileSync('src/components/DcuTab.tsx', content, 'utf8');
console.log('Fixed DcuTab regex');
