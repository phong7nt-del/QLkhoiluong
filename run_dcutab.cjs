const fs = require('fs');
let content = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

// Add import XLSX
content = content.replace(
    /import \{ Camera, MapPin/,
    "import * as XLSX from 'xlsx';\nimport { Camera, MapPin"
);

// Add missing lucide icons for tabs
content = content.replace(
    /import \{ Camera, MapPin, Search, SortAsc, SortDesc, Save, AlertCircle, CheckCircle2, Image as ImageIcon, ZoomIn, ZoomOut, X \} from 'lucide-react';/,
    "import { Camera, MapPin, Search, SortAsc, SortDesc, Save, AlertCircle, CheckCircle2, Image as ImageIcon, ZoomIn, ZoomOut, X, Upload, ListTodo, CheckSquare, Edit } from 'lucide-react';"
);

// State for active list tab
content = content.replace(
    /const \[search, setSearch\] = useState\(''\);/,
    `const [search, setSearch] = useState('');
  const [listType, setListType] = useState<'chua_phan_cong' | 'da_phan_cong'>('chua_phan_cong');
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [isImporting, setIsImporting] = useState(false);`
);

// File import handler
const importHandler = `
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsImporting(true);
      setMessage(null);
      
      const reader = new FileReader();
      reader.onload = async (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = XLSX.utils.sheet_to_json(ws);
              
              const importData = data.map((row: any) => {
                  const getVal = (keys: string[]) => {
                      const k = Object.keys(row).find(key => keys.includes(key.toLowerCase().trim()));
                      return k ? String(row[k]) : '';
                  };
                  return {
                      id: getVal(['id', 'mã', 'ma']),
                      ten: getVal(['tên', 'ten', 'tên dcu']),
                      diaChi: getVal(['địa chỉ', 'dia chi', 'diachi'])
                  };
              }).filter(item => item.id);
              
              if (importData.length === 0) {
                  setMessage({ type: 'error', text: 'Không tìm thấy dữ liệu hợp lệ. Vui lòng đảm bảo file có cột ID.' });
                  setIsImporting(false);
                  return;
              }
              
              const success = await DataStore.importDcu(importData);
              if (success) {
                  setMessage({ type: 'success', text: \`Đã import thành công \${importData.length} DCU.\` });
                  loadData();
              } else {
                  setMessage({ type: 'error', text: 'Lỗi khi import dữ liệu.' });
              }
          } catch (err: any) {
              setMessage({ type: 'error', text: 'Lỗi đọc file: ' + err.message });
          }
          setIsImporting(false);
      };
      reader.readAsBinaryString(file);
      e.target.value = '';
  };
`;

content = content.replace(/const handleGetLocation/, importHandler + "\n  const handleGetLocation");

// Modify filteredData to depend on listType
content = content.replace(
    /const filteredData = useMemo\(\(\) => \{[\s\S]*?let filtered = data;/,
    `const filteredData = useMemo(() => {
      let filtered = data.filter(d => {
          const hasCoords = !!d.toadoX && !!d.toadoY;
          if (listType === 'chua_phan_cong') return !hasCoords;
          return hasCoords;
      });`
);
content = content.replace(/\[data, search, sortCol, sortDir\]\)/, "[data, search, sortCol, sortDir, listType])");

// Modify handleSubmit to handle updateMode and auto-next
content = content.replace(
    /const success = await DataStore\.addDcu\(newDcu\);[\s\S]*?setIsSubmitting\(false\);/,
    `let success = false;
      if (isUpdateMode) {
          success = await DataStore.updateDcu(newDcu);
      } else {
          success = await DataStore.addDcu(newDcu);
      }
      
      if (success) {
          setMessage({ type: 'success', text: isUpdateMode ? 'Đã cập nhật DCU thành công!' : 'Đã lưu thông tin DCU thành công!' });
          
          if (isUpdateMode) {
             const currentIndex = filteredData.findIndex(d => d.id === id);
             if (currentIndex >= 0 && currentIndex < filteredData.length - 1) {
                 const nextItem = filteredData[currentIndex + 1];
                 setId(nextItem.id || '');
                 setTen(nextItem.ten || '');
                 setDiaChi(nextItem.diaChi || '');
                 setToadoX(nextItem.toadoX || '');
                 setToadoY(nextItem.toadoY || '');
                 setGhiChu(nextItem.ghiChu || '');
                 setImagePreview(nextItem.hinhAnh || null);
                 setImageFile(null);
             } else {
                 setId(''); setTen(''); setDiaChi(''); setToadoX(''); setToadoY(''); setGhiChu(''); setImageFile(null); setImagePreview(null);
                 setIsUpdateMode(false);
             }
          } else {
             setId(''); setTen(''); setDiaChi(''); setToadoX(''); setToadoY(''); setGhiChu(''); setImageFile(null); setImagePreview(null);
          }
          
          loadData();
      } else {
          setMessage({ type: 'error', text: 'Lỗi khi lưu dữ liệu vào Google Sheets.' });
      }
      setIsSubmitting(false);`
);

// Add Tab UI for list
const tabsHtml = `
        <div className="flex border-b border-[#141414]/20 bg-white shadow-sm overflow-x-auto mb-4">
            <button 
                onClick={() => { setListType('chua_phan_cong'); setCurrentPage(1); }}
                className={\`px-6 py-3.5 font-extrabold uppercase tracking-widest text-sm transition-all whitespace-nowrap flex items-center gap-2 \${
                    listType === 'chua_phan_cong' 
                    ? 'bg-[#141414] text-white' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }\`}
            >
                <ListTodo size={16} />
                Chưa phân công ({data.filter(d => !d.toadoX || !d.toadoY).length})
            </button>
            <button 
                onClick={() => { setListType('da_phan_cong'); setCurrentPage(1); }}
                className={\`px-6 py-3.5 font-extrabold uppercase tracking-widest text-sm transition-all whitespace-nowrap flex items-center gap-2 \${
                    listType === 'da_phan_cong' 
                    ? 'bg-[#141414] text-white' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }\`}
            >
                <CheckSquare size={16} />
                Đã phân công ({data.filter(d => !!d.toadoX && !!d.toadoY).length})
            </button>
        </div>
`;

content = content.replace(
    /<div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">(\s*)<div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">(\s*)<h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">(\s*)2\. Danh sách DCU/,
    tabsHtml + '\n<div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">\n<div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">\n<h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">\n2. Danh sách DCU'
);

content = content.replace(
    /<div className="relative">\s*<Search className="w-4 h-4 text-slate-400 absolute left-3 top-1\/2 -translate-y-1\/2" \/>/,
    `<div className="flex items-center gap-2">
      <label className="cursor-pointer bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors whitespace-nowrap">
          <Upload className="w-4 h-4" />
          Import 
          {isImporting && <span className="ml-1 animate-pulse">...</span>}
          <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImport} disabled={isImporting} />
      </label>
      <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />`
);
content = content.replace(
    /focus:border-slate-800"\s*\/>\s*<\/div>\s*<\/div>/,
    `focus:border-slate-800" /></div></div></div>`
);

content = content.replace(
    /<h3 className="text-sm font-bold text-slate-800 uppercase">1\. Nhập thông tin DCU<\/h3>/,
    `<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full"><h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">{isUpdateMode ? <><Edit className="w-4 h-4 text-blue-600" /> Cập nhật DCU (Chưa phân công)</> : '1. Nhập thông tin DCU'}</h3>
     {isUpdateMode && <button type="button" onClick={() => { setIsUpdateMode(false); setId(''); setTen(''); setDiaChi(''); setToadoX(''); setToadoY(''); setGhiChu(''); setImagePreview(null); setImageFile(null); }} className="text-xs text-blue-600 hover:underline">Hủy cập nhật / Thêm mới</button>}</div>`
);

content = content.replace(
    /<Save className="w-4 h-4" \/>\s*Lưu dữ liệu/,
    `<Save className="w-4 h-4" />
     {isUpdateMode ? 'Lưu cập nhật' : 'Lưu dữ liệu'}`
);

content = content.replace(
    /setId\(row\.id \|\| ''\);/,
    `setId(row.id || '');
     if (listType === 'chua_phan_cong') setIsUpdateMode(true);
     else setIsUpdateMode(false);`
);

const targetHover = "className={`hover:bg-blue-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}\n                                title=\"Bấm để xem chi tiết trên form\"";
const replaceHover = "className={`hover:bg-blue-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}\n                                title={listType === 'chua_phan_cong' ? \"Bấm để cập nhật\" : \"Bấm để xem chi tiết\"}";
content = content.replace(targetHover, replaceHover);

content = content.replace(
    /<input type="text" value=\{id\} onChange=\{e => setId\(e\.target\.value\)\} required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-800" \/>/,
    `<input type="text" value={id} onChange={e => setId(e.target.value)} required disabled={isUpdateMode} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-800 disabled:opacity-60" />`
);

fs.writeFileSync('src/components/DcuTab.tsx', content, 'utf8');
console.log('Fixed DcuTab.tsx completely');
