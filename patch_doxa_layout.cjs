const fs = require('fs');
let content = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

const target = `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Loại xử lý</label>
                   <div className="flex gap-4 items-center h-[42px]">
                       <label className="flex items-center gap-2 cursor-pointer">
                           <input type="radio" name="loaiXl" value="Trạm" checked={formData.loaiXl === 'Trạm'} onChange={(e) => setFormData({...formData, loaiXl: e.target.value})} className="w-4 h-4 text-[#141414] focus:ring-[#141414]"/>
                           <span className="font-medium text-slate-700">Trạm</span>
                       </label>
                       <label className="flex items-center gap-2 cursor-pointer">
                           <input type="radio" name="loaiXl" value="Điện kế" checked={formData.loaiXl === 'Điện kế'} onChange={(e) => setFormData({...formData, loaiXl: e.target.value})} className="w-4 h-4 text-[#141414] focus:ring-[#141414]"/>
                           <span className="font-medium text-slate-700">Điện kế</span>
                       </label>
                   </div>
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Người thực hiện</label>
                   <input type="text" value={formData.nguoiXl} onChange={e => setFormData({...formData, nguoiXl: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" />
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Thời gian thực hiện</label>
                   <input type="text" placeholder="DD/MM/YYYY" value={formData.thoiGianXl || defaultThoiGian} onChange={e => setFormData({...formData, thoiGianXl: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" />
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Nhập mã điểm đo</label>
                   <input type="text" value={formData.maDd} onChange={e => setFormData({...formData, maDd: e.target.value})} placeholder="" className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" required />
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Tên khách hàng</label>
                   <input type="text" value={formData.tenKh || ''} onChange={e => setFormData({...formData, tenKh: e.target.value})} placeholder="" className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" />
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Hướng xử lý</label>
                   <select value={formData.cachXl} onChange={e => setFormData({...formData, cachXl: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" required>
                       <option value="">-- Chọn hướng xử lý --</option>
                       {huongXuLyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                   </select>
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Kết quả xử lý</label>
                   <select value={formData.ketQua} onChange={e => setFormData({...formData, ketQua: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" required>
                       <option value="">-- Chọn kết quả --</option>
                       <option value="Xong">Xong</option>
                       <option value="Chưa">Chưa</option>
                   </select>
                </div>
                
                <div className="md:col-span-2 lg:col-span-3">
                   <label className="block text-sm font-bold text-slate-700 mb-1">Ghi chú</label>
                   <textarea rows={2} value={formData.ghiChu} onChange={e => setFormData({...formData, ghiChu: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium resize-none" placeholder="Nhập ghi chú..."></textarea>
                </div>
            </div>`;

const replacement = `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="lg:col-span-1">
                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Mã điểm đo</label>
                   <input type="text" value={formData.maDd} onChange={e => setFormData({...formData, maDd: e.target.value})} placeholder="" className="w-full px-3 py-1.5 text-sm border-2 border-slate-200 rounded focus:border-[#141414] outline-none text-[#141414] font-semibold" required />
                </div>
                
                <div className="lg:col-span-2">
                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Tên khách hàng</label>
                   <input type="text" value={formData.tenKh || ''} onChange={e => setFormData({...formData, tenKh: e.target.value})} placeholder="" className="w-full px-3 py-1.5 text-sm border-2 border-slate-200 rounded focus:border-[#141414] outline-none text-[#141414] font-medium" />
                </div>

                <div className="lg:col-span-1">
                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Loại xử lý</label>
                   <div className="flex gap-4 items-center h-[34px]">
                       <label className="flex items-center gap-1.5 cursor-pointer">
                           <input type="radio" name="loaiXl" value="Trạm" checked={formData.loaiXl === 'Trạm'} onChange={(e) => setFormData({...formData, loaiXl: e.target.value})} className="w-3.5 h-3.5 text-[#141414] focus:ring-[#141414]"/>
                           <span className="font-semibold text-slate-700 text-sm">Trạm</span>
                       </label>
                       <label className="flex items-center gap-1.5 cursor-pointer">
                           <input type="radio" name="loaiXl" value="Điện kế" checked={formData.loaiXl === 'Điện kế'} onChange={(e) => setFormData({...formData, loaiXl: e.target.value})} className="w-3.5 h-3.5 text-[#141414] focus:ring-[#141414]"/>
                           <span className="font-semibold text-slate-700 text-sm">Điện kế</span>
                       </label>
                   </div>
                </div>
                
                <div className="lg:col-span-1">
                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Hướng xử lý</label>
                   <select value={formData.cachXl} onChange={e => setFormData({...formData, cachXl: e.target.value})} className="w-full px-3 py-1.5 text-sm border-2 border-slate-200 rounded focus:border-[#141414] outline-none text-[#141414] font-semibold" required>
                       <option value="">-- Chọn hướng xử lý --</option>
                       {huongXuLyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                   </select>
                </div>
                
                <div className="lg:col-span-1">
                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Kết quả</label>
                   <select value={formData.ketQua} onChange={e => setFormData({...formData, ketQua: e.target.value})} className="w-full px-3 py-1.5 text-sm border-2 border-slate-200 rounded focus:border-[#141414] outline-none text-[#141414] font-semibold" required>
                       <option value="">-- Chọn kết quả --</option>
                       <option value="Xong">Xong</option>
                       <option value="Chưa">Chưa</option>
                   </select>
                </div>

                <div className="lg:col-span-1">
                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Người thực hiện</label>
                   <input type="text" value={formData.nguoiXl} onChange={e => setFormData({...formData, nguoiXl: e.target.value})} className="w-full px-3 py-1.5 text-sm border-2 border-slate-200 rounded focus:border-[#141414] outline-none text-[#141414] font-medium" />
                </div>
                
                <div className="lg:col-span-1">
                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Thời gian</label>
                   <input type="text" placeholder="DD/MM/YYYY" value={formData.thoiGianXl || defaultThoiGian} onChange={e => setFormData({...formData, thoiGianXl: e.target.value})} className="w-full px-3 py-1.5 text-sm border-2 border-slate-200 rounded focus:border-[#141414] outline-none text-[#141414] font-medium" />
                </div>
                
                <div className="md:col-span-2 lg:col-span-4">
                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Ghi chú</label>
                   <textarea rows={1} value={formData.ghiChu} onChange={e => setFormData({...formData, ghiChu: e.target.value})} className="w-full px-3 py-1.5 text-sm border-2 border-slate-200 rounded focus:border-[#141414] outline-none text-[#141414] font-medium resize-none" placeholder="Nhập ghi chú..."></textarea>
                </div>
            </div>`;

content = content.replace(target, replacement);

// adjust buttons sizes
content = content.replace(
    `className="flex gap-4 items-center"`,
    `className="flex gap-3 items-center pt-1"`
);

content = content.replace(
    /px-6 py-2.5 font-bold/g,
    "px-4 py-1.5 text-sm font-bold"
);

// padding of the top div of the form
content = content.replace(
    `className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] p-6"`,
    `className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] p-4 sm:p-5"`
);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', content, 'utf8');
console.log("Patched XuLyDoXaView.tsx");

