const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

// 1. Add editingItem state
code = code.replace(
    "const [isImporting, setIsImporting] = useState(false);",
    "const [isImporting, setIsImporting] = useState(false);\n  const [editingItem, setEditingItem] = useState<XuLyDoXaEntry | null>(null);"
);

// 2. Change handleSubmit logic
const newHandleSubmit = `const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.maDd || !formData.cachXl) {
        alert("Vui lòng nhập mã điểm đo và hướng xử lý!");
        return;
    }
    
    setSaving(true);
    setSaveSuccess(false);
    
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
    
    let nextItem = null;
    if (editingItem) {
        const currentIndex = sortedAndFiltered.findIndex(item => item.maDd === editingItem.maDd && item.thoiGianXl === editingItem.thoiGianXl);
        if (currentIndex !== -1 && currentIndex + 1 < sortedAndFiltered.length) {
            nextItem = sortedAndFiltered[currentIndex + 1];
        }
    }
    
    const ok = editingItem ? await DataStore.updateXuLyDoXaToSheet(entry) : await DataStore.syncXuLyDoXaToSheet(entry);
    setSaving(false);
    
    if (ok) {
        setSaveSuccess(true);
        if (editingItem && nextItem) {
            setEditingItem(nextItem);
            setFormData({...nextItem, thoiGianXl: formData.thoiGianXl || defaultThoiGian});
        } else {
            setEditingItem(null);
            setFormData({ ...formData, stt: undefined, maDd: '', cachXl: '', ketQua: 'Xong', ghiChu: '' });
        }
        refreshData();
        setTimeout(() => setSaveSuccess(false), 3000);
    } else {
        alert("Có lỗi xảy ra khi lưu!");
    }
  };`;
code = code.replace(/const handleSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?alert\("Có lỗi xảy ra khi lưu!"\);\n    \}\n  \};/, newHandleSubmit);

// 3. Update form buttons disabled states
const formButtons = `
            <div className="flex gap-4 items-center">
                <button type="submit" disabled={saving || !!editingItem} className="flex items-center gap-2 bg-[#141414] text-white px-6 py-2.5 font-bold shadow-[2px_2px_0_#A0A0A0] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <Save className="w-4 h-4" /> {saving && !editingItem ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
                <button type="submit" disabled={saving || !editingItem} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 font-bold shadow-[2px_2px_0_#A0A0A0] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <Save className="w-4 h-4" /> {saving && editingItem ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
                {saveSuccess && <span className="text-green-600 font-bold text-sm">✓ {editingItem ? 'Cập nhật' : 'Đã lưu'} thành công!</span>}
            </div>
`;
code = code.replace(/<div className="flex gap-4 items-center">\n                <button type="submit".*?<\/button>\n                <button type="submit".*?<\/button>\n                \{saveSuccess && <span.*?<\/span>\}\n            <\/div>/s, formButtons.trim());

// 4. Update the "Hủy cập nhật" button text logic
const cancelLogic = `Nhập thông tin xử lý điểm đo {editingItem ? \`(Cập nhật)\` : ''}</h2>
            {editingItem && <button type="button" onClick={() => { setEditingItem(null); setFormData({ loaiXl: 'Trạm', nguoiXl: currentUserName, thoiGianXl: defaultThoiGian, maDd: '', cachXl: '', ketQua: 'Xong', ghiChu: '' }); }} className="text-sm font-bold text-red-600 hover:underline">Hủy cập nhật</button>}`;
code = code.replace(/Nhập thông tin xử lý điểm đo \{formData\.stt \? `\(Cập nhật STT: \$\{formData\.stt\}\)` : ''\}<\/h2>\n            \{formData\.stt && <button type="button" onClick=\{\(\) => setFormData\(\{ loaiXl: 'Trạm', nguoiXl: currentUserName, thoiGianXl: defaultThoiGian, maDd: '', cachXl: '', ketQua: 'Xong', ghiChu: '' \}\)\} className="text-sm font-bold text-red-600 hover:underline">Hủy cập nhật<\/button>\}/, cancelLogic);

// 5. Update table row rendering and click handler
const rowRendering = `<tr key={idx} className="border-b border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => { setEditingItem(row); setFormData(row); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                              <td className="px-4 py-2 font-medium">{idx + 1}</td>`;
code = code.replace(/<tr key=\{idx\} className="border-b border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer" onClick=\{\(\) => \{ setFormData\(row\); window\.scrollTo\(\{ top: 0, behavior: 'smooth' \}\); \}\}>\n                              <td className="px-4 py-2 font-medium">\{row\.stt\}<\/td>/, rowRendering);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
