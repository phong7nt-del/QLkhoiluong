import React, { useState, useEffect } from 'react';
import { Plus, X, Save, Edit2, Search, CheckCircle, AlertCircle, Calendar, RefreshCw, Activity, ChevronDown, ChevronRight } from 'lucide-react';
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

    // Collapse states
    const [isUnprocessedExpanded, setIsUnprocessedExpanded] = useState(true);
    const [isProcessedExpanded, setIsProcessedExpanded] = useState(true);

    const userRole = (sessionUser?.role || '').toLowerCase();
    const userTeam = (sessionUser?.team || '').toLowerCase();
    const canEditTuti = userRole.includes('đội trưởng') || userRole.includes('đội phó') || (userRole.includes('tổ trưởng') && userTeam.includes('đo xa'));

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
            maTram: maTram || '',
            tenDiemDo: tenDiemDo || '',
            thongSoTU: thongSoTU || '',
            thongSoTI: thongSoTI || '',
            kiemTraTU: '',
            kiemTraTI: '',
            khac: '',
            ketLuan: '',
            ngayCapNhat: '',
            ngayDuaLen: dateStr,
            nguoiDuaLen: sessionUser?.name || '',
            nguoiKiemTra: ''
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
        
        if (finalUpdates.ketLuan && finalUpdates.ketLuan.trim() !== '') {
            const now = new Date();
            const dateStr = [
                now.getDate().toString().padStart(2, '0'),
                (now.getMonth() + 1).toString().padStart(2, '0'),
                now.getFullYear()
            ].join('/');
            finalUpdates.ngayCapNhat = dateStr;
            finalUpdates.nguoiKiemTra = sessionUser?.name || '';
        }

        const optimisticEntry = { ...(entries.find(e => e.id === id) || {}), ...finalUpdates } as TutiEntry;
        setEntries(entries.map(e => e.id === id ? optimisticEntry : e));
        setEditingId(null);

        await DataStore.updateTutiEntry(id, finalUpdates);
        setEntries(DataStore.getTutiEntries());
        window.dispatchEvent(new Event('workload_updated'));
    };

    const formatDate = (dStr: string) => {
        if (!dStr) return '';
        const d = new Date(dStr);
        if (!isNaN(d.getTime()) && (dStr.includes('T') || dStr.includes('GMT') || dStr.includes('Z') || dStr.match(/^[a-zA-Z]{3,}/))) {
            return [
                d.getDate().toString().padStart(2, '0'),
                (d.getMonth() + 1).toString().padStart(2, '0'),
                d.getFullYear()
            ].join('/');
        }
        if (dStr.includes('T')) {
             const [datePart] = dStr.split('T');
             const p = datePart.split('-');
             if (p.length === 3) return `${p[2].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[0]}`;
        }
        const parts = dStr.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
             return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
        }
        const slashParts = dStr.split('/');
        if (slashParts.length === 2) {
             const year = new Date().getFullYear();
             const day = slashParts[0].padStart(2, '0');
             const month = slashParts[1].padStart(2, '0');
             return `${day}/${month}/${year}`;
        }
        if (slashParts.length === 3) {
             const day = slashParts[0].padStart(2, '0');
             const month = slashParts[1].padStart(2, '0');
             let year = slashParts[2];
             if (year.length === 2) year = '20' + year;
             return `${day}/${month}/${year}`;
        }
        return dStr;
    };

    const isProcessed = (e: TutiEntry) => {
        if (e.ketLuan && e.ketLuan.trim().length > 0) return true;
        if (e.kiemTraTU && e.kiemTraTU.trim().length > 0) return true;
        if (e.kiemTraTI && e.kiemTraTI.trim().length > 0) return true;
        if (e.khac && e.khac.trim().length > 0) return true;
        return false;
    };

    const unprocessed = entries.filter(e => !isProcessed(e));
    const processed = entries.filter(e => isProcessed(e));
    
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

    const missingWarnings = React.useMemo(() => {
        const workloads = DataStore.getEntries();
        const members = DataStore.getMembers();
        const stations = DataStore.getStations();
        const teamTutiDates: Record<string, Set<string>> = {};
        
        const now = new Date();
        const parseD = (str: string) => {
            if (!str) return new Date(NaN);
            const parts = str.split('/');
            if (parts.length !== 3) return new Date(NaN);
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        };

        const getTeam = (nguoi: string) => {
           if(!nguoi) return undefined;
           const target = String(nguoi).normalize('NFC').toLowerCase().replace(/\s+/g,'');
           const matched = members.find(m => m?.name && String(m.name).normalize('NFC').toLowerCase().replace(/\s+/g,'') === target);
           return matched?.team;
        };
        
        workloads.forEach(w => {
            if (!w.team || !w.date || !w.content) return;
            const contentUpper = w.content.toUpperCase();
            // Match exactly TU or TI as whole words
            const hasTU = /(?:^|[^A-Z])TU(?:[^A-Z]|$)/.test(contentUpper);
            const hasTI = /(?:^|[^A-Z])TI(?:[^A-Z]|$)/.test(contentUpper);
            
            if (hasTU || hasTI) {
                const fd = formatDate(w.date);
                const wDate = parseD(fd);
                if (!isNaN(wDate.getTime())) {
                    // Loại ra các công việc mới thực hiện trong vòng 2 ngày qua
                    const diffDays = (now.getTime() - wDate.getTime()) / (1000 * 3600 * 24);
                    if (diffDays <= 2) return; 
                }

                if (!teamTutiDates[w.team]) teamTutiDates[w.team] = new Set();
                teamTutiDates[w.team].add(fd);
            }
        });

        const teamEnteredDates: Record<string, string[]> = {};
        entries.forEach(e => {
            let team = getTeam(e.nguoiDuaLen || '');
            if (!team && e.maTram) {
                 const sMaTram = e.maTram.toLowerCase().trim();
                 const station = stations.find(s => s.id.toLowerCase().trim() === sMaTram || s.id.toLowerCase().trim() === sMaTram.split(' - ')[0]);
                 if (station && station.area) {
                     team = station.area;
                 }
            }
            team = team || '';
            const d1 = formatDate(e.ngayDuaLen);
            const d2 = formatDate(e.ngayCapNhat);
            if (team) {
                if(!teamEnteredDates[team]) teamEnteredDates[team] = [];
                if (d1) teamEnteredDates[team].push(d1);
                if (d2 && d2 !== d1) teamEnteredDates[team].push(d2);
            }
        });

        const warnings: { team: string; count: number; dates: string }[] = [];
        
        for (const [team, dates] of Object.entries(teamTutiDates)) {
            const lowerTeam = team.toLowerCase();
            if (lowerTeam.includes('tổng hợp') || lowerTeam.includes('bộ phận công tác') || lowerTeam.includes('đo xa') || lowerTeam.includes('tăng cường')) continue;
            
            const uploadedDates = teamEnteredDates[team] || [];
            // Tổng số ngày có thay TU, TI
            const totalRepDates = dates.size;
            // Tổng số ngày đưa lên
            const uniqueUpDates = new Set(uploadedDates).size;

            if (totalRepDates <= uniqueUpDates) continue; // Nếu số ngày đưa lên bằng (hoặc lớn hơn) số ngày thay thì ko cảnh báo

            const upTimes = uploadedDates.map(d => parseD(d).getTime()).filter(t => !isNaN(t)).sort((a, b) => a - b);
            
            const reqDates = Array.from(dates)
                                  .map(d => ({ dateStr: d, time: parseD(d).getTime() }))
                                  .filter(r => !isNaN(r.time))
                                  .sort((a, b) => a.time - b.time);

            let missingDates: string[] = [];
            
            reqDates.forEach(req => {
                // Tím ngày đưa lên gần nhất sau ngày thực hiện (trong vòng 5 ngày)
                const matchIdx = upTimes.findIndex(t => t >= req.time && t <= req.time + 5 * 24 * 3600 * 1000);
                if (matchIdx !== -1) {
                    upTimes.splice(matchIdx, 1); // Đã dùng để khớp
                } else {
                    missingDates.push(req.dateStr);
                }
            });

            if (missingDates.length > 0) {
                warnings.push({
                    team,
                    count: missingDates.length,
                    dates: missingDates.join(', ')
                });
            }
        }
        return warnings;
    }, [refreshToggle, entries]);

    return (
        <div className="space-y-6">
            {missingWarnings.length > 0 && (
                <div className="bg-red-50/80 border border-red-200/60 rounded-2xl p-4 shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <h3 className="font-bold text-red-900 text-sm uppercase tracking-wider">Cảnh báo thiếu dữ liệu kiểm tra TU - TI</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {missingWarnings.map((w, idx) => (
                            <div key={idx} className="bg-white/80 border border-red-100 p-3 rounded-xl shadow-sm">
                                <div className="font-bold text-slate-800 text-sm mb-1">{w.team}</div>
                                <div className="text-xs text-slate-600 mb-1">
                                    Chưa nhập <span className="font-bold text-red-600">{w.count} ngày</span>
                                </div>
                                <div className="text-[11px] font-mono text-slate-500 bg-slate-50/50 p-1.5 rounded border border-slate-100">
                                    {w.dates}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-indigo-900 tracking-tight flex items-center gap-2">
                    <Activity className="w-6 h-6 text-indigo-600" />
                    Quản lý Kiểm tra TU - TI
                </h2>
                <div className="flex items-center gap-4">
                    {!showForm && canEditTuti && (
                        <button 
                            onClick={() => setShowForm(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            Thêm mới
                        </button>
                    )}
                </div>
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6">
                <button 
                    onClick={() => setIsUnprocessedExpanded(!isUnprocessedExpanded)}
                    className="w-full text-left bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200 p-4 flex items-center justify-between outline-none"
                    style={{ borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem', borderBottomLeftRadius: isUnprocessedExpanded ? '0' : '1rem', borderBottomRightRadius: isUnprocessedExpanded ? '0' : '1rem' }}
                >
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-indigo-500" />
                        Danh sách cần xử lý ({unprocessed.length})
                    </h3>
                    <div className="text-slate-500">
                        {isUnprocessedExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                </button>
                {isUnprocessedExpanded && (
                    <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative styled-scrollbar rounded-b-2xl">
                        <table className="w-full text-sm text-left relative border-collapse">
                            <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 sticky top-0 z-20 shadow-sm divide-x divide-slate-100">
                                <tr>
                                    <th className="px-4 py-3 text-center sticky top-0 left-0 z-30 bg-slate-50 border-r border-slate-100 shadow-[1px_0_0_rgba(241,245,249,1)]">Thao tác</th>
                                    <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Mã trạm</th>
                                <th className="px-4 py-3 min-w-[200px] bg-slate-50">Tên điểm đo</th>
                                <th className="px-4 py-3 min-w-[150px] bg-slate-50">Thông số TU/TI</th>
                                <th className="px-4 py-3 min-w-[150px] bg-slate-50">Kiểm tra TU</th>
                                <th className="px-4 py-3 min-w-[150px] bg-slate-50">Kiểm tra TI</th>
                                <th className="px-4 py-3 min-w-[150px] bg-slate-50">Khác</th>
                                <th className="px-4 py-3 min-w-[120px] bg-slate-50">Kết luận</th>
                                <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Người đưa lên</th>
                                <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Ngày đưa lên</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {unprocessed.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                                        Không có trạm nào cần xử lý.
                                    </td>
                                </tr>
                            ) : unprocessed.map((t) => {
                                const isEditing = editingId === t.id;
                                return (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2 text-center sticky left-0 z-10 bg-white/90 backdrop-blur border-r border-slate-100 group-hover:bg-slate-50 transition-colors">
                                            {isEditing ? (
                                                <button onClick={() => handleSaveEdit(t.id)} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                                    Lưu
                                                </button>
                                            ) : canEditTuti ? (
                                                <button onClick={() => handleStartEdit(t)} className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-full hover:bg-indigo-50 transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{t.maTram}</td>
                                        <td className="px-4 py-3 font-medium text-slate-800">{t.tenDiemDo}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                                            {(t.thongSoTU || t.thongSoTI) ? (
                                                t.thongSoTU === t.thongSoTI ? (
                                                    <span className="font-bold">{t.thongSoTU}</span>
                                                ) : (
                                                    <span className="font-bold whitespace-nowrap">
                                                        {t.thongSoTU ? `TU: ${t.thongSoTU}` : ''}
                                                        {t.thongSoTU && t.thongSoTI ? '; ' : ''}
                                                        {t.thongSoTI ? `TI: ${t.thongSoTI}` : ''}
                                                    </span>
                                                )
                                            ) : (
                                                <span className="text-slate-400">Chưa có</span>
                                            )}
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
                                                <span className={`font-bold ${t.ketLuan?.toLowerCase() === 'sai' ? 'text-red-600' : t.ketLuan ? 'text-green-600' : 'text-slate-400'}`}>
                                                    {t.ketLuan || 'Chưa có'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-xs font-bold text-slate-600 whitespace-nowrap">
                                            {t.nguoiDuaLen}
                                        </td>
                                        <td className="px-4 py-2 text-xs font-medium text-slate-500 whitespace-nowrap">
                                            {formatDate(t.ngayDuaLen)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                )}
            </div>

            {/* C. Bottom Part: Processed */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div 
                    className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors"
                    style={{ borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem', borderBottomLeftRadius: isProcessedExpanded ? '0' : '1rem', borderBottomRightRadius: isProcessedExpanded ? '0' : '1rem' }}
                >
                    <button 
                        onClick={() => setIsProcessedExpanded(!isProcessedExpanded)}
                        className="flex items-center gap-2 hover:bg-slate-100 p-1 -m-1 rounded-lg transition-colors outline-none w-full sm:w-auto text-left"
                    >
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Danh sách đã xử lý ({filteredProcessed.length})
                        </h3>
                        <div className="text-slate-500 ml-2">
                            {isProcessedExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </div>
                    </button>
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
                {isProcessedExpanded && (
                <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative styled-scrollbar rounded-b-2xl border-t border-slate-200">
                    <table className="w-full text-sm text-left relative border-collapse">
                        <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 sticky top-0 z-20 shadow-sm divide-x divide-slate-100">
                            <tr>
                                <th className="px-4 py-3 text-center sticky left-0 z-20 bg-slate-50 border-r border-slate-100 shadow-[1px_0_0_0_#f1f5f9] w-[100px]">Thao tác</th>
                                <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Mã trạm</th>
                                <th className="px-4 py-3 min-w-[200px] bg-slate-50">Tên điểm đo</th>
                                <th className="px-4 py-3 min-w-[150px] bg-slate-50">Thông số TU/TI</th>
                                <th className="px-4 py-3 min-w-[150px] bg-slate-50">Kiểm tra TU</th>
                                <th className="px-4 py-3 min-w-[150px] bg-slate-50">Kiểm tra TI</th>
                                <th className="px-4 py-3 min-w-[150px] bg-slate-50">Khác</th>
                                <th className="px-4 py-3 min-w-[120px] bg-slate-50">Kết luận</th>
                                <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Người đưa lên</th>
                                <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Ngày đưa lên</th>
                                <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Người kiểm tra</th>
                                <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Ngày kiểm tra</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProcessed.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                                        Chưa có biên bản nào được xử lý hoặc không khớp tìm kiếm.
                                    </td>
                                </tr>
                            ) : filteredProcessed.map((t) => {
                                const isEditing = editingId === t.id;
                                return (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-2 text-center sticky left-0 z-10 bg-white/90 backdrop-blur border-r border-slate-100 group-hover:bg-slate-50 transition-colors">
                                        {isEditing ? (
                                            <button onClick={() => handleSaveEdit(t.id)} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                                Lưu
                                            </button>
                                        ) : canEditTuti ? (
                                            <button onClick={() => handleStartEdit(t)} className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-full hover:bg-indigo-50 transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        ) : null}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{t.maTram}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{t.tenDiemDo}</td>
                                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                                        {(t.thongSoTU || t.thongSoTI) ? (
                                            t.thongSoTU === t.thongSoTI ? (
                                                <span className="font-bold">{t.thongSoTU}</span>
                                            ) : (
                                                <span className="font-bold whitespace-nowrap">
                                                    {t.thongSoTU ? `TU: ${t.thongSoTU}` : ''}
                                                    {t.thongSoTU && t.thongSoTI ? '; ' : ''}
                                                    {t.thongSoTI ? `TI: ${t.thongSoTI}` : ''}
                                                </span>
                                            )
                                        ) : (
                                            <span className="text-slate-400">Chưa có</span>
                                        )}
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
                                            <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-[11px] font-black uppercase ${t.ketLuan?.toLowerCase() === 'sai' ? 'bg-red-100 text-red-700' : t.ketLuan ? 'bg-green-100 text-green-700' : 'text-slate-400 bg-slate-100'}`}>
                                                {t.ketLuan || 'Chưa có'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-xs font-bold text-slate-600 whitespace-nowrap">
                                        {t.nguoiDuaLen}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">
                                        {formatDate(t.ngayDuaLen)}
                                    </td>
                                    <td className="px-4 py-2 text-xs font-bold text-slate-600 whitespace-nowrap">
                                        {t.nguoiKiemTra}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">
                                        <div className="flex items-center gap-1"><Calendar className="w-3 h-3 opacity-70" /> {formatDate(t.ngayCapNhat)}</div>
                                    </td>
                                </tr>
                            );
                            })}
                        </tbody>
                    </table>
                </div>
                )}
            </div>
            
        </div>
    );
}
