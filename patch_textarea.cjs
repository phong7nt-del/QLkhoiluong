const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

const oldGhiChu = `<input type="text" value={formData.ghiChu} onChange={e => setFormData({...formData, ghiChu: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" />`;
const newGhiChu = `<textarea rows={2} value={formData.ghiChu} onChange={e => setFormData({...formData, ghiChu: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium resize-none" placeholder="Nhập ghi chú..."></textarea>`;

if (code.includes(oldGhiChu)) {
    code = code.replace(oldGhiChu, newGhiChu);
    fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
    console.log("Replaced ghi chu input with textarea.");
} else {
    console.log("Could not find Ghi chu input string.");
}
