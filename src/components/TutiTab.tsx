import React, { useState, useEffect } from 'react';
import { Plus, X, Save, Edit2, Search, CheckCircle, AlertCircle, Calendar, RefreshCw, Activity } from 'lucide-react';
import { DataStore, TutiEntry, SheetMember } from '../store/DataStore';

export default function TutiTab({ refreshToggle, sessionUser }: { refreshToggle: number, sessionUser: SheetMember | null }) {
    const [entries, setEntries] = useState<TutiEntry[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [maTram, setMaTram] = useState('');
    const [tenDiemDo, setTenDiemDo] = useState('');
    const [thongSoTU, setThongSoTU] = useState('');
    const [thongSoTI, setThongSoTI] = useState('');
    
    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<TutiEntry>>({});

    // Filter state for processed items
    const [filter, setFilter] = useState('');

    useEffect(() => {
        setEntries(DataStore.getTutiEntries());
    }, [refreshToggle]);

    const handleSaveNew = async () => {
        if (!maTram || !tenDiemDo) {
            alert("Mã trạm và Tên điểm đo không được để trống!");
            return;
        }
        
        setIsSubmitting(true);
        
        const now = new Date();
        const dateStr = [
            now.getDate().toString().padStart(2, '0'),
            (now.getMonth() + 1).toString().padStart(2, '0'),
            now.getFullYear()
        ].join('/');

        const newEntry = {
            maTram,
            tenDiemDo,
            thongSoTU,
            thongSoTI,
            kiemTraTU: '',
            kiemTraTI: '',
            khac: '',
            ketLuan: '',
            ngayCapNhat: '',
            ngayDuaLen: dateStr
        };
        
        await DataStore.addTutiEntry(newEntry);
        setEntries(DataStore.getTutiEntries());
        window.dispatchEvent(new Event('workload_updated'));
        
        setIsSubmitting(false);
        // Reset and hide
        setMaTram('');
        setTenDiemDo('');
        setThongSoTU('');
        setThongSoTI('');
        setShowForm(false);
    };

    const handleStartEdit = (entry: TutiEntry) => {
        setEditingId(entry.id);
        setEditData({
            kiemTraTU: entry.kiemTraTU || '',
            kiemTraTI: entry.kiemTraTI || '',
            khac: entry.khac || '',
            ketLuan: entry.ketLuan || ''
        });
    };

    const handleSaveEdit = async (id: string) => {
        let finalUpdates = { ...editData };
        
        if (finalUpdates.ketLuan === 'Đúng' || finalUpdates.ketLuan === 'Sai') {
            const now = new Date();
            const dateStr = [
                now.getDate().toString().padStart(2, '0'),
                (now.getMonth() + 1).toString().padStart(2, '0'),
                now.getFullYear()
            ].join('/');
            finalUpdates.ngayCapNhat = dateStr;
        }

        await DataStore.updateTutiEntry(id, finalUpdates);
        setEntries(DataStore.getTutiEntries());
        window.dispatchEvent(new Event('workload_updated'));
        setEditingId(null);
    };

    const formatDate = (dStr: string) => {
        if (!dStr) return '';
        if (dStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dStr;
        const d = new Date(dStr);
        if (!isNaN(d.getTime())) {
            return [
                d.getDate().toString().padStart(2, '0'),
                (d.getMonth() + 1).toString().padStart(2, '0'),
                d.getFullYear()
            ].join('/');
        }
        if (dStr.includes('T')) {
             const [datePart] = dStr.split('T');
             const p = datePart.split('-');
             if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
        }
        const parts = dStr.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
             return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dStr;
    };

    const unprocessed = entries.filter(e => !e.ketLuan || (e.ketLuan !== 'Đúng' && e.ketLuan !== 'Sai'));
    const processed = entries.filter(e => e.ketLuan === 'Đúng' || e.ketLuan === 'Sai');
    
    // Sort unprocessed ascending
    unprocessed.sort((a, b) => (a.maTram || '').localeCompare(b.maTram || ''));

    // Filter processed
    const filteredProcessed = processed.filter(e => {
        if (!filter) return true;
        const search = filter.toLowerCase();
        return (
            e.maTram.toLowerCase().includes(search) ||
            e.tenDiemDo.toLowerCase().includes(search) ||
            e.ketLuan.toLowerCase().includes(search)
        );
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-indigo-900 tracking-tight flex items-center gap-2">
                    <Activity className="w-6 h-6 text-indigo-600" />
                    Quản lý Kiểm tra TU - TI
                </h2>
                {!showForm && (
                    <button 
                        onClick={() => setShowForm(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm mới
                    </button>
                )}
            </div>

            {/* A. Top Form */}
            {showForm && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800">Thêm mới điểm đo</h3>
                        <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-red-500 rounded-full p-1 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã trạm</label>
                            <input value={maTram} onChange={e => setMaTram(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên điểm đo</label>
                            <input value={tenDiemDo} onChange={e => setTenDiemDo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thông số TU</label>
                            <input value={thongSoTU} onChange={e => setThongSoTU(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thông số TI</label>
                            <input value={thongSoTI} onChange={e => setThongSoTI(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:outline-none" />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-3">
                        <button onClick={() => setShowForm(false)} className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                            Hủy
                        </button>
                        <button onClick={handleSaveNew} disabled={isSubmitting} className={`bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <Save className="w-4 h-4" />
                            {isSubmitting ? 'Đang lưu...' : 'Lưu thông tin'}
                        </button>
                    </div>
                </div>
            )}

            {/* B. Middle Part: Unprocessed */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div className="bg-slate-50 border-b border-slate-200 p-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-indigo-500" />
                        Danh sách cần xử lý ({unprocessed.length})
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-500">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap">Mã trạm</th>
                                <th className="px-4 py-3 min-w-[200px]">Tên điểm đo</th>
                                <th className="px-4 py-3 min-w-[150px]">Thông số TU/TI</th>
                                <th className="px-4 py-3 min-w-[150px]">Kiểm tra TU</th>
                                <th className="px-4 py-3 min-w-[150px]">Kiểm tra TI</th>
                                <th className="px-4 py-3 min-w-[150px]">Khác</th>
                                <th className="px-4 py-3 min-w-[120px]">Kết luận</th>
                                <th className="px-4 py-3 whitespace-nowrap">Ngày đưa lên</th>
                                <th className="px-4 py-3 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {unprocessed.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                                        Không có trạm nào cần xử lý.
                                    </td>
                                </tr>
                            ) : unprocessed.map((t) => {
                                const isEditing = editingId === t.id;
                                return (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{t.maTram}</td>
                                        <td className="px-4 py-3 font-medium text-slate-800">{t.tenDiemDo}</td>
                                        <td className="px-4 py-3 text-xs">
                                            <div className="text-slate-600"><span className="font-bold">TU:</span> {t.thongSoTU}</div>
                                            <div className="text-slate-600"><span className="font-bold">TI:</span> {t.thongSoTI}</div>
                                        </td>
                                        <td className="px-4 py-2">
                                            {isEditing ? (
                                                <input value={editData.kiemTraTU || ''} onChange={e => setEditData({...editData, kiemTraTU: e.target.value})} className="w-full text-xs p-1.5 border border-indigo-300 focus:ring-1 focus:ring-indigo-500 rounded bg-indigo-50/30" />
                                            ) : (
                                                <span className="text-slate-600">{t.kiemTraTU}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            {isEditing ? (
                                                <input value={editData.kiemTraTI || ''} onChange={e => setEditData({...editData, kiemTraTI: e.target.value})} className="w-full text-xs p-1.5 border border-indigo-300 focus:ring-1 focus:ring-indigo-500 rounded bg-indigo-50/30" />
                                            ) : (
                                                <span className="text-slate-600">{t.kiemTraTI}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            {isEditing ? (
                                                <input value={editData.khac || ''} onChange={e => setEditData({...editData, khac: e.target.value})} className="w-full text-xs p-1.5 border border-indigo-300 focus:ring-1 focus:ring-indigo-500 rounded bg-indigo-50/30" />
                                            ) : (
                                                <span className="text-slate-600">{t.khac}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            {isEditing ? (
                                                <select value={editData.ketLuan || ''} onChange={e => setEditData({...editData, ketLuan: e.target.value})} className="w-full text-xs p-1.5 border border-indigo-300 focus:ring-1 focus:ring-indigo-500 rounded bg-indigo-50/30 font-bold">
                                                    <option value="">- Chọn -</option>
                                                    <option value="Đúng">Đúng</option>
                                                    <option value="Sai">Sai</option>
                                                </select>
                                            ) : (
                                                <span className={`font-bold ${t.ketLuan === 'Đúng' ? 'text-green-600' : t.ketLuan === 'Sai' ? 'text-red-600' : 'text-slate-400'}`}>
                                                    {t.ketLuan || 'Chưa có'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-xs font-medium text-slate-500 whitespace-nowrap">
                                            {formatDate(t.ngayDuaLen)}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            {isEditing ? (
                                                <button onClick={() => handleSaveEdit(t.id)} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                                    Lưu
                                                </button>
                                            ) : (
                                                <button onClick={() => handleStartEdit(t)} className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-full hover:bg-indigo-50 transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* C. Bottom Part: Processed */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Danh sách đã xử lý ({filteredProcessed.length})
                    </h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            placeholder="Lọc mã trạm, tên, kết luận..." 
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-500">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap">Mã trạm</th>
                                <th className="px-4 py-3 min-w-[200px]">Tên điểm đo</th>
                                <th className="px-4 py-3 min-w-[150px]">Thông số TU/TI</th>
                                <th className="px-4 py-3 min-w-[150px]">Kết quả kiểm tra</th>
                                <th className="px-4 py-3 min-w-[150px]">Khác</th>
                                <th className="px-4 py-3 text-center">Kết luận</th>
                                <th className="px-4 py-3 whitespace-nowrap text-right">Ngày đưa lên</th>
                                <th className="px-4 py-3 whitespace-nowrap text-right">Ngày cập nhật</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProcessed.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                                        Chưa có biên bản nào được xử lý hoặc không khớp tìm kiếm.
                                    </td>
                                </tr>
                            ) : filteredProcessed.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{t.maTram}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{t.tenDiemDo}</td>
                                    <td className="px-4 py-3 text-xs">
                                        <div className="text-slate-600"><span className="font-bold">TU:</span> {t.thongSoTU}</div>
                                        <div className="text-slate-600"><span className="font-bold">TI:</span> {t.thongSoTI}</div>
                                    </td>
                                    <td className="px-4 py-2 text-xs">
                                        <div className="text-slate-600"><span className="font-bold">TU:</span> {t.kiemTraTU}</div>
                                        <div className="text-slate-600"><span className="font-bold">TI:</span> {t.kiemTraTI}</div>
                                    </td>
                                    <td className="px-4 py-2 text-slate-600 text-xs">
                                        {t.khac}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[11px] font-black uppercase ${t.ketLuan === 'Đúng' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {t.ketLuan}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right text-xs font-medium text-slate-500 whitespace-nowrap">
                                        {formatDate(t.ngayDuaLen)}
                                    </td>
                                    <td className="px-4 py-2 text-right text-xs font-medium text-slate-500 whitespace-nowrap flex justify-end items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 opacity-70" />
                                        {formatDate(t.ngayCapNhat)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
        </div>
    );
}
