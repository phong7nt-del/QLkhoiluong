import { useState, useMemo } from 'react';
import { DataStore } from '../store/DataStore';
import { format, parseISO, isSameWeek, isSameMonth, isToday } from 'date-fns';
import { TrendingUp, Trophy, ArrowDown, Award, AlignLeft, BarChart3 } from 'lucide-react';

export default function AnalysisTab({ refreshToggle }: { refreshToggle: number }) {
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'all'>('all');
  
  const rawEntries = useMemo(() => DataStore.getEntries(), [refreshToggle]);
  
  const entries = useMemo(() => {
    const today = new Date();
    return rawEntries.filter(entry => {
      if (!entry.date) return false;
      try {
        const d = parseISO(entry.date);
        if (timeFilter === 'day') return isToday(d);
        if (timeFilter === 'week') return isSameWeek(d, today, { weekStartsOn: 1 });
        if (timeFilter === 'month') return isSameMonth(d, today);
        return true;
      } catch (e) {
        return false;
      }
    });
  }, [rawEntries, timeFilter]);

  const dinhMucList = useMemo(() => DataStore.getDinhMuc(), [refreshToggle]);

  // Phân tích dữ liệu theo hạng mục và so sánh giữa các tổ
  const categoryStats = useMemo(() => {
     const catData: Record<string, { categoryName: string, teams: Record<string, number>, total: number, quota: number }> = {};
     
     if (dinhMucList && dinhMucList.length > 0) {
        dinhMucList.forEach(dm => {
            catData[dm.name] = { categoryName: dm.name, teams: {}, total: 0, quota: dm.quota || 0 };
        });
     }
     if (!catData['Khác']) {
        catData['Khác'] = { categoryName: 'Khác', teams: {}, total: 0, quota: 0 };
     }
     
     entries.forEach(e => {
        const teamName = e.team || 'Khác';
        
        // Tách các dòng báo cáo
        const lines = e.content.split(/\n/).map(l => {
           let clean = l.trim();
           if (clean.startsWith('-')) {
              clean = clean.substring(1).trim();
           }
           return clean;
        }).filter(l => l.length > 0);
        
        lines.forEach(line => {
           let qty = 1;
           let itemContent = line;
           
           // Match format: "Task Name: 2"
           const kvMatch = line.match(/^(.+?):\s*(\d+)$/);
           
           // Match old format: "2 Task Name"
           const qtyMatch = line.match(/^(\d+)\s+(.+)$/);
           
           if (kvMatch) {
              itemContent = kvMatch[1].trim();
              const parsed = parseInt(kvMatch[2], 10);
              if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) qty = parsed;
           } else if (qtyMatch) {
              const parsed = parseInt(qtyMatch[1], 10);
              if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) qty = parsed;
              itemContent = qtyMatch[2].trim();
           } else {
              // Fallback for old old format
              const oldQtyMatch = line.match(/^(\d+)\s+/);
              if (oldQtyMatch) {
                 const parsed = parseInt(oldQtyMatch[1], 10);
                 if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) qty = parsed;
              }
           }
           
           let matchedName = 'Khác';
           
           // Exactly match in config
           if (catData[itemContent]) {
               matchedName = itemContent;
           } else {
               // Try partial match
               const text = itemContent.toLowerCase();
               const foundDm = dinhMucList.find(dm => text.includes(dm.name.toLowerCase()));
               if (foundDm) {
                   matchedName = foundDm.name;
               }
           }
           
           if (!catData[matchedName]) {
               catData[matchedName] = { categoryName: matchedName, teams: {}, total: 0, quota: 0 };
           }
           if (!catData[matchedName].teams[teamName]) {
               catData[matchedName].teams[teamName] = 0;
           }
           catData[matchedName].teams[teamName] += qty;
           catData[matchedName].total += qty;
        });
     });
     
     // Loại bỏ các nhóm không có dữ liệu
     return Object.values(catData).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  }, [entries, dinhMucList]);

  const periodDays = useMemo(() => {
     const uniqueDates = new Set(entries.map(e => e.date).filter(Boolean));
     return Math.max(1, uniqueDates.size);
  }, [entries]);

  // Thống kê tổng quan năng suất Tổ
  const teamOverview = useMemo(() => {
     const stats: Record<string, { team: string; daysWorked: Set<string>; totalStandardDays: number }> = {};
     
     entries.forEach(e => {
        const teamName = e.team || 'Khác';
        if (!stats[teamName]) {
            stats[teamName] = { team: teamName, daysWorked: new Set(), totalStandardDays: 0 };
        }
        if (e.date) stats[teamName].daysWorked.add(e.date);
     });

     categoryStats.forEach(cat => {
        Object.entries(cat.teams).forEach(([team, rawQty]) => {
            const qty = Number(rawQty);
            if (!stats[team]) {
                stats[team] = { team, daysWorked: new Set(), totalStandardDays: 0 };
            }
            if (cat.quota > 0) {
                stats[team].totalStandardDays += (qty / cat.quota);
            } else {
                stats[team].totalStandardDays += (qty * 0.05); // Tiny arbitrary bump for tracking un-quota'd tasks
            }
        });
     });
     
     const arr = Object.values(stats).map(t => {
         const days = t.daysWorked.size || 1;
         const p = (t.totalStandardDays / days) * 100;
         return {
            team: t.team,
            daysWorkedCount: t.daysWorked.size,
            totalStandardDays: t.totalStandardDays,
            productivityPercent: p,
            total: p
         };
     }).sort((a, b) => b.productivityPercent - a.productivityPercent);
     
     return arr;
  }, [categoryStats, entries]);

  const maxProductivity = teamOverview.length > 0 ? Number(teamOverview[0].total) : 0;
  const minProductivity = teamOverview.length > 0 ? Number(teamOverview[teamOverview.length - 1].total) : 0;
  const avgProductivity = teamOverview.length > 0 
    ? teamOverview.reduce((acc, t) => acc + Number(t.total), 0) / teamOverview.length 
    : 0;

  // Thống kê năng suất Từng người
  const memberOverview = useMemo(() => {
     const stats: Record<string, { member: string; daysWorked: Set<string>; totalStandardDays: number }> = {};
     
     entries.forEach(e => {
        const mbrTokens = e.members || [];
        const members = mbrTokens.length > 0 ? mbrTokens : ['Khuyết danh'];
        const date = e.date;
        
        members.forEach(m => {
            if (!stats[m]) {
                stats[m] = { member: m, daysWorked: new Set(), totalStandardDays: 0 };
            }
            if (date) stats[m].daysWorked.add(date);
        });
        
        const lines = e.content.split(/\n/).map(l => {
           let clean = l.trim();
           if (clean.startsWith('-')) clean = clean.substring(1).trim();
           return clean;
        }).filter(l => l.length > 0);
        
        lines.forEach(line => {
           let qty = 1;
           let itemContent = line;
           
           const kvMatch = line.match(/^(.+?):\s*(\d+)$/);
           const qtyMatch = line.match(/^(\d+)\s+(.+)$/);
           const oldQtyMatch = line.match(/^(\d+)\s+/);
           
           if (kvMatch) {
              itemContent = kvMatch[1].trim();
              const parsed = parseInt(kvMatch[2], 10);
              if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) qty = parsed;
           } else if (qtyMatch) {
              const parsed = parseInt(qtyMatch[1], 10);
              if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) qty = parsed;
              itemContent = qtyMatch[2].trim();
           } else if (oldQtyMatch) {
              const parsed = parseInt(oldQtyMatch[1], 10);
              if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) qty = parsed;
           }
           
           let matchedName = 'Khác';
           const exactDm = dinhMucList.find(d => d.name === itemContent);
           if (exactDm) {
               matchedName = exactDm.name;
           } else {
               const text = itemContent.toLowerCase();
               const foundDm = dinhMucList.find(dm => text.includes(dm.name.toLowerCase()));
               if (foundDm) matchedName = foundDm.name;
           }
           
           const dm = dinhMucList.find(d => d.name === matchedName);
           const quota = dm ? (dm.quota || 0) : 0;
           
           // Chia đều khối lượng cho các thành viên tham gia
           const qtyPerMember = qty / members.length;
           
           members.forEach(m => {
               if (quota > 0) {
                   stats[m].totalStandardDays += (qtyPerMember / quota);
               } else {
                   stats[m].totalStandardDays += (qtyPerMember * 0.05);
               }
           });
        });
     });

     return Object.values(stats).map(m => {
         const days = m.daysWorked.size || 1;
         const p = (m.totalStandardDays / days) * 100;
         return {
            member: m.member,
            daysWorkedCount: m.daysWorked.size,
            totalStandardDays: m.totalStandardDays,
            productivityPercent: p,
         };
     }).sort((a, b) => b.productivityPercent - a.productivityPercent);
  }, [entries, dinhMucList]);

  const avgMemberProductivity = memberOverview.length > 0
    ? memberOverview.reduce((acc, m) => acc + m.productivityPercent, 0) / memberOverview.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="border border-[#141414] bg-white p-6 shadow-[4px_4px_0_#141414] lg:py-8 lg:px-10">
        <h2 className="font-serif italic text-2xl lg:text-3xl mb-8 flex items-center gap-3">
          <BarChart3 className="w-8 h-8" />
          Phân Tích & So Sánh Công Việc
        </h2>
        
        <div className="flex flex-wrap gap-2 mb-8">
           <button 
             onClick={() => setTimeFilter('all')}
             className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border border-[#141414] transition-colors ${timeFilter === 'all' ? 'bg-[#141414] text-white' : 'hover:bg-[#F5F4F2]'}`}
           >
              Tất cả
           </button>
           <button 
             onClick={() => setTimeFilter('month')}
             className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border border-[#141414] transition-colors ${timeFilter === 'month' ? 'bg-[#141414] text-white' : 'hover:bg-[#F5F4F2]'}`}
           >
              Tháng này
           </button>
           <button 
             onClick={() => setTimeFilter('week')}
             className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border border-[#141414] transition-colors ${timeFilter === 'week' ? 'bg-[#141414] text-white' : 'hover:bg-[#F5F4F2]'}`}
           >
              Tuần này
           </button>
           <button 
             onClick={() => setTimeFilter('day')}
             className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border border-[#141414] transition-colors ${timeFilter === 'day' ? 'bg-[#141414] text-white' : 'hover:bg-[#F5F4F2]'}`}
           >
              Hôm nay
           </button>
        </div>
        
        {categoryStats.length === 0 ? (
           <div className="text-center py-12 text-sm opacity-50 italic uppercase bg-[#F5F4F2] border border-[#141414] shadow-[4px_4px_0_#141414]">
               Chưa có dữ liệu báo cáo để phân tích.
           </div>
        ) : (
           <div className="space-y-8">
              {/* Overview Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-[#FFF4E5] border border-orange-400 p-5 shadow-[4px_4px_0_#141414] relative">
                    <div className="absolute top-3 right-3 text-orange-400"><Award className="w-8 h-8" /></div>
                    <div className="text-xs uppercase font-bold tracking-wider text-orange-900/60 mb-2">Trung bình Năng Suất</div>
                    <div className="text-3xl font-black text-orange-900">{avgProductivity.toFixed(1)} <span className="text-sm font-normal uppercase tracking-widest">% Đ.Mức</span></div>
                 </div>
                 <div className="bg-[#E5F6DF] border border-green-500 p-5 shadow-[4px_4px_0_#141414] relative">
                    <div className="absolute top-3 right-3 text-green-500"><Trophy className="w-8 h-8" /></div>
                    <div className="text-xs uppercase font-bold tracking-wider text-green-900/60 mb-2">Đạt cao nhất</div>
                    <div className="text-3xl font-black text-green-900">{maxProductivity.toFixed(1)} <span className="text-sm font-normal uppercase tracking-widest">% Đ.Mức</span></div>
                    <div className="text-xs font-bold mt-2 text-green-800">{teamOverview[0]?.team}</div>
                 </div>
                 <div className="bg-[#FFEFEF] border border-red-400 p-5 shadow-[4px_4px_0_#141414] relative">
                    <div className="absolute top-3 right-3 text-red-400"><ArrowDown className="w-8 h-8" /></div>
                    <div className="text-xs uppercase font-bold tracking-wider text-red-900/60 mb-2">Đạt thấp nhất</div>
                    <div className="text-3xl font-black text-red-900">{minProductivity.toFixed(1)} <span className="text-sm font-normal uppercase tracking-widest">% Đ.Mức</span></div>
                    <div className="text-xs font-bold mt-2 text-red-800">{teamOverview[teamOverview.length - 1]?.team}</div>
                 </div>
              </div>
              
              <div className="w-full h-px bg-[#141414]/10 my-6"></div>
              
              <div className="w-full">
                 <h3 className="text-sm font-bold uppercase tracking-widest bg-[#141414] text-white p-3 mb-6 inline-flex items-center gap-2 shadow-[4px_4px_0_rgba(20,20,20,0.2)]">
                    <Award className="w-4 h-4" />
                    Xếp Hạng Năng Suất Các Tổ
                 </h3>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {teamOverview.map((t, idx) => {
                        let colorClass = 'text-[#141414]';
                        let barColor = 'bg-[#141414]';
                        
                        if (t.productivityPercent >= 100) {
                            colorClass = 'text-green-700';
                            barColor = 'bg-green-600';
                        } else if (t.productivityPercent < avgProductivity) {
                            colorClass = 'text-red-600';
                            barColor = 'bg-red-500';
                        }

                        return (
                           <div key={t.team} className="border border-[#141414] bg-white p-5 shadow-[4px_4px_0_#141414] flex flex-col justify-between">
                              <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#141414]/10">
                                 <div className="flex items-center gap-4">
                                    <div className={`shrink-0 w-12 h-12 flex items-center justify-center font-black font-mono text-xl border-2 ${idx === 0 ? 'bg-[#FFF4E5] border-orange-400 text-orange-600 shadow-[2px_2px_0_theme(colors.orange.400)]' : idx === 1 ? 'bg-gray-100 border-gray-400 text-gray-600 shadow-[2px_2px_0_theme(colors.gray.400)]' : idx === 2 ? 'bg-yellow-900/10 border-yellow-900/40 text-yellow-900 shadow-[2px_2px_0_rgba(113,63,18,0.4)]' : 'bg-[#F5F4F2] border-[#141414]/20 text-[#141414] shadow-[2px_2px_0_rgba(20,20,20,0.2)]'}`}>
                                       {idx + 1}
                                    </div>
                                    <div>
                                       <div className="font-bold text-lg leading-tight uppercase tracking-wide">{t.team}</div>
                                       <div className="text-xs font-bold opacity-50 mt-1">Chu kỳ làm việc: {t.daysWorkedCount} ngày</div>
                                    </div>
                                 </div>
                                 <div className="text-right pl-4">
                                    <div className={`text-3xl tracking-tighter font-black ${colorClass}`}>
                                       {t.productivityPercent.toFixed(1)}%
                                    </div>
                                    <div className="text-xs font-bold opacity-50 mt-1">Đ.Mức Tích Lũy: {t.totalStandardDays.toFixed(1)} ngày</div>
                                 </div>
                              </div>
                              
                              <div>
                                <div className="flex justify-between text-[10px] uppercase font-bold mb-1 opacity-60">
                                   <span>Tiến độ đạt định mức</span>
                                   <span>{t.productivityPercent.toFixed(1)} / 100%</span>
                                </div>
                                <div className="w-full bg-[#141414]/10 h-3 overflow-hidden flex relative">
                                   <div 
                                      className={`h-full transition-all duration-1000 ease-out ${barColor}`} 
                                      style={{ width: `${Math.min(t.productivityPercent, 100)}%` }}
                                   ></div>
                                   {t.productivityPercent > 100 && (
                                      <div 
                                        className="bg-yellow-400 h-full transition-all duration-1000"
                                        style={{ width: `${Math.min(t.productivityPercent - 100, 100)}%` }}
                                        title={`Vượt mức ${(t.productivityPercent - 100).toFixed(1)}%`}
                                      ></div>
                                   )}
                                </div>
                              </div>
                           </div>
                        );
                    })}
                 </div>
              </div>

              <div className="w-full h-px bg-[#141414]/10 my-6"></div>

              <div className="w-full">
                 <h3 className="text-sm font-bold uppercase tracking-widest bg-[#141414] text-white p-3 mb-6 inline-flex items-center gap-2 shadow-[4px_4px_0_rgba(20,20,20,0.2)]">
                    <Award className="w-4 h-4" />
                    Xếp Hạng Năng Suất Cá Nhân
                 </h3>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {memberOverview.map((m, idx) => {
                        let colorClass = 'text-[#141414]';
                        let barColor = 'bg-[#141414]';
                        
                        if (m.productivityPercent >= 100) {
                            colorClass = 'text-green-700';
                            barColor = 'bg-green-600';
                        } else if (m.productivityPercent < avgMemberProductivity) {
                            colorClass = 'text-red-600';
                            barColor = 'bg-red-500';
                        }

                        return (
                           <div key={m.member} className="border border-[#141414] bg-white p-5 shadow-[4px_4px_0_#141414] flex flex-col justify-between">
                              <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#141414]/10">
                                 <div className="flex items-center gap-4">
                                    <div className={`shrink-0 w-12 h-12 flex items-center justify-center font-black font-mono text-xl border-2 ${idx === 0 ? 'bg-[#FFF4E5] border-orange-400 text-orange-600 shadow-[2px_2px_0_theme(colors.orange.400)]' : idx === 1 ? 'bg-gray-100 border-gray-400 text-gray-600 shadow-[2px_2px_0_theme(colors.gray.400)]' : idx === 2 ? 'bg-yellow-900/10 border-yellow-900/40 text-yellow-900 shadow-[2px_2px_0_rgba(113,63,18,0.4)]' : 'bg-[#F5F4F2] border-[#141414]/20 text-[#141414] shadow-[2px_2px_0_rgba(20,20,20,0.2)]'}`}>
                                       {idx + 1}
                                    </div>
                                    <div>
                                       <div className="font-bold text-lg leading-tight uppercase tracking-wide">{m.member}</div>
                                       <div className="text-xs font-bold opacity-50 mt-1">Chu kỳ làm việc: {m.daysWorkedCount} ngày</div>
                                    </div>
                                 </div>
                                 <div className="text-right pl-4">
                                    <div className={`text-3xl tracking-tighter font-black ${colorClass}`}>
                                       {m.productivityPercent.toFixed(1)}%
                                    </div>
                                    <div className="text-xs font-bold opacity-50 mt-1">Đ.Mức Tích Lũy: {m.totalStandardDays.toFixed(1)} ngày</div>
                                 </div>
                              </div>
                              
                              <div>
                                <div className="flex justify-between text-[10px] uppercase font-bold mb-1 opacity-60">
                                   <span>Tiến độ đạt định mức</span>
                                   <span>{m.productivityPercent.toFixed(1)} / 100%</span>
                                </div>
                                <div className="w-full bg-[#141414]/10 h-3 overflow-hidden flex relative">
                                   <div 
                                      className={`h-full transition-all duration-1000 ease-out ${barColor}`} 
                                      style={{ width: `${Math.min(m.productivityPercent, 100)}%` }}
                                   ></div>
                                   {m.productivityPercent > 100 && (
                                      <div 
                                        className="bg-yellow-400 h-full transition-all duration-1000"
                                        style={{ width: `${Math.min(m.productivityPercent - 100, 100)}%` }}
                                        title={`Vượt mức ${(m.productivityPercent - 100).toFixed(1)}%`}
                                      ></div>
                                   )}
                                </div>
                              </div>
                           </div>
                        );
                    })}
                 </div>
              </div>

           </div>
        )}
      </div>
    </div>
  );
}
