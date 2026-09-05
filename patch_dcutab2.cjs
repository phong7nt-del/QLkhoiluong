const fs = require('fs');
let content = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

// Add diaChi state
content = content.replace(
    "const [ten, setTen] = useState('');",
    "const [ten, setTen] = useState('');\n  const [diaChi, setDiaChi] = useState('');"
);

// Clear diaChi on success
content = content.replace(
    "setTen('');",
    "setTen('');\n          setDiaChi('');"
);

// Add diaChi to newDcu
content = content.replace(
    "ten,",
    "ten,\n          diaChi,"
);

// Add input field for diaChi
const inputToFind = `                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên DCU *</label>
                        <input type="text" value={ten} onChange={e => setTen(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-800" />
                    </div>`;
                    
const inputToReplace = `                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên DCU *</label>
                        <input type="text" value={ten} onChange={e => setTen(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-800" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa chỉ</label>
                        <input type="text" value={diaChi} onChange={e => setDiaChi(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-800" />
                    </div>`;

content = content.replace(inputToFind, inputToReplace);

// Add table column for diaChi
const thToFind = `<th className="px-4 py-3 border-b border-slate-200 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('ten')}>
                            <div className="flex items-center gap-1">Tên {sortCol === 'ten' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}</div>
                        </th>`;
                        
const thToReplace = `<th className="px-4 py-3 border-b border-slate-200 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('ten')}>
                            <div className="flex items-center gap-1">Tên {sortCol === 'ten' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}</div>
                        </th>
                        <th className="px-4 py-3 border-b border-slate-200 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('diaChi')}>
                            <div className="flex items-center gap-1">Địa chỉ {sortCol === 'diaChi' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}</div>
                        </th>`;

content = content.replace(thToFind, thToReplace);

// Add row data for diaChi, and onClick on tr
const trToFind = `                        filteredData.map((row, idx) => (
                            <tr key={idx} className={\`hover:bg-slate-50 transition-colors \${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}\`}>`;

const trToReplace = `                        filteredData.map((row, idx) => (
                            <tr 
                                key={idx} 
                                onClick={(e) => {
                                    // Bỏ qua nếu click vào link hoặc hình ảnh
                                    if ((e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('button')) return;
                                    setId(row.id || '');
                                    setTen(row.ten || '');
                                    setDiaChi(row.diaChi || '');
                                    setToadoX(row.toadoX || '');
                                    setToadoY(row.toadoY || '');
                                    setGhiChu(row.ghiChu || '');
                                    setImagePreview(row.hinhAnh || null);
                                    setImageFile(null);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={\`hover:bg-blue-50 cursor-pointer transition-colors \${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}\`}
                                title="Bấm để xem chi tiết trên form"
                            >`;

content = content.replace(trToFind, trToReplace);

// Add td for diaChi
const tdToFind = `<td className="px-4 py-3 text-slate-700 border-b border-slate-100">{row.ten}</td>`;
const tdToReplace = `<td className="px-4 py-3 text-slate-700 border-b border-slate-100">{row.ten}</td>
                                <td className="px-4 py-3 text-slate-700 border-b border-slate-100">{row.diaChi}</td>`;

content = content.replace(tdToFind, tdToReplace);

// Fix colSpan
content = content.replace(/colSpan=\{6\}/g, "colSpan={7}");

// Add diaChi to search filter
const searchToFind = `return String(i.id || '').toLowerCase().includes(s) || 
                  String(i.ten || '').toLowerCase().includes(s) ||
                  String(i.ghiChu || '').toLowerCase().includes(s);`;
const searchToReplace = `return String(i.id || '').toLowerCase().includes(s) || 
                  String(i.ten || '').toLowerCase().includes(s) ||
                  String(i.diaChi || '').toLowerCase().includes(s) ||
                  String(i.ghiChu || '').toLowerCase().includes(s);`;
                  
content = content.replace(searchToFind, searchToReplace);


fs.writeFileSync('src/components/DcuTab.tsx', content, 'utf8');
console.log('Patched DcuTab.tsx');
