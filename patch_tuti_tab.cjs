const fs = require('fs');
let code = fs.readFileSync('src/components/TutiTab.tsx', 'utf8');

// 1. isProcessed logic
code = code.replace(
`    const isProcessed = (e: TutiEntry) => {
        if (e.ketLuan && e.ketLuan.trim().length > 0) return true;
        if (e.kiemTraTU && e.kiemTraTU.trim().length > 0) return true;
        if (e.kiemTraTI && e.kiemTraTI.trim().length > 0) return true;
        if (e.khac && e.khac.trim().length > 0) return true;
        return false;
    };`,
`    const isProcessed = (e: TutiEntry) => {
        return !!(e.ketLuan && e.ketLuan.trim().length > 0);
    };`
);

// 2. handleSaveEdit success message
const oldHandleSaveEdit = `        await DataStore.updateTutiEntry(id, finalUpdates);
        setEntries(DataStore.getTutiEntries());
        window.dispatchEvent(new Event('workload_updated'));
    };`;
const newHandleSaveEdit = `        await DataStore.updateTutiEntry(id, finalUpdates);
        setEntries(DataStore.getTutiEntries());
        window.dispatchEvent(new Event('workload_updated'));
        
        setToastMessage('Đã lưu cập nhật thành công!');
        setTimeout(() => setToastMessage(null), 3000);
    };`;
code = code.replace(oldHandleSaveEdit, newHandleSaveEdit);

// 3. Delete function
const deleteHandler = `    const handleDeleteRow = async (t: TutiEntry) => {
        if (t.nguoiDuaLen !== sessionUser?.name) {
            alert('Bạn chỉ được phép xoá dữ liệu do chính mình đưa lên!');
            return;
        }
        if (confirm('Bạn có chắc chắn muốn xoá bản ghi này không?')) {
            await DataStore.deleteTutiEntry(t.id);
            setEntries(DataStore.getTutiEntries());
            setToastMessage('Đã xoá thành công!');
            setTimeout(() => setToastMessage(null), 3000);
            window.dispatchEvent(new Event('workload_updated'));
        }
    };
`;
code = code.replace('const handleSaveEdit =', deleteHandler + '\n    const handleSaveEdit =');

// 4. Update the unprocessed table to show Delete button
const editBtn = `) : canEditTuti ? (
                                                <button onClick={() => handleStartEdit(t)} className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-full hover:bg-indigo-50 transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            ) : null}`;

const newEditBtn = `) : canEditTuti ? (
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={() => handleStartEdit(t)} className="text-slate-400 hover:text-indigo-600 p-1 rounded-full hover:bg-indigo-50 transition-colors" title="Chỉnh sửa">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {t.nguoiDuaLen === sessionUser?.name && (
                                                        <button onClick={() => handleDeleteRow(t)} className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors" title="Xóa">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : null}`;

code = code.replace(editBtn, newEditBtn);

fs.writeFileSync('src/components/TutiTab.tsx', code);
