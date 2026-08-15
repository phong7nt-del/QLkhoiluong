const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

// 1. Update filter logic
code = code.replace(
  "let result = [...xuLyList];\n    \n    if (listMode === 'processed') {\n        result = result.filter(item => item.ketQua === 'Xong');\n    } else {\n        result = result.filter(item => item.ketQua !== 'Xong');\n    }\n\n    if (filterText) {",
  `let result = [...xuLyList];
    
    const targetDate = formData.thoiGianXl || defaultThoiGian;
    result = result.filter(item => String(item.thoiGianXl).trim() === String(targetDate).trim());

    if (listMode === 'processed') {
        result = result.filter(item => item.ketQua === 'Xong');
    } else {
        result = result.filter(item => item.ketQua !== 'Xong');
    }

    if (filterText) {`
);

// 2. Update handleSubmit logic
const handleSubmitLogic = `
  const handleSubmit = async (e: React.FormEvent) => {
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
    if (formData.stt) {
        const currentIndex = sortedAndFiltered.findIndex(item => item.stt === formData.stt);
        if (currentIndex !== -1 && currentIndex + 1 < sortedAndFiltered.length) {
            nextItem = sortedAndFiltered[currentIndex + 1];
        }
    }
    
    const ok = entry.stt ? await DataStore.updateXuLyDoXaToSheet(entry) : await DataStore.syncXuLyDoXaToSheet(entry);
    setSaving(false);
    
    if (ok) {
        setSaveSuccess(true);
        if (entry.stt && nextItem) {
            setFormData({...nextItem, thoiGianXl: formData.thoiGianXl || defaultThoiGian});
        } else {
            setFormData({ ...formData, stt: undefined, maDd: '', cachXl: '', ketQua: 'Xong', ghiChu: '' });
        }
        refreshData();
        setTimeout(() => setSaveSuccess(false), 3000);
    } else {
        alert("Có lỗi xảy ra khi lưu!");
    }
  };
`;
code = code.replace(/const handleSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?setTimeout\(\(\) => setSaveSuccess\(false\), 3000\);\n    \} else \{\n        alert\("Có lỗi xảy ra khi lưu!"\);\n    \}\n  \};/, handleSubmitLogic);

// 3. Update form buttons
const formButtons = `
            <div className="flex gap-4 items-center">
                <button type="submit" disabled={saving || !!formData.stt} className="flex items-center gap-2 bg-[#141414] text-white px-6 py-2.5 font-bold shadow-[2px_2px_0_#A0A0A0] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <Save className="w-4 h-4" /> {saving && !formData.stt ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
                <button type="submit" disabled={saving || !formData.stt} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 font-bold shadow-[2px_2px_0_#A0A0A0] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <Save className="w-4 h-4" /> {saving && formData.stt ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
                {saveSuccess && <span className="text-green-600 font-bold text-sm">✓ {formData.stt ? 'Cập nhật' : 'Đã lưu'} thành công!</span>}
            </div>
`;
code = code.replace(/<div className="flex gap-4 items-center">\n                <button type="submit" disabled=\{saving\}.*?<\/button>\n                \{saveSuccess && <span.*?<\/span>\}\n            <\/div>/s, formButtons.trim());

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
