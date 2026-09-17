const fs = require('fs');
let code = fs.readFileSync('src/components/BirthdayTab.tsx', 'utf8');

code = code.replace(/<div className="flex items-center gap-3 bg-white p-5 rounded-2xl shadow-sm border border-rose-100">/, `<div className="flex flex-col gap-2 bg-white p-5 rounded-2xl shadow-sm border border-rose-100">
         <div className="text-xs text-slate-400 bg-slate-50 p-2 rounded">
             Debug: Tổng số {members.length} members. 
             Có {members.filter(m => m.sinhNhat).length} người có trường sinhNhat. 
             Dữ liệu mẫu: {members.slice(0, 3).map(m => m.name + ' (' + (m.sinhNhat||'null') + ')').join(', ')}
         </div>
      <div className="flex items-center gap-3">`);

fs.writeFileSync('src/components/BirthdayTab.tsx', code);
