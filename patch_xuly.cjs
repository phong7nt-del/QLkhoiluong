const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

// Modify props
code = code.replace(
    `export default function XuLyDoXaView({ xuLyList, refreshData }: { xuLyList: XuLyDoXaEntry[], refreshData: () => void }) {`,
    `export default function XuLyDoXaView({ xuLyList, refreshData, setXuLyList }: { xuLyList: XuLyDoXaEntry[], refreshData: () => void, setXuLyList?: React.Dispatch<React.SetStateAction<XuLyDoXaEntry[]>> }) {`
);

// Modify filtering to be case-insensitive
code = code.replace(
    `    if (listMode === 'processed') {
        result = result.filter(item => item.ketQua === 'Xong');
    } else {
        result = result.filter(item => item.ketQua !== 'Xong');
    }`,
    `    if (listMode === 'processed') {
        result = result.filter(item => String(item.ketQua).trim().toLowerCase() === 'xong');
    } else {
        result = result.filter(item => String(item.ketQua).trim().toLowerCase() !== 'xong');
    }`
);

// Modify handleSubmit to apply optimistic update
const oldSubmitBlock = `    if (ok) {
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
    }`;

const newSubmitBlock = `    if (ok) {
        setSaveSuccess(true);
        
        // Optimistic update to avoid stale cache from Google Sheets
        if (setXuLyList) {
            if (editingItem) {
                setXuLyList(prev => prev.map(item => item.maDd === entry.maDd ? { ...item, ...entry } : item));
            } else {
                setXuLyList(prev => [entry as XuLyDoXaEntry, ...prev]);
            }
        } else {
            refreshData(); // Only refresh if we can't do optimistic update
        }

        if (editingItem && nextItem) {
            setEditingItem(nextItem);
            setFormData({...nextItem, thoiGianXl: formData.thoiGianXl || defaultThoiGian});
        } else {
            setEditingItem(null);
            setFormData({ ...formData, stt: undefined, maDd: '', cachXl: '', ketQua: 'Xong', ghiChu: '' });
        }
        
        setTimeout(() => setSaveSuccess(false), 3000);
    }`;

code = code.replace(oldSubmitBlock, newSubmitBlock);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');

let code2 = fs.readFileSync('src/components/DisconnectRateTab.tsx', 'utf8');
code2 = code2.replace(
    `<XuLyDoXaView xuLyList={xuLyList} refreshData={fetchXuLyData} />`,
    `<XuLyDoXaView xuLyList={xuLyList} refreshData={fetchXuLyData} setXuLyList={setXuLyList} />`
);
fs.writeFileSync('src/components/DisconnectRateTab.tsx', code2, 'utf8');

