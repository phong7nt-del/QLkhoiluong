import { useState, useMemo } from 'react';
import { DataStore } from '../store/DataStore';
import { format, parseISO, isSameWeek, isSameMonth, isToday } from 'date-fns';
import { TrendingUp, Trophy, ArrowDown, Award, AlignLeft, BarChart3, Download } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';

export default function AnalysisTab({ refreshToggle }: { refreshToggle: number }) {
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'all'>('all');
  const [selectedDay, setSelectedDay] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  
  const rawEntries = useMemo(() => DataStore.getEntries(), [refreshToggle]);
  
  const entries = useMemo(() => {
    return rawEntries.filter(entry => {
      if (!entry.date) return false;
      try {
        if (timeFilter === 'day') {
           return entry.date === selectedDay;
        }
        if (timeFilter === 'month') {
           return entry.date.startsWith(selectedMonth);
        }
        if (timeFilter === 'week') {
           const d = parseISO(entry.date);
           const ref = parseISO(selectedWeekDate);
           return isSameWeek(d, ref, { weekStartsOn: 1 });
        }
        return true;
      } catch (e) {
        return false;
      }
    });
  }, [rawEntries, timeFilter, selectedDay, selectedWeekDate, selectedMonth]);

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
        const lines = (e.content || '').split(/\n/).map(l => {
           let clean = l.trim();
           if (clean.startsWith('-')) clean = clean.substring(1).trim();
           return clean;
        }).filter(l => l.length > 0 && !l.toLowerCase().includes('phát hiện:') && !/^\d+$/.test(l));
        
        lines.forEach(line => {
           let qty = 1;
           let itemContent = line;
           
           // Match format: "Task Name: 2"
           const kvMatch = line.match(/^(.+?):\s*([\d.,]+)$/);
           
           // Match old format: "2 Task Name"
           const qtyMatch = line.match(/^([\d.,]+)\s+(.+)$/);
           
           if (kvMatch) {
              itemContent = kvMatch[1].trim();
              const parsed = parseFloat(kvMatch[2].replace(',', '.'));
              if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) qty = parsed;
           } else if (qtyMatch) {
              const parsed = parseFloat(qtyMatch[1].replace(',', '.'));
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
           
           const cleanContent = (itemContent || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
           
           let exactDm = dinhMucList.find(d => {
               const cleanDName = (d.name || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
               return cleanDName === cleanContent;
           });
           
           let isGroupTask = false;
           if (exactDm) {
               matchedName = exactDm.name;
               isGroupTask = !!exactDm.isGroup;
           } else {
               const foundDm = dinhMucList.find(d => {
                   const cleanDName = (d.name || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
                   return cleanDName.includes(cleanContent) || cleanContent.includes(cleanDName);
               });
               if (foundDm) {
                   matchedName = foundDm.name;
                   isGroupTask = !!foundDm.isGroup;
               }
           }
           
           if (!catData[matchedName]) {
               catData[matchedName] = { categoryName: matchedName, teams: {}, total: 0, quota: 0 };
           }
           if (!catData[matchedName].teams[teamName]) {
               catData[matchedName].teams[teamName] = 0;
           }
           
           const membersCount = e.members?.length || 1;
           const date = e.date || '';
           
           let finalQty = qty;
           if (date >= '2026-08-01') {
               if (isGroupTask) {
                   finalQty = qty;
               } else {
                   finalQty = qty * membersCount;
               }
           } else {
               if (isGroupTask) {
                   finalQty = (qty * membersCount) / 2;
               } else {
                   finalQty = qty * membersCount;
               }
           }
           
           catData[matchedName].teams[teamName] += finalQty;
           catData[matchedName].total += finalQty;
        });
     });
     
     // Trừ tổ tổng hợp khỏi total
     Object.values(catData).forEach(cat => {
         let newTotal = 0;
         Object.keys(cat.teams).forEach(team => {
             const isTongHop = team.toLowerCase().includes('tổng hợp') || team.toLowerCase().includes('bộ phận công tác');
             if (!isTongHop) {
                 newTotal += cat.teams[team];
             }
         });
         cat.total = newTotal;
     });
     
     // Loại bỏ các nhóm không có dữ liệu
     return Object.values(catData).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  }, [entries, dinhMucList]);

  const periodDays = useMemo(() => {
     const uniqueDates = new Set(entries.map(e => e.date).filter(Boolean));
     return Math.max(1, uniqueDates.size);
  }, [entries]);

     // Thống kê năng suất Từng người (Do first before Team Overview)
  const memberOverview = useMemo(() => {
     const stats: Record<string, { member: string; daysWorked: Set<string>; totalStandardDays: number }> = {};
     
     entries.forEach(e => {
        let mbrTokens = e.members || (e as any).workGroup || [];
        if (typeof mbrTokens === 'string') mbrTokens = [mbrTokens];
        const members = (Array.isArray(mbrTokens) && mbrTokens.length > 0) ? mbrTokens : ['Khuyết danh'];
        const date = e.date;
        
        members.forEach(m => {
            if (!stats[m]) {
                stats[m] = { member: m, daysWorked: new Set(), totalStandardDays: 0 };
            }
            if (date) stats[m].daysWorked.add(date);
        });
        
        const lines = (e.content || '').split(/\n/).map(l => {
           let clean = l.trim();
           if (clean.startsWith('-')) clean = clean.substring(1).trim();
           return clean;
        }).filter(l => l.length > 0 && !l.toLowerCase().includes('phát hiện:') && !/^\d+$/.test(l));
        
        lines.forEach(line => {
           let qty = 1;
           let itemContent = line;
           
           const kvMatch = line.match(/^(.+?):\s*([\d.,]+)$/);
           const qtyMatch = line.match(/^([\d.,]+)\s+(.+)$/);
           const oldQtyMatch = line.match(/^(\d+)\s+/);
           
           if (kvMatch) {
              itemContent = kvMatch[1].trim();
              const parsed = parseFloat(kvMatch[2].replace(',', '.'));
              if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) qty = parsed;
           } else if (qtyMatch) {
              const parsed = parseFloat(qtyMatch[1].replace(',', '.'));
              if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) qty = parsed;
              itemContent = qtyMatch[2].trim();
           } else if (oldQtyMatch) {
              const parsed = parseInt(oldQtyMatch[1], 10);
              if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) qty = parsed;
           }
           
           let matchedName = 'Khác';
           const cleanItemContent = (itemContent || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
           
           let exactDm = dinhMucList.find(d => {
               const cleanDName = (d.name || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
               return cleanDName === cleanItemContent;
           });
           
           if (exactDm) {
               matchedName = exactDm.name;
           } else {
               const foundDm = dinhMucList.find(d => {
                   const cleanDName = (d.name || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
                   return cleanDName.includes(cleanItemContent) || cleanItemContent.includes(cleanDName);
               });
               if (foundDm) matchedName = foundDm.name;
           }
           
           const cleanMatchedName = matchedName.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
           const dm = dinhMucList.find(d => {
               const cleanDName = (d.name || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
               return cleanDName === cleanMatchedName;
           });
           
           const quotaStr = dm ? String(dm.quota).replace(/,/g, '.') : "0";
           const quota = parseFloat(quotaStr) || 0;
           const isGroup = dm ? !!dm.isGroup : false;
           
           // Năng suất cá nhân:
           // - Nhóm 1 hoặc 2 người: giữ nguyên khối lượng
           // - Nhóm >= 3 người: khối lượng * 2 / số người
           let qtyPerMember = qty;
           if (members.length >= 3) {
               qtyPerMember = (qty * 2) / members.length;
           }
           
           members.forEach(m => {
               if (cleanMatchedName === 'khác') {
                   stats[m].totalStandardDays += (qtyPerMember / 1);
               } else if (quota > 0) {
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

  // Thống kê tổng quan năng suất Tổ based on its members
  const teamOverview = useMemo(() => {
      const allMembersData = DataStore.getMembers();
      
      // Calculate member stats with division for group tasks
      const teamMemberStats: Record<string, { member: string; daysWorked: Set<string>; totalStandardDays: number }> = {};
      
      entries.forEach(e => {
        let mbrTokens = e.members || (e as any).workGroup || [];
        if (typeof mbrTokens === 'string') mbrTokens = [mbrTokens];
        const members = (Array.isArray(mbrTokens) && mbrTokens.length > 0) ? mbrTokens : ['Khuyết danh'];
        const date = e.date;
        
        members.forEach(m => {
            if (!teamMemberStats[m]) {
                teamMemberStats[m] = { member: m, daysWorked: new Set(), totalStandardDays: 0 };
            }
            if (date) teamMemberStats[m].daysWorked.add(date);
        });
        
        const lines = (e.content || '').split(/\n/).map(l => {
           let clean = l.trim();
           if (clean.startsWith('-')) clean = clean.substring(1).trim();
           return clean;
        }).filter(l => l.length > 0 && !l.toLowerCase().includes('phát hiện:') && !/^\d+$/.test(l));
        
        lines.forEach(line => {
           let qty = 1;
           let itemContent = line;
           const kvMatch = line.match(/^(.+?):\s*([\d.,]+)$/);
           const qtyMatch = line.match(/^([\d.,]+)\s+(.+)$/);
           const oldQtyMatch = line.match(/^(\d+)\s+/);
           if (kvMatch) {
              itemContent = kvMatch[1].trim();
              const parsed = parseFloat(kvMatch[2].replace(',', '.'));
              if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) qty = parsed;
           } else if (qtyMatch) {
              const parsed = parseFloat(qtyMatch[1].replace(',', '.'));
              if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) qty = parsed;
              itemContent = qtyMatch[2].trim();
           } else if (oldQtyMatch) {
              const parsed = parseInt(oldQtyMatch[1], 10);
              if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) qty = parsed;
           }
           let matchedName = 'Khác';
           const cleanItemContent = (itemContent || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
           let exactDm = dinhMucList.find(d => {
               const cleanDName = (d.name || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
               return cleanDName === cleanItemContent;
           });
           if (exactDm) {
               matchedName = exactDm.name;
           } else {
               const foundDm = dinhMucList.find(d => {
                   const cleanDName = (d.name || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
                   return cleanDName.includes(cleanItemContent) || cleanItemContent.includes(cleanDName);
               });
               if (foundDm) matchedName = foundDm.name;
           }
           const cleanMatchedName = matchedName.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
           const dm = dinhMucList.find(d => {
               const cleanDName = (d.name || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
               return cleanDName === cleanMatchedName;
           });
           const quotaStr = dm ? String(dm.quota).replace(/,/g, '.') : "0";
           const quota = parseFloat(quotaStr) || 0;
           const isGroup = dm ? !!dm.isGroup : false;
           
           // Năng suất Tổ: Áp dụng cùng công thức năng suất cá nhân
           // - Nhóm 1 hoặc 2 người: giữ nguyên khối lượng
           // - Nhóm >= 3 người: khối lượng * 2 / số người
           let qtyPerMember = qty;
           if (members.length >= 3) {
               qtyPerMember = (qty * 2) / members.length;
           }
           
           members.forEach(m => {
               if (cleanMatchedName === 'khác') {
                   teamMemberStats[m].totalStandardDays += (qtyPerMember / 1);
               } else if (quota > 0) {
                   teamMemberStats[m].totalStandardDays += (qtyPerMember / quota);
               } else {
                   teamMemberStats[m].totalStandardDays += (qtyPerMember * 0.05); 
               }
           });
        });
      });

      const tStats: Record<string, { team: string; membersProductivitySum: number; membersCount: number; maxDaysWork: number }> = {};
      
      Object.values(teamMemberStats).forEach(m => {
          const findM = allMembersData.find(x => x.name === m.member);
          const team = findM ? findM.team : 'Khác';
          
          const days = m.daysWorked.size || 1;
          const p = (m.totalStandardDays / days) * 100;
          
          if (!tStats[team]) {
              tStats[team] = { team, membersProductivitySum: 0, membersCount: 0, maxDaysWork: 0 };
          }
          tStats[team].membersProductivitySum += p;
          tStats[team].membersCount += 1;
          tStats[team].maxDaysWork = Math.max(tStats[team].maxDaysWork, days);
      });

      return Object.values(tStats).map(t => {
          const avgPercent = t.membersCount > 0 ? t.membersProductivitySum / t.membersCount : 0;
          return {
             team: t.team,
             daysWorkedCount: t.maxDaysWork, // Just for display
             totalStandardDays: 0, // Not strictly applicable anymore
             productivityPercent: avgPercent,
             total: avgPercent
          };
      }).sort((a, b) => b.productivityPercent - a.productivityPercent);
  }, [entries, dinhMucList]);

  const maxProductivity = teamOverview.length > 0 ? Number(teamOverview[0].total) : 0;
  const minProductivity = teamOverview.length > 0 ? Number(teamOverview[teamOverview.length - 1].total) : 0;
  const avgProductivity = teamOverview.length > 0 
    ? teamOverview.reduce((acc, t) => acc + Number(t.total), 0) / teamOverview.length 
    : 0;

  const avgMemberProductivity = memberOverview.length > 0
    ? memberOverview.reduce((acc, m) => acc + m.productivityPercent, 0) / memberOverview.length
    : 0;

  console.log("AnalysisTab Debug:", { rawEntriesLength: rawEntries.length, entriesLength: entries.length, categoryStatsLength: categoryStats.length, teamOverviewLength: teamOverview.length });

  const exportToExcel = () => {
      if (memberOverview.length === 0 && teamOverview.length === 0) {
          alert("Không có dữ liệu để xuất");
          return;
      }

      const workbook = XLSX.utils.book_new();

      const formatSheet = (worksheet: any) => {
          Object.keys(worksheet).forEach(address => {
             if (address === '!ref' || address === '!cols' || address === '!rows') return;
             const cell = worksheet[address];
             if (!cell) return;
             
             if (!cell.s) cell.s = {};
             
             if (address.match(/^[A-Z]+1$/)) {
                 cell.s = {
                     font: { bold: true, color: { rgb: "FFFFFF" } },
                     fill: { fgColor: { rgb: "333333" } },
                     alignment: { horizontal: "center", vertical: "center" }
                 };
             } else {
                 cell.s = { alignment: { vertical: "top" } };
             }
             
             cell.s.border = {
                 top: { style: "thin", color: { auto: 1 } },
                 bottom: { style: "thin", color: { auto: 1 } },
                 left: { style: "thin", color: { auto: 1 } },
                 right: { style: "thin", color: { auto: 1 } }
             };
          });
      };

      // 1. Sheet Tổ
      if (teamOverview.length > 0) {
          const teamData = teamOverview.map((t, index) => ({
              "Hạng": index + 1,
              "Tổ": t.team,
              "Chu kỳ (ngày)": t.daysWorkedCount,
              "Năng suất (%)": Number(t.productivityPercent.toFixed(1))
          }));
          const teamSheet = XLSX.utils.json_to_sheet(teamData);
          teamSheet['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 15 }];
          formatSheet(teamSheet);
          XLSX.utils.book_append_sheet(workbook, teamSheet, "NangSuat_To");
      }

      // 2. Sheet Cá nhân
      if (memberOverview.length > 0) {
          const memberData = memberOverview.map((m, index) => ({
              "Hạng": index + 1,
              "Cá nhân": m.member,
              "Chu kỳ (ngày)": m.daysWorkedCount,
              "Định mức": Number(m.totalStandardDays.toFixed(1)),
              "Năng suất (%)": Number(m.productivityPercent.toFixed(1))
          }));
          const memberSheet = XLSX.utils.json_to_sheet(memberData);
          memberSheet['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
          formatSheet(memberSheet);
          XLSX.utils.book_append_sheet(workbook, memberSheet, "NangSuat_CaNhan");
      }

      XLSX.writeFile(workbook, "PhanTichNangSuat.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="border border-[#141414] bg-white p-6 shadow-[4px_4px_0_#141414] lg:py-8 lg:px-10">
        <h2 className="font-serif italic text-2xl lg:text-3xl mb-8 flex items-center gap-3">
          <BarChart3 className="w-8 h-8" />
          Phân Tích & So Sánh Công Việc
        </h2>
        
        <div className="flex flex-wrap gap-2 mb-8 items-center border-b border-[#141414]/10 pb-4">
           <button 
             onClick={() => setTimeFilter('all')}
             className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border border-[#141414] transition-colors ${timeFilter === 'all' ? 'bg-[#141414] text-white' : 'bg-white hover:bg-[#F5F4F2]'}`}
           >
              Tất cả
           </button>

           <div className="flex items-center gap-2">
             <button 
               onClick={() => setTimeFilter('month')}
               className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border border-[#141414] transition-colors ${timeFilter === 'month' ? 'bg-[#141414] text-white' : 'bg-white hover:bg-[#F5F4F2]'}`}
             >
                Tháng
             </button>
             {timeFilter === 'month' && (
                <input 
                  type="month" 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                />
             )}
           </div>

           <div className="flex items-center gap-2">
             <button 
               onClick={() => setTimeFilter('week')}
               className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border border-[#141414] transition-colors ${timeFilter === 'week' ? 'bg-[#141414] text-white' : 'bg-white hover:bg-[#F5F4F2]'}`}
             >
                Tuần
             </button>
             {timeFilter === 'week' && (
                <input 
                  type="date" 
                  title="Chọn một ngày trong tuần cần xem"
                  value={selectedWeekDate}
                  onChange={(e) => setSelectedWeekDate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                />
             )}
             {timeFilter === 'week' && (
               <span className="text-xs uppercase font-mono opacity-50 px-2">(Chọn 1 ngày trong tuần)</span>
             )}
           </div>

           <div className="flex items-center gap-2">
             <button 
               onClick={() => setTimeFilter('day')}
               className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border border-[#141414] transition-colors ${timeFilter === 'day' ? 'bg-[#141414] text-white' : 'bg-white hover:bg-[#F5F4F2]'}`}
             >
                Ngày
             </button>
             {timeFilter === 'day' && (
                <input 
                  type="date" 
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                />
             )}
           </div>

           <div className="ml-auto">
             <button 
                onClick={exportToExcel}
                className="text-[10px] bg-green-600 text-white px-3 py-2 uppercase font-bold tracking-widest hover:bg-green-700 transition-all flex items-center gap-1.5 border border-green-800"
             >
                <Download className="w-3 h-3" /> Xuất Excel
             </button>
           </div>
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
                 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
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
                           <div key={t.team} className="border border-[#141414] bg-white p-3 shadow-[2px_2px_0_#141414] flex flex-col justify-between">
                              <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#141414]/10">
                                 <div className="flex items-center gap-3">
                                    <div className={`shrink-0 w-8 h-8 flex items-center justify-center font-black font-mono text-sm border-2 ${idx === 0 ? 'bg-[#FFF4E5] border-orange-400 text-orange-600 shadow-[1px_1px_0_theme(colors.orange.400)]' : idx === 1 ? 'bg-gray-100 border-gray-400 text-gray-600 shadow-[1px_1px_0_theme(colors.gray.400)]' : idx === 2 ? 'bg-yellow-900/10 border-yellow-900/40 text-yellow-900 shadow-[1px_1px_0_rgba(113,63,18,0.4)]' : 'bg-[#F5F4F2] border-[#141414]/20 text-[#141414] shadow-[1px_1px_0_rgba(20,20,20,0.2)]'}`}>
                                       {idx + 1}
                                    </div>
                                    <div>
                                       <div className="font-bold text-sm leading-tight uppercase tracking-wide">{t.team}</div>
                                       <div className="text-[10px] font-bold opacity-50 mt-0.5">Chu kỳ: {t.daysWorkedCount} ngày</div>
                                    </div>
                                 </div>
                                 <div className="text-right pl-2">
                                    <div className={`text-xl tracking-tighter font-black ${colorClass}`}>
                                       {t.productivityPercent.toFixed(1)}%
                                    </div>
                                 </div>
                              </div>
                              
                              <div>
                                <div className="flex justify-between text-[9px] uppercase font-bold mb-1 opacity-60">
                                   <span>Tiến độ</span>
                                   <span>{t.productivityPercent.toFixed(1)} / 100%</span>
                                </div>
                                <div className="w-full bg-[#141414]/10 h-2 overflow-hidden flex relative">
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
                 
                 <div className="overflow-x-auto border border-[#141414] bg-white shadow-[4px_4px_0_#141414]">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                       <thead className="bg-[#141414]/5 border-b border-[#141414] uppercase text-[10px] font-bold tracking-wider">
                          <tr>
                             <th className="px-4 py-3 text-center w-16">Hạng</th>
                             <th className="px-4 py-3">Cá nhân</th>
                             <th className="px-4 py-3 text-right">Chu kỳ (ngày)</th>
                             <th className="px-4 py-3 text-right">Định mức</th>
                             <th className="px-4 py-3 text-right">Năng suất</th>
                             <th className="px-4 py-3 min-w-[200px]">Tiến độ</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-[#141414]/10">
                          {memberOverview.map((m, idx) => {
                             let colorClass = 'text-[#141414]';
                             let barColor = 'bg-[#141414]';
                             
                             if (m.productivityPercent >= 100) {
                                 colorClass = 'text-green-700 font-bold';
                                 barColor = 'bg-green-600';
                             } else if (m.productivityPercent < avgMemberProductivity) {
                                 colorClass = 'text-red-600 font-bold';
                                 barColor = 'bg-red-500';
                             }

                             return (
                                <tr key={m.member} className="hover:bg-[#141414]/5 transition-colors">
                                   <td className="px-4 py-3 text-center">
                                      <div className={`inline-flex w-7 h-7 items-center justify-center font-black font-mono text-xs border-2 ${idx === 0 ? 'bg-[#FFF4E5] border-orange-400 text-orange-600' : idx === 1 ? 'bg-gray-100 border-gray-400 text-gray-600' : idx === 2 ? 'bg-yellow-900/10 border-yellow-900/40 text-yellow-900' : 'bg-transparent border-transparent text-[#141414]'}`}>
                                         {idx + 1}
                                      </div>
                                   </td>
                                   <td className="px-4 py-3 font-bold text-sm truncate max-w-[200px]" title={m.member}>
                                      {m.member}
                                   </td>
                                   <td className="px-4 py-3 text-right font-mono text-xs">
                                      {m.daysWorkedCount}
                                   </td>
                                   <td className="px-4 py-3 text-right font-mono text-xs">
                                      {m.totalStandardDays.toFixed(1)}
                                   </td>
                                   <td className={`px-4 py-3 text-right font-mono text-base tracking-tight ${colorClass}`}>
                                      {m.productivityPercent.toFixed(1)}%
                                   </td>
                                   <td className="px-4 py-3">
                                      <div className="w-full bg-[#141414]/10 h-2 overflow-hidden flex relative">
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
                                   </td>
                                </tr>
                             );
                          })}
                       </tbody>
                    </table>
                 </div>
              </div>

           </div>
        )}
      </div>
    </div>
  );
}
