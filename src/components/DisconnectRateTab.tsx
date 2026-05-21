import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { DataStore } from '../store/DataStore';
import { RefreshCw, AlertCircle, WifiOff, Users } from 'lucide-react';
import {
  PieChart,
  Pie,
  Tooltip as RechartsTooltip,
  Cell,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function DisconnectRateTab({ refreshToggle }: { refreshToggle?: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      await DataStore.syncMasterData(); 
      const khuVucList = DataStore.getKhuVuc();
      const missingList = DataStore.getMatKetNoi();
      
      const maKhangToKhuVuc: Record<string, string> = {};
      const totalCustomersByArea: Record<string, number> = {};
      let totalCustomers = 0;
      
      khuVucList.forEach((kv) => {
         const maDdo = String(kv.MA_DDO || '').trim();
         const khuVuc = String(kv.TO_QL || 'Khác').trim();
         if (maDdo) {
             maKhangToKhuVuc[maDdo.replace(/\s+/g, '')] = khuVuc;
             totalCustomersByArea[khuVuc] = (totalCustomersByArea[khuVuc] || 0) + 1;
             totalCustomers++;
         }
      });

      const missingCountByArea: Record<string, number> = {};
      let totalMissing = 0;

      missingList.forEach(m => {
          const raw = String(m.maDiemDo || '').trim();
          const cleaned = raw.replace(/\s+/g, '');
          if (cleaned) {
             let khuVuc = maKhangToKhuVuc[cleaned];
             
             // Fallback in case they actually wanted to strip suffixes still
             if (!khuVuc && cleaned.length > 3) {
                 khuVuc = maKhangToKhuVuc[cleaned.slice(0, -3)];
             }
             
             khuVuc = khuVuc || 'Không xác định / Khác';

             missingCountByArea[khuVuc] = (missingCountByArea[khuVuc] || 0) + 1;
             totalMissing++;
          }
      });

      setStats({
          totalCustomersByArea,
          missingCountByArea,
          totalCustomers,
          totalMissing
      });

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

  const chartData = useMemo(() => {
     if (!stats) return [];
     const res = [];
     const areas = new Set([
         ...Object.keys(stats.totalCustomersByArea),
         ...Object.keys(stats.missingCountByArea)
     ]);
     areas.forEach(area => {
        const t = stats.totalCustomersByArea[area] || 0;
        const m = stats.missingCountByArea[area] || 0;
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
  }, [stats]);

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <p className="font-semibold">Đang tải và đồng bộ dữ liệu mất kết nối...</p>
        <p className="text-sm mt-2 opacity-80">(Quá trình này có thể mất vài giây do dữ liệu lớn)</p>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (!stats) return null;

  const totalRate = stats.totalCustomers > 0 ? (stats.totalMissing / stats.totalCustomers) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Cảnh báo cập nhật Apps Script */}
      {stats.totalMissing === 0 && (
         <div className="bg-amber-100 border border-amber-500 p-4 shadow-[4px_4px_0_#141414] text-amber-900 text-sm">
             <strong className="block mb-1">⚠️ Lưu ý:</strong>
             Chưa có dữ liệu Mất kết nối. Bạn cần vào thẻ <span className="font-bold border px-1 bg-white border-[#141414]">Cấu hình nguồn dữ liệu</span>, copy đoạn Script mới và dán đè vào Apps Script trên Google Sheet của bạn (CSDL hiện hữu), sau đó cập nhật Deployment để ứng dụng có thể lấy được sheet Mất kết nối.
         </div>
      )}

      {/* Tổng quan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] p-5">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#141414]/60 mb-2">
               <Users className="w-4 h-4" /> Tổng số khách hàng
            </div>
            <div className="text-3xl font-black">{stats.totalCustomers.toLocaleString('vi-VN')}</div>
         </div>
         <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] p-5">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-red-600/80 mb-2">
               <WifiOff className="w-4 h-4" /> Tổng mất kết nối
            </div>
            <div className="text-3xl font-black text-red-600">{stats.totalMissing.toLocaleString('vi-VN')}</div>
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
         {/* Bảng chi tiết */}
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

         {/* Biểu đồ */}
         <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] p-6 lg:p-8 flex flex-col items-center">
             <div className="text-center mb-6">
                <h3 className="font-extrabold text-lg uppercase tracking-widest text-[#141414]">Cơ cấu Mất kết nối theo Khu vực</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Tỷ trọng các điểm đo mất kết nối phân bổ theo từng đơn vị</p>
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
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = 25 + innerRadius + (outerRadius - innerRadius);
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          const dataFiltered = chartData.filter(d => d.Mất_Kết_Nối > 0);
                          const percent = (value / stats.totalMissing) * 100;
                          if (percent < 2) return null; // hide small labels
                          return (
                            <text
                              x={x}
                              y={y}
                              fill="#141414"
                              textAnchor={x > cx ? 'start' : 'end'}
                              dominantBaseline="central"
                              className="text-xs font-bold"
                            >
                              {`${dataFiltered[index].name} (${percent.toFixed(1)}%)`}
                            </text>
                          );
                        }}
                      >
                        {chartData.filter(d => d.Mất_Kết_Nối > 0).map((entry, index) => {
                          const professionalColors = [
                            '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6', 
                            '#8b5cf6', '#ec4899', '#10b981', '#f97316', 
                            '#64748b', '#0ea5e9'
                          ];
                          return <Cell key={`cell-${index}`} fill={professionalColors[index % professionalColors.length]} stroke="transparent" />
                        })}
                      </Pie>
                      <RechartsTooltip 
                          contentStyle={{ 
                             backgroundColor: '#141414', 
                             color: 'white', 
                             border: 'none',
                             borderRadius: '8px',
                             boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                             fontWeight: 'bold',
                             fontSize: '13px',
                             padding: '12px 16px'
                          }}
                          itemStyle={{ color: '#fff', paddingTop: '4px' }}
                          formatter={(value: number, name: string, props: any) => {
                             const percent = (value / stats.totalMissing) * 100;
                             return [`${value.toLocaleString('vi-VN')} ĐĐ (${percent.toFixed(1)}%)`, name];
                          }}
                      />
                   </PieChart>
                </ResponsiveContainer>
             </div>
         </div>
      </div>
    </div>
  );
}
