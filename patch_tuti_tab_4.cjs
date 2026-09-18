const fs = require('fs');
let code = fs.readFileSync('src/components/TutiTab.tsx', 'utf8');

// Add confirm delete state
code = code.replace(
    'const [isProcessedExpanded, setIsProcessedExpanded] = useState(true);',
    'const [isProcessedExpanded, setIsProcessedExpanded] = useState(true);\n    const [itemToDelete, setItemToDelete] = useState<TutiEntry | null>(null);'
);

const handleDeleteRowStr = `    const handleDeleteRow = async (t: TutiEntry) => {
        if (t.nguoiDuaLen !== sessionUser?.name) {
            setToastMessage('Lỗi: Bạn chỉ được phép xoá dữ liệu do chính mình đưa lên!');
            setTimeout(() => setToastMessage(null), 3000);
            return;
        }
        if (confirm('Bạn có chắc chắn muốn xoá bản ghi này không?')) {
            await DataStore.deleteTutiEntry(t.id);
            setEntries(DataStore.getTutiEntries());
            setToastMessage('Đã xoá thành công!');
            setTimeout(() => setToastMessage(null), 3000);
            window.dispatchEvent(new Event('workload_updated'));
        }
    };`;

const newHandleDeleteRowStr = `    const handleDeleteRow = (t: TutiEntry) => {
        if (t.nguoiDuaLen !== sessionUser?.name) {
            setToastMessage('Lỗi: Bạn chỉ được phép xoá dữ liệu do chính mình đưa lên!');
            setTimeout(() => setToastMessage(null), 3000);
            return;
        }
        setItemToDelete(t);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        await DataStore.deleteTutiEntry(itemToDelete.id);
        setEntries(DataStore.getTutiEntries());
        setToastMessage('Đã xoá thành công!');
        setTimeout(() => setToastMessage(null), 3000);
        window.dispatchEvent(new Event('workload_updated'));
        setItemToDelete(null);
    };`;

code = code.replace(handleDeleteRowStr, newHandleDeleteRowStr);

// Change standard alert to toastMessage
code = code.replace(
    `alert("Mã trạm và Tên điểm đo không được để trống!");`,
    `setToastMessage("Lỗi: Mã trạm và Tên điểm đo không được để trống!");
            setTimeout(() => setToastMessage(null), 3000);`
);

// Add the custom confirm dialog
const confirmDialogUI = `
            {itemToDelete && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xoá</h3>
                        <p className="text-slate-600 mb-6 text-sm">Bạn có chắc chắn muốn xoá bản ghi của trạm <span className="font-bold">{itemToDelete.maTram}</span> không?</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setItemToDelete(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors text-sm">Hủy</button>
                            <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors text-sm">Xoá ngay</button>
                        </div>
                    </div>
                </div>
            )}
`;

code = code.replace('{toastMessage && (', confirmDialogUI + '\n            {toastMessage && (');

fs.writeFileSync('src/components/TutiTab.tsx', code);
