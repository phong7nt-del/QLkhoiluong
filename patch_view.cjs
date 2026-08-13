const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

code = code.replace(
  "    loaiXl: 'Trạm',\n    nguoiXl: currentUserName,\n    thoiGianXl: '',\n    maDd: '',\n    cachXl: '',\n    ghiChu: ''",
  "    loaiXl: 'Trạm',\n    nguoiXl: currentUserName,\n    thoiGianXl: '',\n    maDd: '',\n    cachXl: '',\n    ketQua: 'Xong',\n    ghiChu: ''"
);

code = code.replace(
  "const now = new Date();\n  const defaultThoiGian = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')} ${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()}`;",
  "const now = new Date();\n  const localYYYY = now.getFullYear();\n  const localMM = (now.getMonth() + 1).toString().padStart(2, '0');\n  const localDD = now.getDate().toString().padStart(2, '0');\n  const defaultThoiGian = `${localYYYY}-${localMM}-${localDD}`;"
);

code = code.replace(
  "        thoiGianXl: formData.thoiGianXl || defaultThoiGian,\n        maDd: formData.maDd || '',\n        cachXl: formData.cachXl || '',\n        ghiChu: formData.ghiChu || ''\n    };",
  "        thoiGianXl: formData.thoiGianXl || defaultThoiGian,\n        maDd: formData.maDd || '',\n        cachXl: formData.cachXl || '',\n        ketQua: formData.ketQua || 'Xong',\n        ghiChu: formData.ghiChu || ''\n    };"
);

code = code.replace(
  "setFormData({ ...formData, maDd: '', cachXl: '', ghiChu: '' });",
  "setFormData({ ...formData, maDd: '', cachXl: '', ghiChu: '' });"
);

code = code.replace(
  "           (item.loaiXl?.toLowerCase().includes(lower)) ||\n           (item.ghiChu?.toLowerCase().includes(lower))\n        );",
  "           (item.loaiXl?.toLowerCase().includes(lower)) ||\n           (item.ghiChu?.toLowerCase().includes(lower)) ||\n           (item.ketQua?.toLowerCase().includes(lower))\n        );"
);

code = code.replace(
  "          'Mã DD': item.maDd,\n          'Cách XL': item.cachXl,\n          'Ghi chú': item.ghiChu",
  "          'Mã DD': item.maDd,\n          'Cách XL': item.cachXl,\n          'Kết quả': item.ketQua,\n          'Ghi chú': item.ghiChu"
);

code = code.replace(
  "      'Reset nguồn', 'thay modem', 'Reset modem', 'Thay DCU', 'Thay sim', 'Thay Điện kế', 'Xử lý Nhiễu', 'chưa xử lý được', 'Khác'",
  "      'Kiểm tra sai trạm', 'Reset nguồn', 'thay modem', 'Reset modem', 'Thay DCU', 'Thay sim', 'Thay Điện kế', 'Xử lý Nhiễu', 'chưa xử lý được', 'Khác'"
);

code = code.replace(
  "<input type=\"text\" value={formData.thoiGianXl} onChange={e => setFormData({...formData, thoiGianXl: e.target.value})} placeholder={defaultThoiGian} className=\"w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium\" />",
  "<input type=\"date\" value={formData.thoiGianXl || defaultThoiGian} onChange={e => setFormData({...formData, thoiGianXl: e.target.value})} className=\"w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium\" />"
);

code = code.replace(
  "<input type=\"text\" value={formData.maDd} onChange={e => setFormData({...formData, maDd: e.target.value})} placeholder=\"7 ký tự cuối mã KH\" className=\"w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium\" required />",
  "<input type=\"text\" value={formData.maDd} onChange={e => setFormData({...formData, maDd: e.target.value})} placeholder=\"\" className=\"w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium\" required />"
);

code = code.replace(
  "                   <select value={formData.cachXl} onChange={e => setFormData({...formData, cachXl: e.target.value})} className=\"w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium\" required>\n                       <option value=\"\">-- Chọn hướng xử lý --</option>\n                       {huongXuLyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}\n                   </select>\n                </div>\n                \n                <div>\n                   <label className=\"block text-sm font-bold text-slate-700 mb-1\">Ghi chú</label>",
  `                   <select value={formData.cachXl} onChange={e => setFormData({...formData, cachXl: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" required>
                       <option value="">-- Chọn hướng xử lý --</option>
                       {huongXuLyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                   </select>
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Kết quả xử lý</label>
                   <select value={formData.ketQua} onChange={e => setFormData({...formData, ketQua: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" required>
                       <option value="Xong">Xong</option>
                       <option value="Chưa">Chưa</option>
                   </select>
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Ghi chú</label>`
);


code = code.replace(
  "<th className=\"px-4 py-3 cursor-pointer hover:bg-slate-800\" onClick={() => handleSort('thoiGianXl')}>Thời gian XL {sortField === 'thoiGianXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>\n                          <th className=\"px-4 py-3\">Ghi chú</th>",
  "<th className=\"px-4 py-3 cursor-pointer hover:bg-slate-800\" onClick={() => handleSort('thoiGianXl')}>Thời gian XL {sortField === 'thoiGianXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>\n                          <th className=\"px-4 py-3 cursor-pointer hover:bg-slate-800\" onClick={() => handleSort('ketQua')}>Kết quả {sortField === 'ketQua' && (sortDir === 'asc' ? '↑' : '↓')}</th>\n                          <th className=\"px-4 py-3\">Ghi chú</th>"
);

code = code.replace(
  "<td className=\"px-4 py-2 whitespace-nowrap\">{row.thoiGianXl}</td>\n                              <td className=\"px-4 py-2\">{row.ghiChu}</td>\n                          </tr>",
  "<td className=\"px-4 py-2 whitespace-nowrap\">{row.thoiGianXl}</td>\n                              <td className=\"px-4 py-2 font-bold\">{row.ketQua}</td>\n                              <td className=\"px-4 py-2\">{row.ghiChu}</td>\n                          </tr>"
);

code = code.replace(
  "<tr><td colSpan={7} className=\"px-4 py-8 text-center text-slate-500 font-medium\">Không có dữ liệu</td></tr>",
  "<tr><td colSpan={8} className=\"px-4 py-8 text-center text-slate-500 font-medium\">Không có dữ liệu</td></tr>"
);


fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
