const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

code = code.replace(
  "import { Save, FileDown, Search, Filter } from 'lucide-react';",
  "import { Save, FileDown, Search, Filter, Upload } from 'lucide-react';"
);

const stateHook = `  const [listMode, setListMode] = useState<'processed' | 'pending'>('pending');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          
          const formattedData = data.map((row: any) => ({
              loaiXl: row['Loại xử lý'] || row['Loại XL'] || row['Loai XL'] || 'Trạm',
              nguoiXl: row['Người thực hiện'] || row['Người XL'] || row['Nguoi XL'] || currentUserName,
              thoiGianXl: row['Thời gian thực hiện'] || row['Thời gian XL'] || row['thời gian thực hiện'] || defaultThoiGian,
              maDd: row['Mã điểm đo'] || row['Mã ĐĐ'] || row['Ma DD'] || row['Mã DD'] || '',
              cachXl: '',
              ketQua: 'Chưa',
              ghiChu: row['Ghi chú'] || row['Ghi chu'] || ''
          })).filter(r => r.maDd);
          
          if (formattedData.length > 0) {
              setIsImporting(true);
              const ok = await DataStore.syncXuLyDoXaBulkToSheet(formattedData);
              setIsImporting(false);
              if (ok) {
                  alert("Đã import " + formattedData.length + " dòng thành công!");
                  refreshData();
              } else {
                  alert("Có lỗi khi import Excel!");
              }
          } else {
              alert("File Excel không có dữ liệu hợp lệ (Cột Mã điểm đo bị trống)!");
          }
      };
      reader.readAsBinaryString(file);
      e.target.value = '';
  };
`;

code = code.replace("  const [filterText, setFilterText] = useState('');", "  const [filterText, setFilterText] = useState('');\n" + stateHook);

const handleSubmitLogic = `
    const entry: XuLyDoXaEntry = {
        stt: formData.stt,
        loaiXl: formData.loaiXl || 'Trạm',
        nguoiXl: formData.nguoiXl || currentUserName,
        thoiGianXl: formData.thoiGianXl || defaultThoiGian,
        maDd: formData.maDd || '',
        cachXl: formData.cachXl || '',
        ketQua: formData.ketQua || 'Xong',
        ghiChu: formData.ghiChu || ''
    };
    
    const ok = entry.stt ? await DataStore.updateXuLyDoXaToSheet(entry) : await DataStore.syncXuLyDoXaToSheet(entry);
    setSaving(false);
    
    if (ok) {
        setSaveSuccess(true);
        setFormData({ ...formData, stt: undefined, maDd: '', cachXl: '', ketQua: 'Xong', ghiChu: '' });
        refreshData();
`;

code = code.replace(/    const entry: XuLyDoXaEntry = {[\s\S]*?refreshData\(\);/, handleSubmitLogic);

const filterLogic = `
  const sortedAndFiltered = useMemo(() => {
    let result = [...xuLyList];
    
    if (listMode === 'processed') {
        result = result.filter(item => item.ketQua === 'Xong');
    } else {
        result = result.filter(item => item.ketQua !== 'Xong');
    }

    if (filterText) {
`;

code = code.replace("  const sortedAndFiltered = useMemo(() => {\n    let result = [...xuLyList];\n    if (filterText) {", filterLogic);

// Add radio buttons and Import Excel button
const listHeader = `
          <div className="p-4 border-b border-[#141414] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#F5F4F2]">
             <div className="flex items-center gap-4">
                 <h3 className="font-black uppercase text-[#141414]">Danh sách</h3>
                 <div className="flex bg-slate-200 p-1 rounded-lg">
                     <button onClick={() => setListMode('pending')} className={\`px-3 py-1 text-sm font-bold rounded-md transition-all \${listMode === 'pending' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}\`}>Đang phân công</button>
                     <button onClick={() => setListMode('processed')} className={\`px-3 py-1 text-sm font-bold rounded-md transition-all \${listMode === 'processed' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-600'}\`}>Đã xử lý</button>
                 </div>
                 <span className="font-bold text-[#141414]">({sortedAndFiltered.length})</span>
             </div>
             
             <div className="flex items-center gap-3">
                 <div className="relative">
                     <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input type="text" placeholder="Tìm kiếm..." value={filterText} onChange={e => setFilterText(e.target.value)} className="pl-9 pr-4 py-1.5 border-2 border-slate-200 rounded-lg text-sm focus:border-[#141414] outline-none" />
                 </div>
                 
                 <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
                 <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 bg-[#141414] text-white px-3 py-1.5 font-bold text-sm shadow-[2px_2px_0_#A0A0A0] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50">
                     <Upload className="w-4 h-4" /> {isImporting ? 'Đang Import...' : 'Import Excel'}
                 </button>
                 
                 <button onClick={exportExcel} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 font-bold text-sm shadow-[2px_2px_0_#A0A0A0] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
`;

code = code.replace(/          <div className="p-4 border-b border-\[#141414\] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-\[#F5F4F2\]">[\s\S]*?<button onClick={exportExcel} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 font-bold text-sm shadow-\[2px_2px_0_#A0A0A0\] hover:translate-x-\[1px\] hover:translate-y-\[1px\] hover:shadow-none transition-all">/, listHeader);

code = code.replace(
  `<tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">`,
  `<tr key={idx} className="border-b border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => { setFormData(row); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>`
);

code = code.replace(
  "         <h2 className=\"text-xl font-black uppercase mb-4 text-[#141414]\">Nhập thông tin xử lý điểm đo</h2>",
  "         <div className=\"flex justify-between items-center mb-4\">\n            <h2 className=\"text-xl font-black uppercase text-[#141414]\">Nhập thông tin xử lý điểm đo {formData.stt ? `(Cập nhật STT: ${formData.stt})` : ''}</h2>\n            {formData.stt && <button type=\"button\" onClick={() => setFormData({ loaiXl: 'Trạm', nguoiXl: currentUserName, thoiGianXl: defaultThoiGian, maDd: '', cachXl: '', ketQua: 'Xong', ghiChu: '' })} className=\"text-sm font-bold text-red-600 hover:underline\">Hủy cập nhật</button>}\n         </div>"
);

code = code.replace(
  "                       <option value=\"Xong\">Xong</option>\n                       <option value=\"Chưa\">Chưa</option>",
  "                       <option value=\"\">-- Chọn kết quả --</option>\n                       <option value=\"Xong\">Xong</option>\n                       <option value=\"Chưa\">Chưa</option>"
);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
