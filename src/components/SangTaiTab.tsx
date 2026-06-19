import React, { useState, useMemo, useRef } from 'react';
import { DataStore } from '../store/DataStore';
import { ChevronDown, ChevronRight, MapPin, Activity, Zap, Search, Save, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SangTaiTab() {
    const [selectedStation, setSelectedStation] = useState<string | null>(null);
    const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});
    const [stationFilter, setStationFilter] = useState('');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const rawSangTai = DataStore.getSangTai();
    const khuVucList = DataStore.getKhuVuc();

    const rawAreas = useMemo(() => {
        const kvSorted = [...khuVucList].sort((a, b) => b.MA_DDO.length - a.MA_DDO.length);
        const kvExactMap = new Map<string, string>();
        kvSorted.forEach(kv => kvExactMap.set(kv.MA_DDO, kv.TO_QL));
        const areaCache = new Map<string, string>();
        
        const getKhuVucName = (maDiemDo: string) => {
            if (!maDiemDo) return 'Khác';
            if (areaCache.has(maDiemDo)) return areaCache.get(maDiemDo)!;
            
            if (kvExactMap.has(maDiemDo)) {
                const res = kvExactMap.get(maDiemDo)!;
                areaCache.set(maDiemDo, res);
                return res;
            }
            for (let i = 0; i < kvSorted.length; i++) {
                if (maDiemDo.startsWith(kvSorted[i].MA_DDO)) {
                    const res = kvSorted[i].TO_QL;
                    areaCache.set(maDiemDo, res);
                    return res;
                }
            }
            areaCache.set(maDiemDo, 'Khác');
            return 'Khác';
        };

        const areas: Record<string, Record<string, { tenTram: string; points: any[] }>> = {};

        for (const row of rawSangTai) {
            const maDiemDo16 = String(row['MA_DIEM_DO_16'] || row['MA_DIEM_DO'] || '').trim();
            const maTram = String(row['ASSETID_ORG'] || row['MA_TRAM'] || '').trim();
            const tenTram = String(row['TEN_TRAM'] || row['TENTRAM'] || '').trim();
            
            const areaName = getKhuVucName(maDiemDo16);

            if (!areas[areaName]) {
                areas[areaName] = {};
            }
            if (!areas[areaName][maTram]) {
                areas[areaName][maTram] = {
                    tenTram: tenTram || 'Không xác định',
                    points: []
                };
            }
            areas[areaName][maTram].points.push(row);
        }
        return areas;
    }, [rawSangTai, khuVucList]);

    const data = useMemo(() => {
        const checkFilter = (station: any, filterStr: string) => {
            const s = filterStr.trim().toLowerCase();
            if (!s) return true;
            
            const countMatch = s.match(/^(>=|<=|>|<|=)\s*(\d+)$/);
            if (countMatch) {
                const op = countMatch[1];
                const val = parseInt(countMatch[2], 10);
                switch (op) {
                    case '>': return station.count > val;
                    case '>=': return station.count >= val;
                    case '<': return station.count < val;
                    case '<=': return station.count <= val;
                    case '=': return station.count === val;
                }
            }
            const plainNumMatch = s.match(/^(\d+)$/);
            if (plainNumMatch) {
                return station.count === parseInt(plainNumMatch[1], 10) || station.maTram.toLowerCase().includes(s) || station.tenTram.toLowerCase().includes(s);
            }
            
            return station.maTram.toLowerCase().includes(s) || station.tenTram.toLowerCase().includes(s);
        };

        const formattedAreas = Object.keys(rawAreas).map(areaName => {
            let stations = Object.keys(rawAreas[areaName]).map(maTram => ({
                maTram,
                tenTram: rawAreas[areaName][maTram].tenTram,
                points: rawAreas[areaName][maTram].points,
                count: rawAreas[areaName][maTram].points.length
            })).sort((a, b) => b.count - a.count); // desc sort by count

            stations = stations.filter(s => checkFilter(s, stationFilter));
            
            return {
                areaName,
                stations,
                totalCount: stations.reduce((sum, s) => sum + s.count, 0)
            };
        }).filter(a => a.stations.length > 0)
          .sort((a, b) => a.areaName.localeCompare(b.areaName));

        return formattedAreas;
    }, [rawAreas, stationFilter]);

    const toggleArea = (areaName: string) => {
        setExpandedAreas(prev => ({
            ...prev,
            [areaName]: !prev[areaName]
        }));
    };

    const selectedStationData = useMemo(() => {
        if (!selectedStation) return null;
        for (const area of data) {
            const station = area.stations.find(s => s.maTram === selectedStation);
            if (station) return station;
        }
        return null;
    }, [selectedStation, data]);

    const [maMoiInputs, setMaMoiInputs] = useState<Record<string, string>>({});
    const [savingMaMoi, setSavingMaMoi] = useState<Record<string, boolean>>({});

        const normalizedKeysMemo = useMemo(() => {
        if (!rawSangTai || rawSangTai.length === 0) return {};
        const firstRow = rawSangTai[0];
        const cache: Record<string, string> = {};
        for (const k of Object.keys(firstRow)) {
            cache[k.toLowerCase().replace(/_/g, '')] = k;
        }
        return cache;
    }, [rawSangTai]);

    const resolvedKeysCache = useRef<Record<string, string[]>>({});
    const getValFromRow = (row: any, keys: string[]) => {
        const cacheKey = keys.join('|');
        if (!resolvedKeysCache.current[cacheKey]) {
             const actualKeys: string[] = [];
             for (const k of keys) {
                 actualKeys.push(k);
                 const tk = k.toLowerCase().replace(/_/g, '');
                 if (normalizedKeysMemo[tk]) actualKeys.push(normalizedKeysMemo[tk]);
             }
             resolvedKeysCache.current[cacheKey] = actualKeys;
        }
        const ak = resolvedKeysCache.current[cacheKey];
        for (let i = 0; i < ak.length; i++) {
             const v = row[ak[i]];
             if (v !== undefined && v !== null && v !== '') return v;
        }
        return '';
    };

    const val = (row: any, keys: string[]) => getValFromRow(row, keys);

    // Global Stats
    const totalPoints = rawSangTai.length;
    const updatedPoints = useMemo(() => {
        let count = 0;
        for (let i = 0; i < rawSangTai.length; i++) {
            if (getValFromRow(rawSangTai[i], ['Ma_Moi', 'MA_MOI', 'Mã mới'])) {
                count++;
            }
        }
        return count;
    }, [rawSangTai, maMoiInputs, normalizedKeysMemo]); // update when inputs or data change

    const handleExportExcel = () => {
        const updatedRows = rawSangTai.filter(r => val(r, ['Ma_Moi', 'MA_MOI', 'Mã mới']) || (val(r, ['MA_DIEM_DO_16', 'MA_DIEM_DO']) in maMoiInputs));
        if (updatedRows.length === 0) {
            alert("Chưa có điểm đo nào được cập nhật mã mới!");
            return;
        }
        
        const wsData = updatedRows.map((r, idx) => {
            const maDiemDo = val(r, ['MA_DIEM_DO_16', 'MA_DIEM_DO']);
            const maMoiCachLocal = maMoiInputs[maDiemDo];
            return {
                "STT": idx + 1,
                "Mã Trạm": val(r, ['ASSETID_ORG', 'MA_TRAM']),
                "Tên Trạm": val(r, ['TEN_TRAM', 'TENTRAM']),
                "Mã Điểm Đo": maDiemDo,
                "Tên Khách Hàng": val(r, ['TEN_KHANG', 'TENKH']),
                "Địa Chỉ": val(r, ['DIA_CHI', 'DIACHI']),
                "Mã Mới": maMoiCachLocal || val(r, ['Ma_Moi', 'MA_MOI', 'Mã mới'])
            };
        });
        
        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "DaCapNhat");
        XLSX.writeFile(wb, `SangTai_CapNhat_${new Date().toISOString().slice(0,10)}.xlsx`);
    };


    const handleMaMoiChange = (maDiemDo: string, text: string) => {
        setMaMoiInputs(prev => ({ ...prev, [maDiemDo]: text }));
    };

    const [bulkMaMoi, setBulkMaMoi] = useState('');
    const [isSavingBulk, setIsSavingBulk] = useState(false);

    const handleSaveMaMoi = async (row: any) => {
        const maDiemDo = val(row, ['MA_DIEM_DO_16', 'MA_DIEM_DO']);
        if (!maDiemDo) return;

        const newMaMoi = maMoiInputs[maDiemDo];
        if (newMaMoi === undefined) return;

        setSavingMaMoi(prev => ({ ...prev, [maDiemDo]: true }));
        const success = await DataStore.syncSangTaiToSheet(maDiemDo, newMaMoi);
        if (success) {
            // Update local object to reflect save without refetching immediately
            row['Ma_Moi'] = newMaMoi;
        } else {
            alert('Lưu thất bại, vui lòng thử lại.');
        }
        setSavingMaMoi(prev => ({ ...prev, [maDiemDo]: false }));
    };

    const handleBulkSave = async () => {
        if (!selectedStationData || !bulkMaMoi.trim()) return;
        setIsSavingBulk(true);
        
        const updates: {maDiemDo: string, maMoi: string}[] = [];
        const newMaMoi = bulkMaMoi.trim();

        selectedStationData.points.forEach((row: any) => {
            const maDiemDo = val(row, ['MA_DIEM_DO_16', 'MA_DIEM_DO']);
            if (maDiemDo) {
                updates.push({ maDiemDo, maMoi: newMaMoi });
            }
        });

        if (updates.length > 0) {
            const success = await DataStore.syncSangTaiBulkToSheet(updates);
            if (success) {
                // Update local inputs and data
                const newInputs = { ...maMoiInputs };
                selectedStationData.points.forEach((row: any) => {
                   const maDiemDo = val(row, ['MA_DIEM_DO_16', 'MA_DIEM_DO']);
                   if (maDiemDo) {
                       row['Ma_Moi'] = newMaMoi;
                       newInputs[maDiemDo] = newMaMoi;
                   }
                });
                setMaMoiInputs(newInputs);
                setBulkMaMoi('');
            } else {
                alert('Lưu thất bại, vui lòng thử lại.');
            }
        }
        setIsSavingBulk(false);
    };

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left Sidebar */}
            <div className={`transition-all duration-300 ease-in-out flex-shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden ${isSidebarCollapsed ? 'w-0 opacity-0 border-0 md:w-0' : 'w-full md:w-80'}`}>
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <h2 className="font-bold text-slate-800 flex items-center justify-between gap-2 mb-3">
                        <span className="flex items-center gap-2">
                           <MapPin className="w-4 h-4 text-indigo-500" />
                           Trạm cần kiểm tra
                        </span>
                    </h2>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Lọc (vd: >10, =5, tên trạm)"
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-slate-700"
                            value={stationFilter}
                            onChange={e => setStationFilter(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {data.length === 0 && (
                        <div className="text-center p-4 text-sm text-slate-500">Không có dữ liệu SangTai</div>
                    )}
                    {data.map(area => (
                        <div key={area.areaName} className="select-none">
                            <button
                                onClick={() => toggleArea(area.areaName)}
                                className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors outline-none text-left"
                            >
                                <span className="font-semibold text-sm text-slate-700 flex items-center gap-1">
                                    {expandedAreas[area.areaName] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                    {area.areaName}
                                </span>
                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                    {area.totalCount} điểm
                                </span>
                            </button>
                            {expandedAreas[area.areaName] && (
                                <div className="ml-4 pl-2 border-l border-slate-100 mt-1 space-y-1">
                                    {area.stations.map(station => (
                                        <button
                                            key={station.maTram}
                                            onClick={() => setSelectedStation(station.maTram)}
                                            className={`w-full text-left p-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                                                selectedStation === station.maTram 
                                                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                                                    : 'hover:bg-slate-50 text-slate-600'
                                            }`}
                                        >
                                            <div className="truncate pr-2">
                                                <div className="truncate">{station.tenTram || station.maTram}</div>
                                                {station.tenTram && <div className="text-[10px] text-slate-400 font-normal">{station.maTram}</div>}
                                            </div>
                                            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                                                selectedStation === station.maTram 
                                                    ? 'bg-indigo-100 text-indigo-700' 
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {station.count}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Main Content */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
                {/* Global Info Bar */}
                <div className="px-4 py-2 bg-indigo-50/50 border-b border-slate-200 flex justify-between items-center text-xs font-medium text-slate-600">
                    <button 
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 px-2 py-1 rounded transition"
                    >
                        {isSidebarCollapsed ? (
                            <><ChevronRight className="w-4 h-4" /> Hiện danh sách</>
                        ) : (
                            <><ChevronDown className="w-4 h-4" /> Ẩn danh sách</>
                        )}
                    </button>
                    <div className="flex items-center gap-3">
                       <span className="bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm text-indigo-700">
                         Cập nhật: {updatedPoints} / {totalPoints} điểm đo
                       </span>
                       <button
                           onClick={handleExportExcel}
                           className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded shadow-sm transition-colors text-xs font-semibold"
                       >
                           <Download className="w-3.5 h-3.5" /> Xuất Excel
                       </button>
                    </div>
                </div>

                {selectedStationData ? (
                    <>
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-500" />
                                    {selectedStationData.tenTram || selectedStationData.maTram}
                                    <span className="text-sm font-normal text-slate-500">({selectedStationData.maTram})</span>
                                </h2>
                            </div>
                            <div className="flex items-center gap-2 bg-white p-1.5 sm:p-2 rounded-lg border border-slate-200 shadow-sm w-full sm:w-auto">
                                <span className="text-xs font-medium text-slate-600 hidden lg:inline whitespace-nowrap">Cập nhật nhanh:</span>
                                <input
                                    type="text"
                                    placeholder="Nhập mã trạm mới..."
                                    className="w-full sm:w-36 px-2 sm:px-3 py-1.5 border border-slate-200 rounded text-sm outline-none focus:border-indigo-500 bg-slate-50"
                                    value={bulkMaMoi}
                                    onChange={(e) => setBulkMaMoi(e.target.value)}
                                />
                                <button
                                    onClick={handleBulkSave}
                                    disabled={isSavingBulk || !bulkMaMoi.trim()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                                >
                                    {isSavingBulk ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    <span className="hidden sm:inline">Lưu tất cả</span>
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 whitespace-nowrap bg-indigo-50/50">Mã trạm mới</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Mã điểm đo</th>
                                        <th className="px-4 py-3 min-w-[200px]">Tên khách hàng</th>
                                        <th className="px-4 py-3 min-w-[250px]">Địa chỉ</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Serial Num</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Mã Đai/CMIS</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Meter Type</th>
                                        <th className="px-4 py-3 whitespace-nowrap">DCU Type</th>
                                        <th className="px-4 py-3 whitespace-nowrap">DCU ID</th>
                                        <th className="px-4 py-3 whitespace-nowrap">DCU Station</th>
                                        <th className="px-4 py-3 whitespace-nowrap">DCU Name</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Use Status</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Ngày giờ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedStationData.points.map((row, idx) => {
                                        const maDiemDo = val(row, ['MA_DIEM_DO_16', 'MA_DIEM_DO']);
                                        const storedMaMoi = val(row, ['Ma_Moi', 'MA_MOI', 'Mã mới']);
                                        const inputVal = maMoiInputs[maDiemDo] !== undefined ? maMoiInputs[maDiemDo] : storedMaMoi;
                                        const isChanged = maMoiInputs[maDiemDo] !== undefined && maMoiInputs[maDiemDo] !== storedMaMoi;
                                        const isSaving = savingMaMoi[maDiemDo];

                                        return (
                                        <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3 bg-indigo-50/10">
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="text"
                                                        className="w-24 px-2 py-1 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500 bg-white"
                                                        value={inputVal}
                                                        onChange={(e) => handleMaMoiChange(maDiemDo, e.target.value)}
                                                        placeholder="Nhập mã..."
                                                    />
                                                    {isChanged && (
                                                        <button 
                                                            onClick={() => handleSaveMaMoi(row)}
                                                            disabled={isSaving}
                                                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-50"
                                                        >
                                                            {isSaving ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-700">{maDiemDo}</td>
                                            <td className="px-4 py-3">{val(row, ['TEN_DIEMO', 'TEN_KHACH_HANG'])}</td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">{val(row, ['DIA_CHI_KH', 'DIA_CHI'])}</td>
                                            <td className="px-4 py-3">{val(row, ['SERIALNUM', 'SERIAL'])}</td>
                                            <td className="px-4 py-3">{val(row, ['MA_DAI_CMIS', 'MA_DAI'])}</td>
                                            <td className="px-4 py-3">{val(row, ['METER_TYPE'])}</td>
                                            <td className="px-4 py-3">{val(row, ['DCUTYPE', 'DCU_TYPE'])}</td>
                                            <td className="px-4 py-3">{val(row, ['DCUID_ORG', 'DCU_ID'])}</td>
                                            <td className="px-4 py-3">{val(row, ['DCU_STATION_ID'])}</td>
                                            <td className="px-4 py-3">{val(row, ['DCUNAME', 'DCU_NAME'])}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px] uppercase">
                                                    {val(row, ['USESTATUS_LAST_ID', 'STATUS'])}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">{val(row, ['NGAYGIO', 'NGAY_GIO'])}</td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6">
                        <Activity className="w-12 h-12 mb-4 text-slate-200" />
                        <p>Chọn một trạm ở danh sách bên trái để xem chi tiết</p>
                    </div>
                )}
            </div>
        </div>
    );
}
