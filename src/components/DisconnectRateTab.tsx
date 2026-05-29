import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { DataStore } from '../store/DataStore';
import { RefreshCw, AlertCircle, WifiOff, Users, ChevronRight, Search, Filter, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import {
  PieChart,
  Pie,
  Tooltip as RechartsTooltip,
  Cell,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ChiTietMKN {
  IMEI: string;
  DCUTYPE: string;
  DCUDESC: string;
  DCUID_ORG: string;
  IDSTATION: string;
  TILE: string;
  SL_DANAP: string;
  SL_TT: string;
  SL_TT_1PHA: string;
  SL_TT_3PHA: string;
  STATUS_DCU: string;
  _calculatedKH?: number;
  _calculated1P?: number;
  _calculated3P?: number;
  [key: string]: string | number | undefined;
}

export default function DisconnectRateTab({ refreshToggle }: { refreshToggle?: number }) {
  const [subTab, setSubTab] = useState<'overview' | 'details'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Data for Overview tab
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [overviewStatsNhanh, setOverviewStatsNhanh] = useState<any>(null);
  
  // Data for Details tab
  const [chiTietList, setChiTietList] = useState<ChiTietMKN[]>([]);
  const [stationMap, setStationMap] = useState<Record<string, string>>({});
  
  // Selection state for Details tab
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'Online' | 'Offline' | null>(null);

  const normalizeTargetArea = (area: string) => {
      const a = area.toLowerCase();
      if (a.includes("vũng tàu") || a.includes("vung tau") || a.includes("vùng tàu")) return "Vũng Tàu";
      if (a.includes("bà rịa") || a.includes("ba ria")) return "Bà Rịa";
      if (a.includes("phú mỹ") || a.includes("phu my")) return "Phú Mỹ";
      if (a.includes("côn đảo") || a.includes("con dao")) return "Côn Đảo";
      return area;
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      await DataStore.syncMasterData(); 
      const khuVucList = DataStore.getKhuVuc();
      const mknData = DataStore.getMatKetNoi();
      const chiTietData = DataStore.getChiTietMKN();
      const stations = DataStore.getStations();
      
      // -- OVERVIEW STATS (Legacy computation for Tỷ lệ mất kết nối) --
      const maKhangToKhuVuc: Record<string, string> = {};
      const totalCustomersByArea: Record<string, number> = {};
      let totalCustomers = 0;
      
      khuVucList.forEach((kv) => {
         const maDdo = String(kv.MA_DDO || '').trim();
         const khuVuc = normalizeTargetArea(String(kv.TO_QL || 'Khác').trim());
         if (maDdo) {
             maKhangToKhuVuc[maDdo.replace(/\s+/g, '')] = khuVuc;
             totalCustomersByArea[khuVuc] = (totalCustomersByArea[khuVuc] || 0) + 1;
             totalCustomers++;
         }
      });

      const missingCountByArea: Record<string, number> = {};
      let totalMissing = 0;

      mknData.forEach((m: any) => {
          // If maDiemDo exists in the new schema or we fallback to IDSTATION or just some ID field
          const raw = String(m.maDiemDo || m['mã điểm đo'] || m['ma diem do'] || m.IDSTATION || '').trim();
          const cleaned = raw.replace(/\s+/g, '');
          if (cleaned) {
             let khuVuc = maKhangToKhuVuc[cleaned];
             
             if (!khuVuc && cleaned.length > 3) {
                 khuVuc = maKhangToKhuVuc[cleaned.slice(0, -3)];
             }
             
             khuVuc = khuVuc || 'Khác';

             missingCountByArea[khuVuc] = (missingCountByArea[khuVuc] || 0) + 1;
             totalMissing++;
          }
      });

      setOverviewStats({
          totalCustomersByArea,
          missingCountByArea,
          totalCustomers,
          totalMissing
      });

      // -- DETAILS STATS (new subtab Chi tiết MKN) --
      const sMap: Record<string, string> = {};
      stations.forEach(s => {
          const area = normalizeTargetArea(String(s.area || '').trim());
          if (area) {
             sMap[String(s.name).toLowerCase().trim()] = area;
             
             // Look for `Tên TBA đặt lại`
             if (s.details) {
                 const normalizeForMatch = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
                 const keys = Object.keys(s.details);
                 const tbaKey = keys.find(k => normalizeForMatch(k).includes('tbadatlai'));
                 if (tbaKey && s.details[tbaKey]) {
                     sMap[String(s.details[tbaKey]).toLowerCase().trim()] = area;
                 }
                 const idStationKey = keys.find(k => normalizeForMatch(k).includes('matbdien') || normalizeForMatch(k).includes('idstation'));
                 if (idStationKey && s.details[idStationKey]) {
                     sMap[String(s.details[idStationKey]).toLowerCase().trim()] = area;
                 }
             }
          }
      });
      setStationMap(sMap);
      
      const detailsList: ChiTietMKN[] = chiTietData.map((d: any) => {
         const getV = (keysToTry: string[]) => {
            for (const k of keysToTry) {
               const actualKey = Object.keys(d).find(dk => dk.toLowerCase().trim() === k.toLowerCase().trim());
               if (actualKey) return String(d[actualKey] || '');
            }
            return '';
         };
         
         const sl_danap = parseFloat(getV(['SL_DANAP', 'số lượng đã nạp', 'SL ĐÃ NẠP']).replace(/,/g, '')) || 0;
         const sl_tt = parseFloat(getV(['SL_TT', 'số lượng thực tế', 'SL THỰC TẾ']).replace(/,/g, '')) || 0;
         const kh = sl_danap - sl_tt;
         const t1 = parseFloat(getV(['SL_TT_1PHA']).replace(/,/g, '')) || 0;
         const t3 = parseFloat(getV(['SL_TT_3PHA']).replace(/,/g, '')) || 0;
         
         return {
            ...d,
            IMEI: getV(['IMEI']),
            DCUTYPE: getV(['DCUTYPE', 'DCU TYPE']),
            DCUDESC: getV(['DCUDESC', 'DCU DESC']),
            DCUID_ORG: getV(['DCUID_ORG']),
            IDSTATION: getV(['IDSTATION', 'ID STATION']),
            TILE: getV(['TILE', 'TỈ LỆ', 'TY LE']),
            SL_DANAP: String(sl_danap),
            SL_TT: String(sl_tt),
            SL_TT_1PHA: String(t1),
            SL_TT_3PHA: String(t3),
            STATUS_DCU: getV(['STATUS_DCU', 'STATUS DCU', 'status dcu', 'trạng thái']),
            _calculatedKH: kh,
            _calculated1P: t1,
            _calculated3P: t3
         };
      });
      
      const fastTotalCustomersByArea: Record<string, number> = {};
      const fastMissingCountByArea: Record<string, number> = {};
      let fastTotalCustomers = 0;
      let fastTotalMissing = 0;

      const removeAcc = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
      const stationMapKeysNorm = Object.keys(sMap)
          .filter(k => k.length > 3)
          .map(k => ({
              original: k,
              norm: removeAcc(k).replace(/^(tram|tba)/, ''),
              area: sMap[k]
          }))
          .filter(k => k.norm.length > 2);

      detailsList.forEach(m => {
          const khCount = parseFloat(m.SL_DANAP) || 0;
          const missingCount = Math.max(0, khCount - (parseFloat(m.SL_TT) || 0));

          fastTotalCustomers += khCount;
          fastTotalMissing += missingCount;

          let area = 'Khác';
          if (m.DCUDESC) {
              const descL = m.DCUDESC.toLowerCase().trim();
              if (sMap[descL]) {
                  area = sMap[descL];
              } else {
                  const foundKey = Object.keys(sMap).find(k => descL.includes(k) || k.includes(descL));
                  if (foundKey) {
                      area = sMap[foundKey];
                  } else {
                      let descNorm = removeAcc(descL);
                      descNorm = descNorm.replace(/^(tram|tba)/, '');
                      const deepMatch = stationMapKeysNorm.find(s => descNorm.includes(s.norm) || s.norm.includes(descNorm));
                      if (deepMatch) area = deepMatch.area;
                  }
              }
          } else if (m.IDSTATION) {
              const idL = m.IDSTATION.toLowerCase().trim();
              if (sMap[idL]) area = sMap[idL];
          }

          fastTotalCustomersByArea[area] = (fastTotalCustomersByArea[area] || 0) + khCount;
          fastMissingCountByArea[area] = (fastMissingCountByArea[area] || 0) + missingCount;
      });

      setOverviewStatsNhanh({
          totalCustomersByArea: fastTotalCustomersByArea,
          missingCountByArea: fastMissingCountByArea,
          totalCustomers: fastTotalCustomers,
          totalMissing: fastTotalMissing
      });

      setChiTietList(detailsList);

    } catch (e: any) {
       console.error("Error fetching data for missing conn:", e);
       setError('Không thể tải dữ liệu. Vui lòng kiểm tra lại cấu trúc Google Sheet.');
    } finally {
       setLoading(false);
    }
  };

  useEffect(() => {
     fetchData();
  }, [refreshToggle]);

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex border-b border-[#141414]/20 bg-white shadow-sm overflow-x-auto">
         <button 
            onClick={() => setSubTab('overview')}
            className={`px-6 py-3.5 font-extrabold uppercase tracking-widest text-sm transition-all whitespace-nowrap ${
                subTab === 'overview' 
                ? 'bg-[#141414] text-white' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
         >
            Tỷ lệ mất kết nối
         </button>
         <button 
            onClick={() => setSubTab('details')}
            className={`px-6 py-3.5 font-extrabold uppercase tracking-widest text-sm transition-all whitespace-nowrap ${
                subTab === 'details' 
                ? 'bg-[#141414] text-white' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
         >
            Chi tiết MKN
         </button>
      </div>
      
      {/* Dynamic Content */}
      <div className="mt-6">
         {loading && !overviewStats && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mb-4" />
            <p className="font-semibold">Đang tải và đồng bộ dữ liệu mất kết nối...</p>
            <p className="text-sm mt-2 opacity-80">(Quá trình này có thể mất vài giây do dữ liệu lớn)</p>
          </div>
         )}
         
         {error && (
          <div className="bg-red-50 text-red-700 p-6 shadow-[4px_4px_0_#141414] border border-[#141414]">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-lg">Lỗi tải dữ liệu</h3>
            </div>
            <p>{error}</p>
            <button onClick={fetchData} className="mt-4 bg-[#141414] text-white px-4 py-2 text-sm font-bold shadow-[2px_2px_0_#A0A0A0] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
               Thử lại
            </button>
          </div>
         )}
         
         {!loading && !error && overviewStats && subTab === 'overview' && (
            <OverviewSubTab stats={overviewStats} statsNhanh={overviewStatsNhanh} fetchData={fetchData} loading={loading} />
         )}

         {!loading && !error && overviewStats && subTab === 'details' && (
            <DetailsSubTab 
                chiTietList={chiTietList} 
                stationMap={stationMap}
                selectedArea={selectedArea}
                setSelectedArea={setSelectedArea}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
            />
         )}
      </div>
    </div>
  );
}

function OverviewSubTab({ stats, statsNhanh, fetchData, loading }: { stats: any, statsNhanh: any, fetchData: any, loading: boolean }) {
  const [viewMode, setViewMode] = useState<'khachhang' | 'nhanh'>('khachhang');
  const activeStats = viewMode === 'khachhang' ? stats : statsNhanh;

  const chartData = useMemo(() => {
     if (!activeStats) return [];
     const res = [];
     const areas = new Set([
         ...Object.keys(activeStats.totalCustomersByArea),
         ...Object.keys(activeStats.missingCountByArea)
     ]);
     areas.forEach(area => {
        const t = activeStats.totalCustomersByArea[area] || 0;
        const m = activeStats.missingCountByArea[area] || 0;
        if (t > 0 || m > 0) {
            res.push({
                name: area,
                Khách_Hàng: t,
                Mất_Kết_Nối: m,
                Ty_Le: t > 0 ? (m / t) * 100 : 0
            });
        }
     });
     return res.sort((a, b) => b.Ty_Le - a.Ty_Le);
  }, [activeStats]);

  const totalRate = activeStats && activeStats.totalCustomers > 0 ? (activeStats.totalMissing / activeStats.totalCustomers) * 100 : 0;

  if (!activeStats) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
       
       <div className="flex flex-row md:items-center gap-4 border-b border-[#141414]/10 pb-4">
           <button 
                onClick={() => setViewMode('khachhang')}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-widest transition-colors ${viewMode === 'khachhang' ? 'bg-[#141414] text-white shadow-[2px_2px_0_#A0A0A0]' : 'bg-white border border-[#141414] shadow-[2px_2px_0_#141414] hover:bg-slate-50'}`}
           >
                Xem SL MDIS
           </button>
           <button 
                onClick={() => setViewMode('nhanh')}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-widest transition-colors ${viewMode === 'nhanh' ? 'bg-[#141414] text-white shadow-[2px_2px_0_#A0A0A0]' : 'bg-white border border-[#141414] shadow-[2px_2px_0_#141414] hover:bg-slate-50'}`}
           >
                Xem SL cảnh báo
           </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] p-5">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#141414]/60 mb-2">
               <Users className="w-4 h-4" /> Tổng số khách hàng
            </div>
            <div className="text-3xl font-black">{activeStats.totalCustomers.toLocaleString('vi-VN')}</div>
         </div>
         <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] p-5">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-red-600/80 mb-2">
               <WifiOff className="w-4 h-4" /> Tổng mất kết nối
            </div>
            <div className="text-3xl font-black text-red-600">{activeStats.totalMissing.toLocaleString('vi-VN')}</div>
         </div>
         <div className="bg-[#141414] text-white border border-[#141414] shadow-[4px_4px_0_#A0A0A0] p-5">
            <div className="text-sm font-bold uppercase tracking-widest text-white/60 mb-2">
               Tỷ lệ mất kết nối (Công ty)
            </div>
            <div className="text-4xl font-black text-[#FFD700]">
               {totalRate.toFixed(2)}%
            </div>
         </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
         <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] overflow-hidden">
            <div className="p-4 bg-[#F5F4F2] border-b border-[#141414] flex justify-between items-center">
               <h3 className="font-bold uppercase tracking-widest text-sm">Chi tiết theo Khu vực</h3>
               <button onClick={fetchData} className="text-[#141414]/60 hover:text-[#141414]" disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
               </button>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-[#141414] text-white text-xs uppercase tracking-widest">
                        <th className="p-3 border-r border-white/20 whitespace-nowrap">Khu Vực</th>
                        <th className="p-3 border-r border-white/20 text-right whitespace-nowrap">Khách hàng</th>
                        <th className="p-3 border-r border-white/20 text-right whitespace-nowrap">Mất kết nối</th>
                        <th className="p-3 text-right whitespace-nowrap">Tỷ lệ</th>
                     </tr>
                  </thead>
                  <tbody>
                     {chartData.map((d, i) => (
                        <tr key={d.name} className="border-b border-[#141414]/10 hover:bg-slate-50 transition-colors">
                           <td className="p-3 border-r border-[#141414]/10 font-bold whitespace-nowrap">{d.name}</td>
                           <td className="p-3 border-r border-[#141414]/10 text-right whitespace-nowrap">{d.Khách_Hàng.toLocaleString('vi-VN')}</td>
                           <td className="p-3 border-r border-[#141414]/10 text-right font-medium text-red-600 whitespace-nowrap">{d.Mất_Kết_Nối.toLocaleString('vi-VN')}</td>
                           <td className="p-3 text-right whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-black bg-slate-100 border border-slate-200">
                                 {d.Ty_Le.toFixed(2)}%
                              </span>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] p-6 lg:p-8 flex flex-col items-center">
             <div className="text-center mb-6">
                <h3 className="font-extrabold text-lg uppercase tracking-widest text-[#141414]">Cơ cấu Mất kết nối theo Khu vực</h3>
             </div>
             
             <div className="w-full flex-1 min-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                        data={chartData.filter(d => d.Mất_Kết_Nối > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={4}
                        dataKey="Mất_Kết_Nối"
                        nameKey="name"
                     >
                        {chartData.filter(d => d.Mất_Kết_Nối > 0).map((entry, index) => {
                          const professionalColors = [
                            '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6', 
                            '#8b5cf6', '#ec4899', '#10b981', '#f97316'
                          ];
                          return <Cell key={`cell-${index}`} fill={professionalColors[index % professionalColors.length]} stroke="transparent" />
                        })}
                      </Pie>
                      <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#141414', color: 'white', borderRadius: '8px', border: 'none' }}
                          formatter={(value: number, name: string) => [value.toLocaleString('vi-VN'), name]}
                      />
                   </PieChart>
                </ResponsiveContainer>
             </div>
         </div>
      </div>
    </div>
  );
}

function DetailsSubTab({ 
    chiTietList, stationMap, 
    selectedArea, setSelectedArea, 
    selectedStatus, setSelectedStatus 
}: { 
    chiTietList: ChiTietMKN[], 
    stationMap: Record<string, string>,
    selectedArea: string | null,
    setSelectedArea: (a: string | null) => void,
    selectedStatus: 'Online' | 'Offline' | null,
    setSelectedStatus: (s: 'Online' | 'Offline' | null) => void
}) {
   const [columnFilters, setColumnFilters] = useState({
       IMEI: '',
       DCUTYPE: '',
       DCUDESC: '',
       DCUID_ORG: '',
       IDSTATION: '',
       TILE: '',
       KH: '',
       SL_DANAP: '',
       SL_TT: '',
       SL1P: '',
       SL3P: ''
   });
   const [openFilter, setOpenFilter] = useState<string | null>(null);
   const [isDetailPrepared, setIsDetailPrepared] = useState(false);
   const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: '_calculatedKH', direction: 'desc' });
   
   const structuredData = useMemo(() => {
       if (!isDetailPrepared) return { areas: [], stats: {} as Record<string, { online: ChiTietMKN[], offline: ChiTietMKN[], other: ChiTietMKN[] }> };

       const areas = ['Công ty', 'Vũng Tàu', 'Bà Rịa', 'Phú Mỹ', 'Côn Đảo'];
       const stats: Record<string, { online: ChiTietMKN[], offline: ChiTietMKN[], other: ChiTietMKN[] }> = {};
       
       areas.forEach(a => {
          stats[a] = { online: [], offline: [], other: [] };
       });
       stats['Khác'] = { online: [], offline: [], other: [] };

       const removeAcc = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');

       const stationMapKeysNorm = Object.keys(stationMap)
           .filter(k => k.length > 3)
           .map(k => ({
               original: k,
               norm: removeAcc(k).replace(/^(tram|tba)/, ''),
               area: stationMap[k]
           }))
           .filter(k => k.norm.length > 2);

       chiTietList.forEach(mkn => {
           let area = 'Khác';
           
           if (mkn.DCUDESC) {
               const descL = mkn.DCUDESC.toLowerCase().trim();
               if (stationMap[descL]) {
                   area = stationMap[descL];
               } else {
                   // Fuzzy match: sometimes they just write part of the TBA name
                   const foundKey = Object.keys(stationMap).find(k => descL.includes(k) || k.includes(descL));
                   if (foundKey) {
                       area = stationMap[foundKey];
                   } else {
                       // Deep fuzzy match: remove accents and spaces
                       let descNorm = removeAcc(descL);
                       descNorm = descNorm.replace(/^(tram|tba)/, '');
                       
                       const deepMatch = stationMapKeysNorm.find(s => descNorm.includes(s.norm) || s.norm.includes(descNorm));
                       if (deepMatch) {
                           area = deepMatch.area;
                       }
                   }
               }
           } else if (mkn.IDSTATION) {
               const idL = mkn.IDSTATION.toLowerCase().trim();
               if (stationMap[idL]) area = stationMap[idL];
           }

           if (!areas.includes(area)) {
               area = 'Khác';
           }

           const st = String(mkn.STATUS_DCU || '').toLowerCase().trim();
           
           // Push to specific area
           if (st === 'online') {
               stats[area].online.push(mkn);
               if (area !== 'Khác') stats['Công ty'].online.push(mkn);
           } else if (st === 'offline') {
               stats[area].offline.push(mkn);
               if (area !== 'Khác') stats['Công ty'].offline.push(mkn);
           } else {
               stats[area].other.push(mkn);
               if (area !== 'Khác') stats['Công ty'].other.push(mkn);
           }
       });

       return { areas, stats };
   }, [chiTietList, stationMap, isDetailPrepared]);

   const renderList = useMemo(() => {
       if (!selectedArea || !selectedStatus || !isDetailPrepared) return [];
       
       let list = structuredData.stats[selectedArea]?.[selectedStatus.toLowerCase() as 'online'|'offline'] || [];
       
       const matchNumberFilter = (val: number, filterStr: string, originalStr?: string) => {
           const s = filterStr.trim();
           if (!s) return true;
           if (/^(>=|<=|>|<|=)\s*$/.test(s)) return true;
           const match = s.match(/^(>=|<=|>|<|=)\s*([\d\.\,]+)\s*%?$/);
           if (match) {
               const op = match[1];
               const num = parseFloat(match[2].replace(/,/g, '.'));
               if (!isNaN(num)) {
                   switch (op) {
                       case '>=': return val >= num;
                       case '<=': return val <= num;
                       case '>': return val > num;
                       case '<': return val < num;
                       case '=': return val === num;
                   }
               }
           }
           // Fallback to text match
           const textToMatch = originalStr != null ? String(originalStr) : String(val);
           return textToMatch.toLowerCase().includes(s.toLowerCase().replace(/,/g, '.'));
       };

       const parsePercent = (v: any) => {
           const str = String(v || '').replace('%', '').replace(/,/g, '.');
           return parseFloat(str) || 0;
       };
       
       if (columnFilters.IMEI.trim()) list = list.filter(i => String(i.IMEI || '').toLowerCase().includes(columnFilters.IMEI.toLowerCase().trim()));
       if (columnFilters.DCUTYPE.trim()) list = list.filter(i => String(i.DCUTYPE || '').toLowerCase().includes(columnFilters.DCUTYPE.toLowerCase().trim()));
       if (columnFilters.DCUDESC.trim()) list = list.filter(i => String(i.DCUDESC || '').toLowerCase().includes(columnFilters.DCUDESC.toLowerCase().trim()));
       if (columnFilters.DCUID_ORG.trim()) list = list.filter(i => String(i.DCUID_ORG || '').toLowerCase().includes(columnFilters.DCUID_ORG.toLowerCase().trim()));
       if (columnFilters.IDSTATION.trim()) list = list.filter(i => String(i.IDSTATION || '').toLowerCase().includes(columnFilters.IDSTATION.toLowerCase().trim()));
       
       if (columnFilters.TILE.trim()) list = list.filter(i => matchNumberFilter(parsePercent(i.TILE), columnFilters.TILE, i.TILE));
       if (columnFilters.KH.trim()) list = list.filter(i => matchNumberFilter(i._calculatedKH || 0, columnFilters.KH));
       if (columnFilters.SL_DANAP.trim()) list = list.filter(i => matchNumberFilter(Number(i.SL_DANAP) || 0, columnFilters.SL_DANAP));
       if (columnFilters.SL_TT.trim()) list = list.filter(i => matchNumberFilter(Number(i.SL_TT) || 0, columnFilters.SL_TT));
       if (columnFilters.SL1P.trim()) list = list.filter(i => matchNumberFilter(i._calculated1P || 0, columnFilters.SL1P));
       if (columnFilters.SL3P.trim()) list = list.filter(i => matchNumberFilter(i._calculated3P || 0, columnFilters.SL3P));
       
       if (sortConfig) {
           list.sort((a, b) => {
               const valA = sortConfig.key.startsWith('_') || sortConfig.key === 'TILE'
                   ? (sortConfig.key === 'TILE' ? parsePercent(a[sortConfig.key]) : a[sortConfig.key])
                   : a[sortConfig.key];
               const valB = sortConfig.key.startsWith('_') || sortConfig.key === 'TILE'
                   ? (sortConfig.key === 'TILE' ? parsePercent(b[sortConfig.key]) : b[sortConfig.key])
                   : b[sortConfig.key];
               
               if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
               if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
               return 0;
           });
       }
       return list;
   }, [structuredData, selectedArea, selectedStatus, columnFilters, isDetailPrepared, sortConfig]);

    const renderFilterHeader = (label: string, field: keyof typeof columnFilters, placeholder: string, align: 'left' | 'right' = 'left') => {
        const sortKeyMap: Record<string, string> = {
            KH: '_calculatedKH',
            SL1P: '_calculated1P',
            SL3P: '_calculated3P',
            SL_DANAP: 'SL_DANAP',
            SL_TT: 'SL_TT'
        };
        const sortKey = sortKeyMap[field] || field;

        return (
        <th className={`p-3 border-r border-white/20 whitespace-nowrap min-w-[120px] relative ${align === 'right' ? 'text-right' : 'text-left'}`}>
            <div className={`flex flex-row items-center gap-2 ${align === 'right' ? 'justify-end' : 'justify-between'} group`}>
                <span 
                    className="cursor-pointer hover:text-amber-200 transition-colors flex items-center gap-1 select-none"
                    onClick={() => {
                        setSortConfig(current => {
                            if (current?.key === sortKey) {
                                return { key: sortKey, direction: current.direction === 'asc' ? 'desc' : 'asc' };
                            }
                            return { key: sortKey, direction: 'asc' };
                        });
                    }}
                >
                    {label}
                    {sortConfig?.key === sortKey ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                    )}
                </span>
                <button
                    onClick={() => setOpenFilter(prev => prev === field ? null : field)}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    aria-label={`Lọc ${label}`}
                >
                    <Filter className={`w-3.5 h-3.5 ${columnFilters[field] ? 'text-amber-400 opacity-100' : 'text-white/40 opacity-70 hover:opacity-100'}`} />
                </button>
            </div>
            {openFilter === field && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-[#141414] shadow-[4px_4px_0_#141414] p-3 z-50 rounded-sm text-black font-normal normal-case tracking-normal min-w-[220px] text-left">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Lọc {label}</span>
                        {columnFilters[field] && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setColumnFilters(p => ({...p, [field]: ''}));
                                    setOpenFilter(null);
                                }}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase"
                            >
                                Xóa
                            </button>
                        )}
                    </div>
                    <input 
                        type="text"
                        autoFocus
                        className="w-full border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 relative z-50"
                        placeholder={placeholder}
                        value={columnFilters[field]}
                        onChange={e => setColumnFilters(p => ({...p, [field]: e.target.value}))}
                        onKeyDown={e => { if (e.key === 'Enter') setOpenFilter(null); }}
                    />
                </div>
            )}
        </th>
    )};

    const detailPieChartData = useMemo(() => {
        if (!isDetailPrepared) return [];
        const areas = ['Vũng Tàu', 'Bà Rịa', 'Phú Mỹ', 'Côn Đảo', 'Khác'];
        const resKH: { name: string, value: number }[] = [];
        areas.forEach(a => {
            const sumOfflineKH = structuredData.stats[a]?.offline.reduce((acc, curr) => acc + (curr._calculatedKH || 0), 0) || 0;
            if (sumOfflineKH > 0) resKH.push({ name: a, value: sumOfflineKH });
        });
        
        if (resKH.length > 0) return resKH;
        
        const resCount: { name: string, value: number }[] = [];
        areas.forEach(a => {
            const count = structuredData.stats[a]?.offline.length || 0;
            if (count > 0) resCount.push({ name: a, value: count });
        });
        return resCount;
    }, [structuredData, isDetailPrepared]);

    if (!isDetailPrepared) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white border border-[#141414] shadow-[4px_4px_0_#141414] animate-in fade-in duration-300">
                <WifiOff className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-xl font-bold mb-2">Thông tin Chi tiết Mất Kết Nối</h3>
                <p className="text-slate-500 max-w-md text-center mb-6 text-sm leading-relaxed">
                    Dữ liệu chi tiết chứa danh sách toàn bộ các điểm đo và trạng thái kết nối. Vui lòng tải dữ liệu để phân tích chi tiết và xem biểu đồ tổng quát.
                </p>
                <button 
                    onClick={() => {
                        setIsDetailPrepared(true);
                        setSelectedArea('Công ty');
                        setSelectedStatus('Offline');
                    }}
                    className="bg-[#141414] text-white px-8 py-3.5 text-sm font-bold shadow-[4px_4px_0_#A0A0A0] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#A0A0A0] transition-all uppercase tracking-widest flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Tải dữ liệu
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
               {['Công ty', 'Vũng Tàu', 'Bà Rịa', 'Phú Mỹ', 'Côn Đảo', 'Khác'].map(area => {
                  const s = structuredData.stats[area];
                  const total = s.online.length + s.offline.length + s.other.length;
                  if (total === 0 && area === 'Khác') return null;

                  const sumOnlineKH = s.online.reduce((acc, curr) => acc + (curr._calculatedKH || 0), 0);
                  const sumOfflineKH = s.offline.reduce((acc, curr) => acc + (curr._calculatedKH || 0), 0);

                  return (
                      <div key={area} className="bg-white border text-sm border-[#141414] shadow-[4px_4px_0_#141414] flex flex-col items-stretch overflow-hidden">
                          <div className="bg-[#141414] text-white p-3 font-black text-center uppercase tracking-widest text-sm">
                              {area}
                          </div>
                          <div className="flex divide-x divide-[#141414]/10 flex-1">
                              <button 
                                 onClick={() => { setSelectedArea(area); setSelectedStatus('Online'); }}
                                 className={`flex-1 p-3 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                                     selectedArea === area && selectedStatus === 'Online'
                                     ? 'bg-blue-50 ring-inset ring-2 ring-blue-500'
                                     : 'hover:bg-slate-50'
                                 }`}
                              >
                                  <span className="text-xs font-bold text-slate-500 uppercase mb-1">Online</span>
                                  <span className="text-2xl font-black text-blue-600">{s.online.length}</span>
                                  <span className="text-[10px] text-slate-500 font-semibold mt-1">KH: {sumOnlineKH.toLocaleString('vi-VN')}</span>
                              </button>
                              <button 
                                 onClick={() => { setSelectedArea(area); setSelectedStatus('Offline'); }}
                                 className={`flex-1 p-3 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                                     selectedArea === area && selectedStatus === 'Offline'
                                     ? 'bg-red-50 ring-inset ring-2 ring-red-500'
                                     : 'hover:bg-slate-50'
                                 }`}
                              >
                                  <span className="text-xs font-bold text-slate-500 uppercase mb-1">Offline</span>
                                  <span className="text-2xl font-black text-red-600">{s.offline.length}</span>
                                  <span className="text-[10px] text-slate-500 font-semibold mt-1">KH: {sumOfflineKH.toLocaleString('vi-VN')}</span>
                              </button>
                          </div>
                      </div>
                  );
               })}
            </div>

            {/* Detail List */}
            {selectedArea && selectedStatus && (
                <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] rounded-sm overflow-hidden animate-in fade-in slide-in-from-top-4">
                   <div className="p-4 bg-[#F5F4F2] border-b border-[#141414] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                       <div className="font-bold flex items-center gap-2">
                          <span className="uppercase text-sm tracking-widest hidden sm:inline">Danh sách</span>
                          <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
                          <span className={selectedStatus === 'Online' ? 'text-blue-600' : 'text-red-600'}>
                             {selectedArea} ({selectedStatus})
                          </span>
                          <span className="ml-2 bg-white px-2 py-0.5 rounded text-xs font-black border">
                              {renderList.length}
                          </span>
                       </div>
                   </div>
                   
                   {renderList.length > 0 ? (
                       <div className="overflow-x-auto max-h-[800px] overflow-y-auto w-full">
                           <table className="w-full text-left border-collapse table-auto whitespace-normal">
                               <thead className="sticky top-0 bg-[#141414] text-white z-20 shadow-md">
                                   <tr className="text-xs uppercase tracking-widest border-b border-[#141414]">
                                       {renderFilterHeader('IMEI', 'IMEI', 'Lọc IMEI...')}
                                       {renderFilterHeader('DCUTYPE', 'DCUTYPE', 'Lọc loại DCU...')}
                                       {renderFilterHeader('DCUDESC', 'DCUDESC', 'Lọc mô tả...')}
                                       {renderFilterHeader('DCUID_ORG', 'DCUID_ORG', 'Lọc ORG...')}
                                       {renderFilterHeader('IDSTATION', 'IDSTATION', 'Lọc trạm...')}
                                       {renderFilterHeader('TỈ LỆ', 'TILE', 'Lọc tỷ lệ...', 'right')}
                                        {renderFilterHeader('ĐÃ NẠP', 'SL_DANAP', 'Lọc đã nạp...', 'right')}
                                        {renderFilterHeader('SL_TT', 'SL_TT', 'Lọc SL TT...', 'right')}
                                       {renderFilterHeader('KH', 'KH', 'Lọc KH...', 'right')}
                                       {renderFilterHeader('SL TT 1PHA', 'SL1P', 'Lọc 1 pha...', 'right')}
                                       {renderFilterHeader('SL TT 3PHA', 'SL3P', 'Lọc 3 pha...', 'right')}
                                   </tr>
                               </thead>
                               <tbody className="text-sm">
                                   {renderList.map((item, idx) => (
                                       <tr key={idx} className="border-b border-[#141414]/10 hover:bg-slate-50 transition-colors">
                                           <td className="p-3 border-r border-[#141414]/10 font-mono text-xs break-all">{item.IMEI}</td>
                                           <td className="p-3 border-r border-[#141414]/10 break-words">{item.DCUTYPE}</td>
                                           <td className="p-3 border-r border-[#141414]/10 font-medium text-slate-800 break-words">{item.DCUDESC}</td>
                                           <td className="p-3 border-r border-[#141414]/10 font-mono text-xs break-words">{item.DCUID_ORG}</td>
                                           <td className="p-3 border-r border-[#141414]/10 font-mono text-xs break-words">{item.IDSTATION}</td>
                                           <td className="p-3 border-r border-[#141414]/10 text-right font-medium whitespace-nowrap">{item.TILE}</td>
                                            <td className="p-3 border-r border-[#141414]/10 text-right font-medium">{(Number(item.SL_DANAP) || 0).toLocaleString('vi-VN')}</td>
                                            <td className="p-3 border-r border-[#141414]/10 text-right font-medium">{(Number(item.SL_TT) || 0).toLocaleString('vi-VN')}</td>
                                           <td className="p-3 border-r border-[#141414]/10 text-right font-black text-[#141414] bg-amber-50">
                                               {(item._calculatedKH || 0).toLocaleString('vi-VN')}
                                           </td>
                                           <td className="p-3 border-r border-[#141414]/10 text-right">{(item._calculated1P || 0).toLocaleString('vi-VN')}</td>
                                           <td className="p-3 text-right">{(item._calculated3P || 0).toLocaleString('vi-VN')}</td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                  ) : (
                      <div className="p-12 text-center text-slate-500 font-medium">
                          Không có dữ liệu
                      </div>
                  )}
               </div>
           )}
       </div>
   );
}
