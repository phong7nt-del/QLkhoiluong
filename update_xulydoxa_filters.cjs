const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

// 1. Replace const [filterText, setFilterText] = useState('');
code = code.replace(
  /const \[filterText, setFilterText\] = useState\(''\);/,
  "const [columnFilters, setColumnFilters] = useState<Record<string, string>>({\n    stt: '', loaiXl: '', maDd: '', cachXl: '', nguoiXl: '', thoiGianXl: '', ketQua: '', ghiChu: ''\n  });"
);

// 2. Remove the general search bar
const searchRegex = /<div className="relative">[\s\S]*?<Search className="w-4 h-4 absolute left-3 top-1\/2 -translate-y-1\/2 text-slate-400" \/>[\s\S]*?<input type="text" placeholder="Tìm kiếm\.\.\." value=\{filterText\} onChange=\{e => setFilterText\(e\.target\.value\)\} className="pl-9 pr-4 py-1\.5 border-2 border-slate-200 rounded-lg text-sm focus:border-\[#141414\] outline-none" \/>[\s\S]*?<\/div>/;
code = code.replace(searchRegex, '');

// 3. Update useEffect and useMemo dependencies
code = code.replace(/filterText/g, 'columnFilters');

// 4. Update the filtering logic
const oldFilterLogic = `    if (columnFilters) {

        const lower = columnFilters.toLowerCase();
        result = result.filter(item => 
           (item.maDd?.toLowerCase().includes(lower)) ||
           (item.cachXl?.toLowerCase().includes(lower)) ||
           (item.nguoiXl?.toLowerCase().includes(lower)) ||
           (item.loaiXl?.toLowerCase().includes(lower)) ||
           (item.ghiChu?.toLowerCase().includes(lower)) ||
           (item.ketQua?.toLowerCase().includes(lower)) ||
           (item.thoiGianXl?.toLowerCase().includes(lower))
        );
    }`;

const newFilterLogic = `    Object.entries(columnFilters).forEach(([key, value]) => {
        if (value.trim() !== '') {
            const lower = value.toLowerCase();
            result = result.filter((item: any) => {
                const itemValue = String(item[key] || '').toLowerCase();
                return itemValue.includes(lower);
            });
        }
    });`;

if (code.includes(oldFilterLogic)) {
    code = code.replace(oldFilterLogic, newFilterLogic);
} else {
    // try looser matching
    const oldFilterRegex = /if \(columnFilters\) \{\s*const lower = columnFilters\.toLowerCase\(\);\s*result = result\.filter\([\s\S]*?\);\s*\}/;
    code = code.replace(oldFilterRegex, newFilterLogic);
}

// 5. Update the Ghi Chu input to take full width
const ghiChuRegex = /<div>(\s*<label className="block text-sm font-bold text-slate-700 mb-1">Ghi chú<\/label>\s*<textarea rows=\{2\} value=\{formData\.ghiChu\})/;
code = code.replace(ghiChuRegex, '<div className="md:col-span-2 lg:col-span-3">$1');

// 6. Update the table headers
const oldThead = `<thead className="bg-[#141414] text-white uppercase text-xs">
                      <tr>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('stt')}>STT {sortField === 'stt' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('loaiXl')}>Loại XL {sortField === 'loaiXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('maDd')}>Mã ĐĐ {sortField === 'maDd' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('cachXl')}>Cách XL {sortField === 'cachXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('nguoiXl')}>Người XL {sortField === 'nguoiXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('thoiGianXl')}>Thời gian XL {sortField === 'thoiGianXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('ketQua')}>Kết quả {sortField === 'ketQua' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3">Ghi chú</th>
                      </tr>
                  </thead>`;

const newThead = `<thead className="bg-[#141414] text-white uppercase text-xs">
                      <tr>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('stt')}>STT {sortField === 'stt' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('loaiXl')}>Loại XL {sortField === 'loaiXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('maDd')}>Mã ĐĐ {sortField === 'maDd' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('cachXl')}>Cách XL {sortField === 'cachXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('nguoiXl')}>Người XL {sortField === 'nguoiXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('thoiGianXl')}>Thời gian XL {sortField === 'thoiGianXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('ketQua')}>Kết quả {sortField === 'ketQua' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('ghiChu')}>Ghi chú {sortField === 'ghiChu' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                      </tr>
                      <tr className="bg-slate-800">
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1 text-xs text-black border rounded outline-none font-normal" placeholder="Lọc..." value={columnFilters.stt} onChange={e => setColumnFilters({...columnFilters, stt: e.target.value})} /></th>
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1 text-xs text-black border rounded outline-none font-normal" placeholder="Lọc..." value={columnFilters.loaiXl} onChange={e => setColumnFilters({...columnFilters, loaiXl: e.target.value})} /></th>
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1 text-xs text-black border rounded outline-none font-normal" placeholder="Lọc..." value={columnFilters.maDd} onChange={e => setColumnFilters({...columnFilters, maDd: e.target.value})} /></th>
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1 text-xs text-black border rounded outline-none font-normal" placeholder="Lọc..." value={columnFilters.cachXl} onChange={e => setColumnFilters({...columnFilters, cachXl: e.target.value})} /></th>
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1 text-xs text-black border rounded outline-none font-normal" placeholder="Lọc..." value={columnFilters.nguoiXl} onChange={e => setColumnFilters({...columnFilters, nguoiXl: e.target.value})} /></th>
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1 text-xs text-black border rounded outline-none font-normal" placeholder="Lọc..." value={columnFilters.thoiGianXl} onChange={e => setColumnFilters({...columnFilters, thoiGianXl: e.target.value})} /></th>
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1 text-xs text-black border rounded outline-none font-normal" placeholder="Lọc..." value={columnFilters.ketQua} onChange={e => setColumnFilters({...columnFilters, ketQua: e.target.value})} /></th>
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1 text-xs text-black border rounded outline-none font-normal" placeholder="Lọc..." value={columnFilters.ghiChu} onChange={e => setColumnFilters({...columnFilters, ghiChu: e.target.value})} /></th>
                      </tr>
                  </thead>`;

if (code.includes(oldThead)) {
    code = code.replace(oldThead, newThead);
} else {
    // regex fallback
    const theadRegex = /<thead className="bg-\[#141414\] text-white uppercase text-xs">[\s\S]*?<\/thead>/;
    code = code.replace(theadRegex, newThead);
}

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
console.log("Updated XuLyDoXaView");
