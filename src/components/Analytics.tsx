import React, { useState, useMemo } from 'react';
import { DataStore } from '../store/DataStore';
import { format, parseISO } from 'date-fns';
import { Filter, Trash2, ChevronDown, ChevronUp, Download } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';

export default function Analytics({ refreshToggle }: { refreshToggle: number }) {
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [detailViewMode, setDetailViewMode] = useState<'grouped' | 'list'>('grouped');

  const entries = useMemo(() => DataStore.getEntries().sort((a, b) => b.timestamp - a.timestamp), [refreshToggle]);
  const dinhMucList = useMemo(() => DataStore.getDinhMuc(), [refreshToggle]);

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tác nghiệp này?')) {
      DataStore.deleteEntry(id);
      window.dispatchEvent(new Event('workload_updated')); 
    }
  };

  const toggleCollapse = (date: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const eTeamNormalized = (e.team || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
      const selectedTeamNormalized = selectedTeam.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

      if (selectedTeam !== 'all' && eTeamNormalized !== selectedTeamNormalized) return false;
      if (selectedDate && e.date !== selectedDate) return false;
      if (selectedMember !== 'all' && (!e.members || !e.members.includes(selectedMember))) return false;
      return true;
    });
  }, [entries, selectedTeam, selectedDate, selectedMember]);

  const uniqueTeams = useMemo(() => DataStore.getTeams(), [refreshToggle]);
  const uniqueMembers = useMemo(() => {
    const mems = new Set<string>();
    entries.forEach(e => {
       const eTeamNormalized = (e.team || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
       const selectedTeamNormalized = selectedTeam.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
       
       if ((selectedTeam === 'all' || eTeamNormalized === selectedTeamNormalized) && e.members) {
          e.members.forEach(m => mems.add(m));
       }
    });
    return Array.from(mems).sort();
  }, [entries, selectedTeam]);

  // Compute unique dates for columns
  const allDates = useMemo(() => {
    const dates = new Set<string>(filteredEntries.map(e => e.date));
    return Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // sort descending
  }, [filteredEntries]);

  // Compute unique members for rows
  const allMembers = useMemo(() => {
    const members = new Set<string>();
    filteredEntries.forEach(e => {
      if (e.members && Array.isArray(e.members)) {
        e.members.forEach(m => members.add(m));
      }
    });
    return Array.from(members).sort();
  }, [filteredEntries]);

  // Compute total tasks summary
  const summaryStats = useMemo(() => {
    const sumToDivide: Record<string, number> = {};
    const sumNotToDivide: Record<string, number> = {};
    
    filteredEntries.forEach(e => {
        if (!e.content) return;
        const teamName = e.team || 'Khác';
        const isTongHop = teamName.toLowerCase().includes('tổng hợp') || teamName.toLowerCase().includes('bộ phận công tác');
        
        const lines = e.content.split('\n');
        lines.forEach(line => {
           let cleanLine = line.trim();
           if (cleanLine.startsWith('-')) cleanLine = cleanLine.substring(1).trim();
           const match = cleanLine.match(/^(.*?):\s*([\d.,]+)$/);
           if (match) {
              const taskName = match[1].trim();
              const qty = parseFloat(match[2].replace(',', '.'));
              if (!isNaN(qty)) {
                  if (isTongHop) {
                      sumNotToDivide[taskName] = (sumNotToDivide[taskName] || 0) + qty;
                  } else {
                      sumToDivide[taskName] = (sumToDivide[taskName] || 0) + qty;
                  }
              }
           }
        });
    });
    
    const finalStats: Record<string, number> = {};
    Object.keys(sumToDivide).forEach(k => {
         finalStats[k] = Math.ceil(sumToDivide[k] / 2);
    });
    Object.keys(sumNotToDivide).forEach(k => {
         finalStats[k] = (finalStats[k] || 0) + sumNotToDivide[k];
    });

    return Object.entries(finalStats).sort((a, b) => b[1] - a[1]);
  }, [filteredEntries]);

  const renderContentWithQuota = (content: string, membersCount: number) => {
    if (!content) return null;
    const lines = content.split('\n');
    return lines.map((line, i) => {
       let cleanLine = line.trim();
       if (cleanLine.startsWith('-')) cleanLine = cleanLine.substring(1).trim();
       
       const match = cleanLine.match(/^(.*?):\s*([\d.,]+)$/);
       if (match) {
          const taskName = match[1].trim();
          const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
          const cleanTaskName = normalize(taskName);
          const qty = parseFloat(match[2].replace(',', '.'));
          
          let exactDm = dinhMucList.find(d => normalize(d.name || '') === cleanTaskName);
          
          let matchedName = 'Khác';
          if (exactDm) {
             matchedName = exactDm.name;
          } else {
             let foundDm = dinhMucList.find(d => {
                const cleanDName = normalize(d.name || '');
                return cleanDName.includes(cleanTaskName) || cleanTaskName.includes(cleanDName);
             });
             if (foundDm) matchedName = foundDm.name;
          }

          const cleanMatchedName = normalize(matchedName);

          const dm = dinhMucList.find(d => normalize(d.name || '') === cleanMatchedName);

          const quotaStr = dm ? String(dm.quota).replace(/,/g, '.') : "0";
          const quota = parseFloat(quotaStr) || 0;
          
          let nsPercent = 0;
          let quotaDisplay = "";

          const qtyPerMember = qty; // Tính trực tiếp theo yêu cầu "số liệu làm cho 1 nhóm đều tính cho từng người"

          if (cleanMatchedName === 'khác') {
              nsPercent = (qtyPerMember / 1) * 100;
              quotaDisplay = "(ĐM: 1)";
          } else if (quota > 0) {
              nsPercent = (qtyPerMember / quota) * 100;
              quotaDisplay = `(ĐM: ${quota})`;
          } else {
              nsPercent = (qtyPerMember * 0.05) * 100;
              quotaDisplay = "(Không có định mức)";
          }

          return (
             <div key={i} className="flex justify-between items-center bg-white p-1.5 border border-dashed border-[#141414]/20 mb-1">
                <div>
                   <span className="font-bold mr-1">{taskName}:</span>
                   <span>{qty}</span> <span className="text-[10px] opacity-70">{quotaDisplay}</span>
                </div>
                <div className={`text-[10px] uppercase font-bold px-1.5 py-0.5 ${nsPercent >= 100 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                   {nsPercent.toFixed(1)}% NS
                </div>
             </div>
          );
       }
       return <div key={i}>{line}</div>;
    });
  };

  const exportToExcel = () => {
    if (filteredEntries.length === 0) {
       alert("Không có dữ liệu để xuất");
       return;
    }

    const processContentForExcel = (content: string, membersCount: number) => {
        // We will replace this with new logic inside below
        return content;
    };

    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

    const getQuotaDisplay = (cleanTaskName: string) => {
        let exactDm = dinhMucList.find(d => normalize(d.name || '') === cleanTaskName);
        let matchedName = 'Khác';
        if (exactDm) {
            matchedName = exactDm.name;
        } else {
            let foundDm = dinhMucList.find(d => {
                const cleanDName = normalize(d.name || '');
                return cleanDName.includes(cleanTaskName) || cleanTaskName.includes(cleanDName);
            });
            if (foundDm) matchedName = foundDm.name;
        }
        const cleanMatchedName = normalize(matchedName);
        const dm = dinhMucList.find(d => normalize(d.name || '') === cleanMatchedName);
        const quotaStr = dm ? String(dm.quota).replace(/,/g, '.') : "0";
        const quota = parseFloat(quotaStr) || 0;
        
        let quotaDisplay = "";
        if (cleanMatchedName === 'khác') {
            quotaDisplay = "(ĐM: 1)";
        } else if (quota > 0) {
            quotaDisplay = `(ĐM: ${quota})`;
        } else {
            quotaDisplay = "(Không có ĐM)";
        }
        return quotaDisplay;
    };

    const processContentLines = (content: string, membersCount: number) => {
        if (!content) return [];
        const lines = content.split('\n');
        return lines.map(line => {
            let cleanLine = line.trim();
            if (cleanLine.startsWith('-')) cleanLine = cleanLine.substring(1).trim();
            
            const match = cleanLine.match(/^(.*?):\s*([\d.,]+)$/);
            if (match) {
                const taskName = match[1].trim();
                const cleanTaskName = normalize(taskName);
                const totalQty = parseFloat(match[2].replace(',', '.'));
                const qtyPerMember = totalQty; // Tính trực tiếp
                return { isTask: true, taskName, cleanTaskName, qty: qtyPerMember, rawLine: cleanLine };
            }
            return { isTask: false, text: cleanLine, rawLine: cleanLine };
        });
    };

    const memberDataMap = new Map<string, any>();
    
    // Gather all unique dates
    const sortedDates = Array.from(new Set(filteredEntries.map(e => e.date))).sort();
    const dateCols = sortedDates.map(date => {
        const dateStr = String(date || '');
        const displayDate = dateStr.includes('-') ? dateStr.split('-').reverse().join('/') : dateStr;
        return {
            date,
            colName: `Nội dung công việc của ngày ${displayDate}`
        };
    });

    filteredEntries.forEach(e => {
        const membersCount = e.members?.length || 1;
        const dateColDef = dateCols.find(dc => dc.date === e.date);
        if (!dateColDef) return;
        
        const members = e.members && e.members.length > 0 ? e.members : ['Chưa phân công'];
        
        members.forEach(m => {
            if (!memberDataMap.has(m)) {
                memberDataMap.set(m, {
                    team: e.team || '',
                    dailyContent: {},
                    taskTotals: {}
                });
            }
            
            const memberObj = memberDataMap.get(m);
            if (!memberObj.dailyContent[dateColDef.colName]) {
                memberObj.dailyContent[dateColDef.colName] = [];
            }
            
            const parsedLines = processContentLines(e.content, membersCount);
            parsedLines.forEach(item => {
                if (item.isTask) {
                    const quotaDisplay = getQuotaDisplay(item.cleanTaskName);
                    const formattedQty = Math.round(item.qty * 100) / 100;
                    memberObj.dailyContent[dateColDef.colName].push(`- ${item.taskName}: ${formattedQty} ${quotaDisplay}`);
                    
                    if (!memberObj.taskTotals[item.cleanTaskName]) {
                        memberObj.taskTotals[item.cleanTaskName] = { originalName: item.taskName, totalQty: 0, cleanName: item.cleanTaskName };
                    }
                    memberObj.taskTotals[item.cleanTaskName].totalQty += item.qty;
                } else {
                    if (item.text) {
                        memberObj.dailyContent[dateColDef.colName].push(`- ${item.text}`);
                    }
                }
            });
        });
    });

    const exportData: any[] = [];
    let stt = 1;
    
    // Sort members by team then name
    const sortedMembers = Array.from(memberDataMap.entries()).sort((a, b) => {
        const teamA = a[1].team;
        const teamB = b[1].team;
        if (teamA === teamB) return a[0].localeCompare(b[0]);
        return teamA.localeCompare(teamB);
    });

    sortedMembers.forEach(([memberName, data]) => {
        const row: any = {
            "STT": stt++,
            "Họ và Tên": memberName,
            "Khu vực / Tổ": data.team,
        };
        
        dateCols.forEach(dc => {
            const arr = data.dailyContent[dc.colName];
            row[dc.colName] = arr && arr.length > 0 ? arr.join('\r\n') : '';
        });
        
        const totalsContent: string[] = [];
        Object.values(data.taskTotals).forEach((t: any) => {
            const quotaDisplay = getQuotaDisplay(t.cleanName);
            const formattedTotal = Math.round(t.totalQty * 100) / 100;
            totalsContent.push(`- ${t.originalName}: ${formattedTotal} ${quotaDisplay}`);
        });
        
        row["Tổng cộng"] = totalsContent.length > 0 ? totalsContent.join('\r\n') : '';
        
        exportData.push(row);
    });

    const workbook = XLSX.utils.book_new();

    // 1. Summary Sheet
    if (summaryStats && summaryStats.length > 0) {
       const summaryData = summaryStats.map(([name, qty]) => ({
          "Nội dung công việc": name,
          "Tổng khối lượng": qty
       }));
       const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
       summaryWorksheet['!cols'] = [{ wch: 50 }, { wch: 20 }];
       XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "TongCong");
    }

    // 2. Details Sheet
    const detailsWorksheet = XLSX.utils.json_to_sheet(exportData);
    
    const detailsCols = [
        { wch: 5 }, // STT
        { wch: 30 }, // Họ và Tên
        { wch: 20 }, // Khu vực
    ];
    dateCols.forEach(() => {
        detailsCols.push({ wch: 60 });
    });
    detailsCols.push({ wch: 60 }); // Tổng cộng
    detailsWorksheet['!cols'] = detailsCols;
    
    // Formating using xlsx-js-style
    Object.keys(detailsWorksheet).forEach(address => {
       if (address === '!ref' || address === '!cols' || address === '!rows') return;
       const cell = detailsWorksheet[address];
       if (!cell) return;
       
       if (!cell.s) cell.s = {};
       
       // Header row (row 1)
       if (address.match(/^[A-Z]+1$/)) {
           cell.s = {
               font: { bold: true, color: { rgb: "FFFFFF" } },
               fill: { fgColor: { rgb: "333333" } },
               alignment: { horizontal: "center", vertical: "center" }
           };
       } else {
           // Body cells
           cell.s = {
               alignment: { vertical: "top" }
           };
           // Wrap text in Content columns (D and upwards)
           const colChar = address.replace(/[0-9]+$/, '');
           if (colChar !== 'A' && colChar !== 'B' && colChar !== 'C') {
               cell.s.alignment.wrapText = true;
           }
       }
       
       // Add borders to all cells
       cell.s.border = {
           top: { style: "thin", color: { auto: 1 } },
           bottom: { style: "thin", color: { auto: 1 } },
           left: { style: "thin", color: { auto: 1 } },
           right: { style: "thin", color: { auto: 1 } }
       };
    });

    XLSX.utils.book_append_sheet(workbook, detailsWorksheet, "ChiTiet");
    
    XLSX.writeFile(workbook, "BaoCaoNangSuat.xlsx");
  };

  return (
    <div className="space-y-8">
      <div className="bg-white border border-[#141414] flex flex-col shadow-[4px_4px_0_#141414] sm:shadow-[8px_8px_0_#141414]">
        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#141414] bg-[#F5F4F2]">
          <h2 className="font-serif italic text-2xl flex items-center gap-2">
            Nhật Ký Tác Nghiệp
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div>
              <label className="block text-[10px] font-mono opacity-50 uppercase mb-2">Ngày</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent border-b border-[#141414] pb-1 font-mono text-sm focus:outline-none w-full sm:w-auto"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono opacity-50 uppercase mb-2">Tổ</label>
              <select
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
                className="bg-transparent border-b border-[#141414] pb-1 font-mono text-sm focus:outline-none pr-4 w-full sm:w-auto"
              >
                <option value="all">TẤT CẢ CÁC TỔ</option>
                {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono opacity-50 uppercase mb-2">Họ và Tên</label>
              <select
                value={selectedMember}
                onChange={e => setSelectedMember(e.target.value)}
                className="bg-transparent border-b border-[#141414] pb-1 font-mono text-sm focus:outline-none pr-4 w-full sm:w-auto"
              >
                <option value="all">TẤT CẢ</option>
                {uniqueMembers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex gap-2 mt-2 sm:mt-0">
              <button 
                onClick={() => { setSelectedDate(''); setSelectedTeam('all'); setSelectedMember('all'); }}
                className="text-[10px] bg-[#141414] text-white px-3 py-2 uppercase font-bold tracking-widest hover:invert transition-all"
              >
                Reset
              </button>
              <button 
                onClick={exportToExcel}
                className="text-[10px] bg-green-600 text-white px-3 py-2 uppercase font-bold tracking-widest hover:bg-green-700 transition-all flex items-center gap-1.5 border border-green-800"
              >
                <Download className="w-3 h-3" /> Xuất Excel
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#F5F4F2] space-y-6">
          {filteredEntries.length > 0 && summaryStats.length > 0 && (
            <div className="mx-6 mt-6 md:mx-8 bg-white border border-[#141414] shadow-[4px_4px_0_#141414] p-4">
              <h3 className="font-bold uppercase tracking-widest text-sm border-b border-[#141414]/20 pb-2 mb-3">
                Tổng Cộng Khối Lượng
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {summaryStats.map(([name, qty]) => (
                  <div key={name} className="flex justify-between items-center text-sm border-b border-dashed border-[#141414]/20 pb-1">
                    <span className="font-medium text-[#141414]/80">{name}</span>
                    <span className="font-bold">{qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mx-6 mt-6 md:mx-8 flex justify-between items-center border-b border-[#141414]/20 pb-2">
             <h3 className="font-bold uppercase tracking-widest text-sm">
                Chi tiết báo cáo
             </h3>
             <div className="flex gap-2">
                <button 
                  onClick={() => setDetailViewMode('grouped')}
                  className={`text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest transition-all border ${detailViewMode === 'grouped' ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#141414]/20 hover:border-[#141414]'}`}
                >
                  Dạng nhóm
                </button>
                <button 
                  onClick={() => setDetailViewMode('list')}
                  className={`text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest transition-all border ${detailViewMode === 'list' ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#141414]/20 hover:border-[#141414]'}`}
                >
                  Dạng bảng
                </button>
             </div>
          </div>

          <div className="mx-6 mt-6 md:mx-8 mb-12">
          {allDates.length === 0 ? (
             <div className="text-center py-12 text-sm opacity-50 italic uppercase bg-white border border-[#141414] shadow-[4px_4px_0_#141414]">
                Hệ thống chưa ghi nhận<br/>hoạt động nào.
             </div>
          ) : detailViewMode === 'list' ? (
             <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                   <thead className="bg-[#141414] text-[#E4E3E0]">
                      <tr className="text-[10px] font-mono uppercase tracking-widest">
                         <th className="py-3 px-4 border-b border-[#141414] whitespace-nowrap">Ngày</th>
                         <th className="py-3 px-4 border-b border-[#141414]">Họ và Tên</th>
                         <th className="py-3 px-4 border-b border-[#141414]">Khu vực / Tổ</th>
                         <th className="py-3 px-4 border-b border-[#141414]">Nội dung công việc</th>
                      </tr>
                   </thead>
                   <tbody className="font-sans text-xs">
                      {filteredEntries.flatMap(e => {
                         const displayDate = e.date.includes('-') ? e.date.split('-').reverse().join('/') : e.date;
                         const teamInfo = e.team || '';
                         if (!e.members || e.members.length === 0) {
                             return [{ member: '', date: displayDate, team: teamInfo, content: e.content, entry: e }];
                         }
                         return e.members.map(m => ({ member: m, date: displayDate, team: teamInfo, content: e.content, entry: e }));
                      }).sort((a, b) => b.entry.timestamp - a.entry.timestamp)
                        .map((row, i) => (
                         <tr key={`${row.entry.id}-${row.member}-${i}`} className="border-b border-[#141414]/10 hover:bg-[#E4E3E0]/30 transition-colors">
                            <td className="py-3 px-4 border-r border-[#141414]/10 align-top whitespace-nowrap font-mono">{row.date}</td>
                            <td className="py-3 px-4 border-r border-[#141414]/10 align-top font-bold">{row.member}</td>
                            <td className="py-3 px-4 border-r border-[#141414]/10 align-top opacity-70">{row.team}</td>
                            <td className="py-3 px-4 align-top">
                               <div className="whitespace-pre-wrap leading-relaxed space-y-1">
                                  {renderContentWithQuota(row.content, row.entry.members?.length || 1)}
                               </div>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          ) : (
             allDates.map(date => {
                let displayDate = date;
                try {
                  // handle parsing "yyyy-MM-dd" or fallback to raw string
                  if (date && date.includes('-')) {
                    const [y, m, d] = date.split('-');
                    displayDate = `${d}/${m}/${y}`;
                  }
                } catch(e) {}

                const dateEntries = filteredEntries.filter(e => e.date === date);
                const activeMembers = allMembers.filter(m => dateEntries.some(e => e.members?.includes(m)));

                const isCollapsed = collapsedDates.has(date);

                return (
                  <div key={date} className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] overflow-hidden">
                     <div 
                        className="bg-[#141414] text-[#E4E3E0] py-2 px-3 md:px-4 text-center font-bold tracking-widest text-sm uppercase sticky top-0 z-10 flex items-center justify-between cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                        onClick={() => toggleCollapse(date)}
                     >
                        <div className="flex items-center w-8">
                           {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                        </div>
                        <span className="flex-1 text-center">Ngày {displayDate}</span>
                        <div className="flex items-center justify-end w-24">
                           <span className="text-[10px] opacity-70 bg-white/10 px-2 py-1">{dateEntries.length} công việc</span>
                        </div>
                     </div>
                     {!isCollapsed && (
                     <div className="p-0 overflow-x-auto">
                        {activeMembers.length > 0 ? (
                           <table className="w-full text-left border-collapse min-w-[500px]">
                              <thead className="bg-[#F5F4F2] text-[#141414]">
                                 <tr className="text-[10px] font-mono uppercase tracking-widest">
                                    <th className="py-3 px-4 border-b border-r border-[#141414]/20 w-48 font-bold">Họ và Tên</th>
                                    <th className="py-3 px-4 border-b border-[#141414]/20 font-bold">Nội dung công việc</th>
                                 </tr>
                              </thead>
                              <tbody className="font-sans text-xs">
                                 {activeMembers.map((member, i) => {
                                    const memberEntries = dateEntries.filter(e => e.members?.includes(member));
                                    return (
                                       <tr key={member} className={`border-b border-[#141414]/10 hover:bg-[#E4E3E0]/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'}`}>
                                          <td className="py-3 px-4 font-bold border-r border-[#141414]/10 align-top">
                                             {member}
                                          </td>
                                          <td className="py-3 px-4 align-top">
                                             <div className="space-y-3">
                                                {memberEntries.map(e => (
                                                   <div key={e.id} className="relative group text-[#141414] p-2 bg-[#F5F4F2] border border-[#141414]/10">
                                                      <div className="pr-8 whitespace-pre-wrap leading-relaxed space-y-1">
                                                         {renderContentWithQuota(e.content, e.members?.length || 1)}
                                                      </div>
                                                      <button 
                                                         onClick={() => alert("Để xóa nội dung tác nghiệp này, vui lòng xóa trực tiếp ô dữ liệu tương ứng trên Google Sheets để đảm bảo nhất quán.")}
                                                         title="Thông tin xoá"
                                                         className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white border border-red-200 hover:bg-red-50"
                                                      >
                                                         <Trash2 className="w-3 h-3" />
                                                      </button>
                                                   </div>
                                                ))}
                                             </div>
                                          </td>
                                       </tr>
                                    );
                                 })}
                              </tbody>
                           </table>
                        ) : (
                           <div className="p-6 text-center text-xs opacity-50 italic">Không có dữ liệu cho tuyến/tổ này trong ngày {displayDate}.</div>
                        )}
                     </div>
                     )}
                  </div>
                );
             })
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
