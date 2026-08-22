import React, { useState, useEffect, useMemo } from 'react';
import { DataStore } from '../store/DataStore';
import * as XLSX from 'xlsx';
import { Calendar, FileSpreadsheet, Eye, EyeOff, Search, TrendingUp, AlertCircle, CheckCircle, Clock, Users } from 'lucide-react';

export default function PlanProgressTab({ refreshToggle }: { refreshToggle?: number }) {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('Đội');
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(null);

  const dinhMucList = useMemo(() => DataStore.getDinhMuc(), [refreshToggle]);
  const entries = useMemo(() => DataStore.getEntries(), [refreshToggle]);

  useEffect(() => {
     // Populate teams
     const teams = DataStore.getTeams();
     setAvailableTeams(['Đội', ...teams.filter(t => t !== 'Đội')]);

     // Extract unique months (e.g. "8/2026") from dinhMuc history
     const months = new Set<string>();
     dinhMucList.forEach(dm => {
         if (dm.history) {
             Object.keys(dm.history).forEach(k => {
                 const m = k.match(/(\d+)\/(\d{4})/);
                 if (m) {
                     months.add(`${m[1]}/${m[2]}`);
                 }
             });
         }
     });
     
     const monthsArr = Array.from(months).sort((a, b) => {
         const parseStr = (s: string) => {
             const m = s.match(/(\d+)\/(\d{4})/);
             if (m) return parseInt(m[2]) * 100 + parseInt(m[1]);
             return 0;
         }
         return parseStr(b) - parseStr(a); // desc
     });
     
     setAvailableMonths(monthsArr);
     if (monthsArr.length > 0 && !selectedMonth) {
         setSelectedMonth(monthsArr[0]);
     }
  }, [dinhMucList]);

  const planData = useMemo(() => {
      if (!selectedMonth) return [];
      
      const mMatch = selectedMonth.match(/(\d+)\/(\d{4})/);
      let targetMonth = -1;
      let targetYear = -1;
      if (mMatch) {
          targetMonth = parseInt(mMatch[1]);
          targetYear = parseInt(mMatch[2]);
      }
      
      // Determine the plan key prefix based on selectedTeam
      let prefix = "Tháng";
      if (selectedTeam === 'Đội') prefix = "D -";
      else if (selectedTeam.includes("Phú Mỹ")) prefix = "P -";
      else if (selectedTeam.includes("Bà Rịa") || selectedTeam.includes("Bà Ria")) prefix = "B -";
      else if (selectedTeam.includes("Vũng Tàu")) prefix = "V -";
      
      const planColumnKey = `${prefix} ${selectedMonth}`;
      
      // Calculate actual quantities
      const actualQtyMap = new Map<string, number>();
      
      if (targetYear !== -1 && targetMonth !== -1) {
          entries.forEach(e => {
             if (selectedTeam !== 'Đội' && !e.team.includes(selectedTeam)) return;
             const dParts = e.date.split('-');
             if (dParts.length === 3) {
                 const eYear = parseInt(dParts[0]);
                 const eMonth = parseInt(dParts[1]);
                 if (eYear === targetYear && eMonth === targetMonth) {
                     // Check content
                     dinhMucList.forEach(dm => {
                         if (e.content.includes(dm.name)) {
                            // Find quantity line like "- name: X"
                            const lines = e.content.split('\n');
                            for (let l of lines) {
                                if (l.includes(dm.name)) {
                                    const m = l.match(/:\s*([\d.,]+)/);
                                    if (m && m[1]) {
                                        const qty = parseFloat(m[1].replace(',', '.'));
                                        if (!isNaN(qty)) {
                                            actualQtyMap.set(dm.name, (actualQtyMap.get(dm.name) || 0) + qty);
                                        }
                                    }
                                }
                            }
                         }
                     });
                 }
             }
          });
      }
      
      console.log('Selected Month:', selectedMonth, 'Selected Team:', selectedTeam, 'PlanColumnKey:', planColumnKey);
      console.log('DinhMuc[0] history:', dinhMucList.find(d => !d.isGroup)?.history);
      let mappedData = dinhMucList.map((dm: any) => {
          let planQty = 0;
          if (dm.history) {
              // Try exact match first
              if (dm.history[planColumnKey] !== undefined) {
                  planQty = dm.history[planColumnKey];
              } else if (selectedTeam.includes('Đội') && dm.history[`D - ${selectedMonth}`] !== undefined) {
                  planQty = dm.history[`D - ${selectedMonth}`];
              } else if (dm.history[`Tháng ${selectedMonth}`] !== undefined) {
                  // Fallback for old format
                  planQty = dm.history[`Tháng ${selectedMonth}`];
              }
          }
          
          const actualQty = actualQtyMap.get(dm.name) || 0;
          
          return {
              name: dm.name,
              planQty,
              actualQty,
              progress: 0,
              isGroup: dm.isGroup,
              relation: (dm.relation || '').trim()
          };
      });
      
      // Aggregate relations: Parent (1 char) += Children (starts with parent char, length > 1)
      mappedData.forEach(item => {
          if (item.relation && item.relation.length === 1) {
              const children = mappedData.filter(c => c.relation && c.relation.length > 1 && c.relation.startsWith(item.relation));
              let addedActual = 0;
              let addedPlan = 0;
              children.forEach(c => {
                  addedActual += c.actualQty;
                  addedPlan += c.planQty;
              });
              item.actualQty += addedActual;
              // Depending on requirements, we might want to aggregate planQty as well
              item.planQty += addedPlan; 
          }
      });
      
      mappedData.forEach(item => {
          item.progress = item.planQty > 0 ? (item.actualQty / item.planQty) * 100 : (item.actualQty > 0 ? 100 : 0);
      });
      
      return mappedData;
  }, [selectedMonth, selectedTeam, dinhMucList, entries]);

  const filteredData = useMemo(() => {
    let result = planData.filter(d => 
         (showAllTasks || d.planQty > 0 || d.actualQty > 0) && 
         d.name.toLowerCase().includes(search.toLowerCase())
    );
    if (sortConfig !== null) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [planData, search, sortConfig]);

  
  const exportToExcel = () => {
    // Tổng quát
    let totalPlan = 0;
    let totalActual = 0;
    planData.forEach(d => {
       if (d.planQty > 0 || d.actualQty > 0) {
          totalPlan += d.planQty;
          totalActual += d.actualQty;
       }
    });
    const avgProgress = totalPlan > 0 ? (totalActual / totalPlan) * 100 : 0;
    
    const summaryData = [
       ["BÁO CÁO TIẾN ĐỘ KẾ HOẠCH"],
       ["Tháng:", selectedMonth, "Tổ/Đội:", selectedTeam],
       ["Tổng khối lượng kế hoạch:", totalPlan],
       ["Tổng khối lượng thực hiện:", totalActual],
       ["Tỷ lệ hoàn thành tổng thể:", avgProgress.toFixed(2) + "%"],
       []
    ];
    
    // Chi tiết
    const detailData = [
       ["STT", "Nội dung công việc", "Kế hoạch", "Thực hiện", "Tỷ lệ (%)", "Đánh giá"]
    ];
    
    filteredData.forEach((row, idx) => {
       let statusText = "Chậm tiến độ";
       if (row.progress >= 100) statusText = "Hoàn thành";
       else if (row.progress >= 50) statusText = "Đang thực hiện";
       
       detailData.push([
          idx + 1,
          row.name,
          row.planQty,
          row.actualQty,
          row.progress.toFixed(2),
          statusText
       ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet([...summaryData, ...detailData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TienDo");
    XLSX.writeFile(wb, `TienDo_${selectedTeam}_${selectedMonth.replace('/', '-')}.xlsx`);
  };

  const summaryStats = useMemo(() => {
    let totalPlan = 0;
    let totalActual = 0;
    planData.forEach(d => {
       if (d.planQty > 0 || d.actualQty > 0) {
          totalPlan += d.planQty;
          totalActual += d.actualQty;
       }
    });
    const avgProgress = totalPlan > 0 ? (totalActual / totalPlan) * 100 : 0;
    
    let statusColor = "";
    let statusText = "";
    if (avgProgress >= 100) {
        statusColor = "text-emerald-600";
        statusText = "Hoàn thành Tốt";
    } else if (avgProgress >= 75) {
        statusColor = "text-indigo-600";
        statusText = "Khá";
    } else if (avgProgress >= 50) {
        statusColor = "text-amber-600";
        statusText = "Đang thực hiện";
    } else {
        statusColor = "text-rose-600";
        statusText = "Chậm tiến độ";
    }

    return { totalPlan, totalActual, avgProgress, statusColor, statusText };
  }, [planData]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
         <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               <TrendingUp className="w-6 h-6 text-indigo-500" />
               Tiến độ Kế hoạch
            </h2>
            <p className="text-sm text-slate-500 mt-1">So sánh khối lượng thực hiện với kế hoạch đề ra</p>
         </div>
         
         
         <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
            <button
               onClick={() => setShowAllTasks(!showAllTasks)}
               className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
            >
               {showAllTasks ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
               {showAllTasks ? 'Ẩn mục KH = 0' : 'Hiện tất cả'}
            </button>
            <button
               onClick={exportToExcel}
               disabled={filteredData.length === 0}
               className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-200"
            >
               <FileSpreadsheet className="w-4 h-4" />
               Xuất Excel
            </button>
         </div>
         <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">

            <div className="relative w-full sm:w-auto">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input
                  type="text"
                  placeholder="Tìm kiếm nội dung..."
                  value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
               />
            </div>
            
            <div className="relative w-full sm:w-auto min-w-[150px]">
               <select
                 value={selectedTeam}
                 onChange={e => setSelectedTeam(e.target.value)}
                 className="w-full pl-9 pr-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
               >
                 {availableTeams.length === 0 && <option value="">Không có dữ liệu Tổ</option>}
                 {availableTeams.map(t => (
                    <option key={t} value={t}>{t}</option>
                 ))}
               </select>
               <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
            </div>

            <div className="relative w-full sm:w-auto min-w-[150px]">
               <select
                 value={selectedMonth}
                 onChange={e => setSelectedMonth(e.target.value)}
                 className="w-full pl-9 pr-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
               >
                 {availableMonths.length === 0 && <option value="">Không có dữ liệu KH</option>}
                 {availableMonths.map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                 ))}
               </select>
               <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
            </div>
         </div>
      </div>
      
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
         <div className="overflow-auto flex-1 p-0">
            <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[11px] font-bold tracking-wider text-slate-500 sticky top-0 z-10 shadow-sm">
                  <tr>
                     <th className="px-6 py-4">STT</th>
                     <th className="px-6 py-4 cursor-pointer hover:text-slate-800" onClick={() => requestSort('name')}>Nội dung công việc {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                     <th className="px-6 py-4 text-center cursor-pointer hover:text-slate-800" onClick={() => requestSort('planQty')}>Kế hoạch {sortConfig?.key === 'planQty' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                     <th className="px-6 py-4 text-center cursor-pointer hover:text-slate-800" onClick={() => requestSort('actualQty')}>Thực hiện {sortConfig?.key === 'actualQty' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                     <th className="px-6 py-4 text-center cursor-pointer hover:text-slate-800" onClick={() => requestSort('progress')}>Tỷ lệ {sortConfig?.key === 'progress' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                     <th className="px-6 py-4 text-center">Đánh giá</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredData.length === 0 ? (
                     <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                           Không có dữ liệu kế hoạch/thực hiện trong tháng này.
                        </td>
                     </tr>
                  ) : (
                     filteredData.map((row, idx) => {
                        let statusColor = "";
                        let StatusIcon = AlertCircle;
                        let statusText = "";
                        
                        if (row.progress >= 100) {
                            statusColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
                            StatusIcon = CheckCircle;
                            statusText = "Hoàn thành";
                        } else if (row.progress >= 50) {
                            statusColor = "text-amber-600 bg-amber-50 border-amber-200";
                            StatusIcon = Clock;
                            statusText = "Đang thực hiện";
                        } else {
                            statusColor = "text-rose-600 bg-rose-50 border-rose-200";
                            StatusIcon = AlertCircle;
                            statusText = "Chậm tiến độ";
                        }
                        
                        return (
                           <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-mono text-[11px] text-slate-400 font-bold">{idx + 1}</td>
                              <td className="px-6 py-4 font-medium text-slate-700 whitespace-normal min-w-[250px]">{row.name}</td>
                              <td className="px-6 py-4 text-center font-bold text-slate-600">{row.planQty}</td>
                              <td className="px-6 py-4 text-center font-bold text-indigo-600">{row.actualQty}</td>
                              <td className="px-6 py-4 text-center">
                                 <div className="flex items-center gap-2 justify-center">
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                       <div 
                                          className={`h-full rounded-full ${row.progress >= 100 ? 'bg-emerald-500' : row.progress >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                          style={{ width: `${Math.min(row.progress, 100)}%` }}
                                       ></div>
                                    </div>
                                    <span className="font-mono text-[11px] font-bold w-10 text-right">{row.progress.toFixed(0)}%</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusColor}`}>
                                    <StatusIcon className="w-3 h-3" />
                                    {statusText}
                                 </div>
                              </td>
                           </tr>
                        );
                     })
                  )}
               </tbody>
            </table>
         </div>
         
         <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex justify-end items-center shrink-0">
            <div className="flex items-center gap-6">
                <div className="text-right">
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                        Nhận định tỷ lệ thực hiện của {selectedTeam}
                    </p>
                    <div className="flex items-end gap-4 justify-end">
                        <div className="flex flex-col text-right">
                            <span className="text-[10px] text-slate-400 font-medium">Tổng Kế Hoạch</span>
                            <span className="text-sm font-bold text-slate-600">{summaryStats.totalPlan}</span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="text-[10px] text-slate-400 font-medium">Tổng Thực Hiện</span>
                            <span className="text-sm font-bold text-indigo-600">{summaryStats.totalActual}</span>
                        </div>
                        <div className="flex flex-col text-right ml-2 border-l border-slate-300 pl-4">
                            <span className="text-[10px] text-slate-400 font-medium">Tỷ lệ hoàn thành</span>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-xl font-black ${summaryStats.statusColor}`}>
                                    {summaryStats.avgProgress.toFixed(1)}%
                                </span>
                                <span className={`text-xs font-bold uppercase ${summaryStats.statusColor}`}>
                                    ({summaryStats.statusText})
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
}
