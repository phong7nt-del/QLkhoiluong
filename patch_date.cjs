const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

const oldDateLogic = `  const now = new Date();
  const localYYYY = now.getFullYear();
  const localMM = (now.getMonth() + 1).toString().padStart(2, '0');
  const localDD = now.getDate().toString().padStart(2, '0');
  const defaultThoiGian = \`\${localYYYY}-\${localMM}-\${localDD}\`;`;

const newDateLogic = `  const now = new Date();
  const defaultThoiGian = \`\${now.getDate().toString().padStart(2, '0')}/\${(now.getMonth() + 1).toString().padStart(2, '0')}/\${now.getFullYear()}\`;`;

code = code.replace(oldDateLogic, newDateLogic);

const oldInput = `<input type="date" value={formData.thoiGianXl || defaultThoiGian} onChange={e => setFormData({...formData, thoiGianXl: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" />`;
const newInput = `<input type="text" placeholder="DD/MM/YYYY" value={formData.thoiGianXl || defaultThoiGian} onChange={e => setFormData({...formData, thoiGianXl: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" />`;

code = code.replace(oldInput, newInput);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
