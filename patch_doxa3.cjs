const fs = require('fs');
let content = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

// Initialize tenKh in form state
content = content.replace(
    "maDd: '',\n    cachXl: '',",
    "maDd: '',\n    tenKh: '',\n    cachXl: '',"
);

// Add tenKh column to columnFilters
content = content.replace(
    "stt: '', loaiXl: '', maDd: '', cachXl: '', nguoiXl: '', thoiGianXl: '', ketQua: '', ghiChu: ''",
    "stt: '', loaiXl: '', maDd: '', tenKh: '', cachXl: '', nguoiXl: '', thoiGianXl: '', ketQua: '', ghiChu: ''"
);

// Add input field in form (after maDd)
content = content.replace(
    `<label className="block text-sm font-bold text-slate-700 mb-1">Nhập mã điểm đo</label>
                   <input type="text" value={formData.maDd} onChange={e => setFormData({...formData, maDd: e.target.value})} placeholder="" className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" required />
                </div>`,
    `<label className="block text-sm font-bold text-slate-700 mb-1">Nhập mã điểm đo</label>
                   <input type="text" value={formData.maDd} onChange={e => setFormData({...formData, maDd: e.target.value})} placeholder="" className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" required />
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Tên khách hàng</label>
                   <input type="text" value={formData.tenKh || ''} onChange={e => setFormData({...formData, tenKh: e.target.value})} placeholder="" className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" />
                </div>`
);

// handleImportExcel
content = content.replace(
    "maDd: row['Mã điểm đo'] || row['Mã ĐĐ'] || row['Ma DD'] || row['Mã DD'] || '',",
    "maDd: row['Mã điểm đo'] || row['Mã ĐĐ'] || row['Ma DD'] || row['Mã DD'] || '',\n              tenKh: row['Tên khách hàng'] || row['Tên KH'] || row['Ten KH'] || '',"
);

// Export/Tooltip guide
content = content.replace(
    "• Mã điểm đo (bắt buộc)",
    "• Mã điểm đo (bắt buộc)\n• Tên KH"
);

// Add table header th
content = content.replace(
    `<th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('maDd')}>Mã ĐĐ {sortField === 'maDd' && (sortDir === 'asc' ? '↑' : '↓')}</th>`,
    `<th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('maDd')}>Mã ĐĐ {sortField === 'maDd' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('tenKh')}>Tên KH {sortField === 'tenKh' && (sortDir === 'asc' ? '↑' : '↓')}</th>`
);

// Add filter th
content = content.replace(
    `<th className="px-2 py-2"><input type="text" className="w-full px-2 py-1.5 text-sm bg-white text-slate-900 font-bold border-2 border-blue-200 focus:border-blue-500 rounded outline-none placeholder-slate-400" placeholder="Lọc..." value={columnFilters.maDd} onChange={e => setColumnFilters({...columnFilters, maDd: e.target.value})} /></th>`,
    `<th className="px-2 py-2"><input type="text" className="w-full px-2 py-1.5 text-sm bg-white text-slate-900 font-bold border-2 border-blue-200 focus:border-blue-500 rounded outline-none placeholder-slate-400" placeholder="Lọc..." value={columnFilters.maDd} onChange={e => setColumnFilters({...columnFilters, maDd: e.target.value})} /></th>
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1.5 text-sm bg-white text-slate-900 font-bold border-2 border-blue-200 focus:border-blue-500 rounded outline-none placeholder-slate-400" placeholder="Lọc..." value={columnFilters.tenKh} onChange={e => setColumnFilters({...columnFilters, tenKh: e.target.value})} /></th>`
);

// Add table body td
content = content.replace(
    `<td className="px-4 py-2 font-bold text-red-600">{row.maDd}</td>`,
    `<td className="px-4 py-2 font-bold text-red-600">{row.maDd}</td>
                              <td className="px-4 py-2">{row.tenKh}</td>`
);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', content, 'utf8');
console.log("Patched XuLyDoXaView.tsx");

