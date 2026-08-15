const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

// Add error state
code = code.replace(
`  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);`,
`  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);`
);

// Modify handleSubmit
code = code.replace(
`    let ok = false;
    let errMsg = "";
    if (editingItem) {
        const res = await DataStore.updateXuLyDoXaToSheet(entry);
        ok = res.ok;
        errMsg = res.message || "";
    } else {
        ok = await DataStore.syncXuLyDoXaToSheet(entry);
    }
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
        alert("Có lỗi xảy ra khi lưu: " + errMsg);
    }`,
`    setSaveError(null);
    let ok = false;
    let errMsg = "";
    if (editingItem) {
        try {
            const res = await DataStore.updateXuLyDoXaToSheet(entry) as any;
            if (res && res.ok !== undefined) {
                ok = res.ok;
                errMsg = res.message || "";
            } else {
                // Backward compatibility if it returns boolean
                ok = !!res;
                if (!ok) errMsg = "Unknown error (returned false)";
            }
        } catch (err: any) {
            ok = false;
            errMsg = err.message || String(err);
        }
    } else {
        ok = await DataStore.syncXuLyDoXaToSheet(entry);
    }
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
        setSaveError("Có lỗi: " + errMsg);
    }`
);

// Add display for error
code = code.replace(
`{saveSuccess && <span className="text-green-600 font-bold text-sm">✓ {editingItem ? 'Cập nhật' : 'Đã lưu'} thành công!</span>}`,
`{saveSuccess && <span className="text-green-600 font-bold text-sm">✓ {editingItem ? 'Cập nhật' : 'Đã lưu'} thành công!</span>}
                {saveError && <span className="text-red-600 font-bold text-sm bg-red-100 px-2 py-1">{saveError}</span>}`
);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
