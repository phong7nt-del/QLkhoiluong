import React, { useState, useMemo } from 'react';
import { DataStore } from '../store/DataStore';
import { format, parseISO, getISOWeek, getISOWeekYear } from 'date-fns';
import { Filter, Trash2, ChevronDown, ChevronUp, Download } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';

const getWeekString = (dateStr: string) => {
   try {
     const d = parseISO(dateStr);
     if (isNaN(d.getTime())) return '';
     const w = getISOWeek(d);
     const y = getISOWeekYear(d);
     return `${y}-W${w.toString().padStart(2, '0')}`;
   } catch { return ''; }
};

export default function Analytics({ refreshToggle }: { refreshToggle: number }) {
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'day' | 'week' | 'month' | 'year'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [detailViewMode, setDetailViewMode] = useState<'grouped' | 'list' | 'by_workgroup'>('grouped');

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
      const selectedTeamNormalized = selectedTeam.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
      if (selectedTeam !== 'all') {
         const hasTeam = (e.team || '').split(',').some(t => t.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim() === selectedTeamNormalized);
         if (!hasTeam) return false;
      }
      
      if (filterMode === 'day' && selectedDate && e.date !== selectedDate) return false;
      if (filterMode === 'week' && selectedWeek && getWeekString(e.date) !== selectedWeek) return false;
      if (filterMode === 'month' && selectedMonth && !e.date.startsWith(selectedMonth)) return false;
      if (filterMode === 'year' && selectedYear && !e.date.startsWith(selectedYear)) return false;

      if (selectedMember !== 'all' && (!e.members || !e.members.includes(selectedMember))) return false;
      return true;
    });
  }, [entries, selectedTeam, selectedMember, filterMode, selectedDate, selectedWeek, selectedMonth, selectedYear]);

  const groupedByWorkgroup = useMemo(() => {
    if (filterMode !== 'day' || detailViewMode !== 'by_workgroup' || !selectedDate) return [];
    
    const groups = new Map();
    
    // Scan ALL entries for the day to build groups, not just filtered ones
    const dayEntries = entries.filter(e => e.date === selectedDate);
    
    dayEntries.forEach(e => {
        const linesAll = (e.content || '').split('\n');
        const lastLine = linesAll[linesAll.length - 1].trim();
        const gId = /^\d+$/.test(lastLine) ? parseInt(lastLine, 10) : 0;
        
        let key = gId > 0 ? gId.toString() : e.id;
        
        if (!groups.has(key)) {
            groups.set(key, {
                id: e.id,
                date: e.date,
                members: new Set(e.members || []),
                teams: new Set([e.team || '']),
                content: e.content,
                timestamp: e.timestamp
            });
        } else {
            const g = groups.get(key);
            (e.members || []).forEach(m => g.members.add(m));
            if (e.team) g.teams.add(e.team);
            if (e.timestamp > g.timestamp) g.timestamp = e.timestamp;
        }
    });
    
    let resultGroups = Array.from(groups.values());
    
    // If a specific team is selected, only show groups that contain someone from that team
    if (selectedTeam !== 'all') {
       const selectedTeamNormalized = selectedTeam.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
       resultGroups = resultGroups.filter(g => {
           // We need to check if any original entry in this group was from the selected team
           // e.team might not have all the info, but g.teams has all the teams in the group
           return Array.from(g.teams).some(t => t.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim() === selectedTeamNormalized);
       });
    }
    
    // If a specific member is selected, only show groups containing that member
    if (selectedMember !== 'all') {
       resultGroups = resultGroups.filter(g => g.members.has(selectedMember));
    }
    
    return resultGroups.map(g => ({
        id: g.id,
        date: g.date,
        members: Array.from(g.members).sort(),
        team: Array.from(g.teams).join(', '),
        content: g.content,
        timestamp: g.timestamp
    })).sort((a, b) => b.timestamp - a.timestamp);
  }, [entries, filterMode, detailViewMode, selectedDate, selectedTeam, selectedMember]);

  const uniqueTeams = useMemo(() => DataStore.getTeams(), [refreshToggle]);
  const uniqueMembers = useMemo(() => {
    const mems = new Set<string>();
    entries.forEach(e => {
       const selectedTeamNormalized = selectedTeam.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
       const hasTeam = (e.team || '').split(',').some(t => t.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim() === selectedTeamNormalized);
       
       if ((selectedTeam === 'all' || hasTeam) && e.members) {
          e.members.forEach(m => mems.add(m));
       }
    });
    return Array.from(mems).sort();
  }, [entries, selectedTeam]);

  // Compute unique dates for columns
    const groupSizes = useMemo(() => {
    const sizes: Record<string, Record<number, Set<string>>> = {};
    filteredEntries.forEach(e => {
        let mbrTokens = e.members || (e as any).workGroup || [];
        if (typeof mbrTokens === 'string') mbrTokens = [mbrTokens];
        const members = (Array.isArray(mbrTokens) && mbrTokens.length > 0) ? mbrTokens : ['Khuyết danh'];
        const linesAll = (e.content || '').split(/\n/);
        const lastLine = linesAll[linesAll.length - 1].trim();
        if (/^\d+$/.test(lastLine)) {
            const groupId = parseInt(lastLine, 10);
            if (groupId > 0) {
                const date = e.date;
                if (!sizes[date]) sizes[date] = {};
                if (!sizes[date][groupId]) sizes[date][groupId] = new Set();
                members.forEach(m => sizes[date][groupId].add(m));
            }
        }
    });
    return sizes;
  }, [filteredEntries]);

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
    const finalStats: Record<string, { total: number; isGroup: boolean }> = {};
    
    filteredEntries.forEach(e => {
        if (!e.content) return;
        const membersCount = e.members?.length || 1;
        const lines = e.content.split('\n');
        lines.forEach(line => {
           let cleanLine = line.trim();
           if (cleanLine.startsWith('-')) cleanLine = cleanLine.substring(1).trim();
           const match = cleanLine.match(/^(.*?):\s*([\d.,]+)$/);
           if (match) {
              const taskName = match[1].trim();
              const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
              const cleanTaskName = normalize(taskName);
              
              let mappedTo = taskName;
              let isGroup = false;
              if (dinhMucList && dinhMucList.length > 0) {
                  let exactDm = dinhMucList.find(d => normalize(d.name || '') === cleanTaskName);
                  if (exactDm) {
                      mappedTo = exactDm.name;
                      isGroup = !!exactDm.isGroup;
                  } else {
                     let foundDm = dinhMucList.find(d => {
                        const cleanDName = normalize(d.name || '');
                        return cleanDName.includes(cleanTaskName) || cleanTaskName.includes(cleanDName);
                     });
                     if (foundDm) {
                         mappedTo = foundDm.name;
                         isGroup = !!foundDm.isGroup;
                     }
                  }
              }
              const qty = parseFloat(match[2].replace(',', '.'));
              if (!isNaN(qty)) {
                  if (!finalStats[mappedTo]) {
                      finalStats[mappedTo] = { total: 0, isGroup };
                  }
                  
                  if (selectedMember === "all") {
                      if (e.date >= '2026-08-01') {
                          if (isGroup) {
                              finalStats[mappedTo].total += qty;
                          } else {
                              finalStats[mappedTo].total += (qty * membersCount);
                          }
                      } else {
                          if (isGroup) {
                              finalStats[mappedTo].total += (qty * membersCount) / 2;
                          } else {
                              finalStats[mappedTo].total += (qty * membersCount);
                          }
                      }
                  } else {
                      finalStats[mappedTo].total += qty;
                  }
              }
           }
        });
    });

    const result: [string, number][] = [];
    Object.entries(finalStats).forEach(([name, data]) => {
        let finalQty = data.total;
        result.push([name, Math.ceil(finalQty)]);
    });

    return result.sort((a, b) => b[1] - a[1]);
  }, [filteredEntries, selectedMember, dinhMucList]);

  const renderContentWithQuota = (content: string, membersCount: number, date: string) => {
    if (!content) return null;
    const lines = content.split('\n');
    return lines.filter(line => !/^\d+$/.test(line.trim())).map((line, i) => {
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

          const linesAll = content.split('\n');
          const lastLine = linesAll[linesAll.length - 1].trim();
          const isGroupReport = /^\d+$/.test(lastLine) && parseInt(lastLine, 10) > 0;
          const groupId = isGroupReport ? parseInt(lastLine, 10) : 0;
          const trueMembersCount = isGroupReport && groupSizes[date] && groupSizes[date][groupId] 
                                   ? groupSizes[date][groupId].size 
                                   : membersCount;

          let qtyPerMember = qty;
          if (isGroupReport && trueMembersCount >= 3) {
              qtyPerMember = (qty * 2) / trueMembersCount;
          }
          let displayQty = qtyPerMember;

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
                   <span>{displayQty}</span> <span className="text-[10px] opacity-70">{quotaDisplay}</span>
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

    const processContentLines = (content: string, membersCount: number, date: string) => {
        if (!content) return [];
        const lines = content.split('\n');
        return lines.filter(line => !/^\d+$/.test(line.trim())).map(line => {
            let cleanLine = line.trim();
            if (cleanLine.startsWith('-')) cleanLine = cleanLine.substring(1).trim();
            
            const match = cleanLine.match(/^(.*?):\s*([\d.,]+)$/);
            if (match) {
                const taskName = match[1].trim();
                const cleanTaskName = normalize(taskName);
                const totalQty = parseFloat(match[2].replace(',', '.'));
                
                const linesAll = content.split('\n');
                const lastLine = linesAll[linesAll.length - 1].trim();
                const isGroupReport = /^\d+$/.test(lastLine) && parseInt(lastLine, 10) > 0;
                const groupId = isGroupReport ? parseInt(lastLine, 10) : 0;
                const trueMembersCount = isGroupReport && groupSizes[date] && groupSizes[date][groupId] 
                                         ? groupSizes[date][groupId].size 
                                         : membersCount;

                let qtyPerMember = totalQty;
                if (isGroupReport && trueMembersCount >= 3) {
                    qtyPerMember = (totalQty * 2) / trueMembersCount;
                }
                
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
            
            const parsedLines = processContentLines(e.content, membersCount, e.date);
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
            const formattedTotal = Math.ceil(t.totalQty);
            totalsContent.push(`- ${t.originalName}: ${formattedTotal} ${quotaDisplay}`);
        });
        
        row["Tổng cộng"] = totalsContent.length > 0 ? totalsContent.join('\r\n') : '';
        
        exportData.push(row);
    });

    const workbook = XLSX.utils.book_new();

    // 1. Summary Sheet
    if (summaryStats && summaryStats.length > 0) {
       const summaryData = summaryStats.map(([name, qty], index) => ({
          "STT": index + 1,
          "Nội dung công việc": name,
          "Tổng khối lượng": qty
       }));
       const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
       summaryWorksheet['!cols'] = [{ wch: 5 }, { wch: 50 }, { wch: 20 }];
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
              <label className="block text-[10px] font-mono opacity-50 uppercase mb-2">Kỳ báo cáo</label>
              <div className="flex flex-col sm:flex-row gap-2">
                  <select
                     value={filterMode}
                     onChange={e => setFilterMode(e.target.value as any)}
                     className="bg-transparent border-b border-[#141414] pb-1 font-mono text-sm focus:outline-none pr-4 w-full sm:w-auto"
                  >
                     <option value="all">Tất cả thời gian</option>
                     <option value="day">Theo Ngày</option>
                     <option value="week">Theo Tuần</option>
                     <option value="month">Theo Tháng</option>
                     <option value="year">Theo Năm</option>
                  </select>

                  {filterMode === 'day' && (
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="bg-transparent border-b border-[#141414] pb-1 font-mono text-sm focus:outline-none w-full sm:w-auto"
                    />
                  )}
                  {filterMode === 'week' && (
                    <input
                      type="week"
                      value={selectedWeek}
                      onChange={e => setSelectedWeek(e.target.value)}
                      className="bg-transparent border-b border-[#141414] pb-1 font-mono text-sm focus:outline-none w-full sm:w-auto"
                    />
                  )}
                  {filterMode === 'month' && (
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(e.target.value)}
                      className="bg-transparent border-b border-[#141414] pb-1 font-mono text-sm focus:outline-none w-full sm:w-auto"
                    />
                  )}
                  {filterMode === 'year' && (
                    <input
                      type="number"
                      min="2000" max="2100"
                      placeholder="2024"
                      value={selectedYear}
                      onChange={e => setSelectedYear(e.target.value)}
                      className="bg-transparent border-b border-[#141414] pb-1 font-mono text-sm focus:outline-none w-full sm:w-auto w-[80px]"
                    />
                  )}
              </div>
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
                onClick={() => { 
                    setFilterMode('all'); 
                    setSelectedDate(''); 
                    setSelectedWeek('');
                    setSelectedMonth('');
                    setSelectedYear('');
                    setSelectedTeam('all'); 
                    setSelectedMember('all'); 
                }}
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
                {summaryStats.map(([name, qty], idx) => (
                  <div key={name} className="flex justify-between items-center text-sm border-b border-dashed border-[#141414]/20 pb-1">
                    <span className="font-medium text-[#141414]/80">{idx + 1}. {name}</span>
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
             <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => setDetailViewMode('grouped')}
                  className={`text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest transition-all border ${detailViewMode === 'grouped' ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#141414]/20 hover:border-[#141414]'}`}
                >
                  Dạng nhóm cá nhân
                </button>
                <button 
                  onClick={() => setDetailViewMode('list')}
                  className={`text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest transition-all border ${detailViewMode === 'list' ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#141414]/20 hover:border-[#141414]'}`}
                >
                  Dạng bảng
                </button>
                {filterMode === 'day' && (
                  <button 
                    onClick={() => setDetailViewMode('by_workgroup')}
                    className={`text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest transition-all border ${detailViewMode === 'by_workgroup' ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#141414]/20 hover:border-[#141414]'}`}
                  >
                    Theo tổ nhóm
                  </button>
                )}
             </div>
          </div>

          <div className="mx-6 mt-6 md:mx-8 mb-12">
          {allDates.length === 0 ? (
             <div className="text-center py-12 text-sm opacity-50 italic uppercase bg-white border border-[#141414] shadow-[4px_4px_0_#141414]">
                Hệ thống chưa ghi nhận<br/>hoạt động nào.
             </div>
          ) : (detailViewMode === 'by_workgroup' && filterMode === 'day') ? (
             <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                   <thead className="bg-[#141414] text-[#E4E3E0]">
                      <tr className="text-[10px] font-mono uppercase tracking-widest">
                         <th className="py-3 px-4 border-b border-[#141414] whitespace-nowrap w-12 text-center">STT</th>
                         <th className="py-3 px-4 border-b border-[#141414] whitespace-nowrap">Ngày</th>
                         <th className="py-3 px-4 border-b border-[#141414] whitespace-nowrap">Thành viên trong nhóm</th>
                         <th className="py-3 px-4 border-b border-[#141414]">Khu vực / Tổ</th>
                         <th className="py-3 px-4 border-b border-[#141414]">Nội dung công việc</th>
                      </tr>
                   </thead>
                   <tbody className="font-sans text-xs">
                      {groupedByWorkgroup.map((e, i) => {
                         const displayDate = e.date.includes('-') ? e.date.split('-').reverse().join('/') : e.date;
                         return (
                         <tr key={e.id} className={`border-b border-[#141414]/10 hover:bg-[#E4E3E0]/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'}`}>
                            <td className="py-3 px-4 border-r border-[#141414]/10 align-top text-center font-bold opacity-60">{i + 1}</td>
                            <td className="py-3 px-4 border-r border-[#141414]/10 align-top whitespace-nowrap font-mono">{displayDate}</td>
                            <td className="py-3 px-4 border-r border-[#141414]/10 align-top font-bold">
                               <div className="flex flex-col gap-1">
                                 {e.members?.map(m => <span key={m}>{m}</span>)}
                               </div>
                            </td>
                            <td className="py-3 px-4 border-r border-[#141414]/10 align-top opacity-70">{e.team}</td>
                            <td className="py-3 px-4 align-top">
                               <div className="whitespace-pre-wrap leading-relaxed space-y-1 relative group">
                                  {renderContentWithQuota(e.content, e.members?.length || 1, e.date)}
                                  <button 
                                     onClick={() => alert("Để xóa nội dung tác nghiệp này, vui lòng xóa trực tiếp ô dữ liệu tương ứng trên Google Sheets để đảm bảo nhất quán.")}
                                     title="Thông tin xoá"
                                     className="absolute top-0 right-0 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white border border-red-200 hover:bg-red-50"
                                  >
                                     <Trash2 className="w-3 h-3" />
                                  </button>
                               </div>
                            </td>
                         </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
          ) : detailViewMode === 'list' ? (
             <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                   <thead className="bg-[#141414] text-[#E4E3E0]">
                      <tr className="text-[10px] font-mono uppercase tracking-widest">
                         <th className="py-3 px-4 border-b border-[#141414] whitespace-nowrap w-12 text-center">STT</th>
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
                            <td className="py-3 px-4 border-r border-[#141414]/10 align-top text-center font-bold opacity-60">{i + 1}</td>
                            <td className="py-3 px-4 border-r border-[#141414]/10 align-top whitespace-nowrap font-mono">{row.date}</td>
                            <td className="py-3 px-4 border-r border-[#141414]/10 align-top font-bold">{row.member}</td>
                            <td className="py-3 px-4 border-r border-[#141414]/10 align-top opacity-70">{row.team}</td>
                            <td className="py-3 px-4 align-top">
                               <div className="whitespace-pre-wrap leading-relaxed space-y-1">
                                  {renderContentWithQuota(row.content, row.entry.members?.length || 1, row.entry.date)}
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
                                    <th className="py-3 px-4 border-b border-r border-[#141414]/20 w-12 font-bold text-center">STT</th>
                                    <th className="py-3 px-4 border-b border-r border-[#141414]/20 w-48 font-bold">Họ và Tên</th>
                                    <th className="py-3 px-4 border-b border-[#141414]/20 font-bold">Nội dung công việc</th>
                                 </tr>
                              </thead>
                              <tbody className="font-sans text-xs">
                                 {activeMembers.map((member, i) => {
                                    const memberEntries = dateEntries.filter(e => e.members?.includes(member));
                                    return (
                                       <tr key={member} className={`border-b border-[#141414]/10 hover:bg-[#E4E3E0]/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'}`}>
                                          <td className="py-3 px-4 text-center font-bold opacity-60 border-r border-[#141414]/10 align-top">{i + 1}</td>
                                          <td className="py-3 px-4 font-bold border-r border-[#141414]/10 align-top">
                                             {member}
                                          </td>
                                          <td className="py-3 px-4 align-top">
                                             <div className="space-y-3">
                                                {memberEntries.map(e => (
                                                   <div key={e.id} className="relative group text-[#141414] p-2 bg-[#F5F4F2] border border-[#141414]/10">
                                                      <div className="pr-8 whitespace-pre-wrap leading-relaxed space-y-1">
                                                         {renderContentWithQuota(e.content, e.members?.length || 1, e.date)}
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
