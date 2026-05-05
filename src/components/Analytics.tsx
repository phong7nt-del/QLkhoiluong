import React, { useState, useMemo } from 'react';
import { DataStore } from '../store/DataStore';
import { format, parseISO } from 'date-fns';
import { Filter, Trash2 } from 'lucide-react';

export default function Analytics({ refreshToggle }: { refreshToggle: number }) {
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  const entries = useMemo(() => DataStore.getEntries().sort((a, b) => b.timestamp - a.timestamp), [refreshToggle]);

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tác nghiệp này?')) {
      DataStore.deleteEntry(id);
      window.dispatchEvent(new Event('workload_updated')); 
    }
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (selectedTeam !== 'all' && e.team !== selectedTeam) return false;
      if (selectedDate && e.date !== selectedDate) return false;
      return true;
    });
  }, [entries, selectedTeam, selectedDate]);

  const uniqueTeams = useMemo(() => Array.from(new Set(entries.map(e => e.team))), [entries]);

  // Compute unique dates for columns
  const allDates = useMemo(() => {
    const dates = new Set<string>(filteredEntries.map(e => e.date));
    return Array.from(dates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
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
            <button 
              onClick={() => { setSelectedDate(''); setSelectedTeam('all'); }}
              className="text-[10px] bg-[#141414] text-white px-3 py-2 uppercase font-bold tracking-widest hover:invert transition-all mt-2 sm:mt-0"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto bg-[#F5F4F2]">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-[#141414] text-[#E4E3E0]">
              <tr className="text-[10px] font-mono uppercase tracking-tighter text-center">
                <th className="py-3 px-4 border-r border-[#E4E3E0]/20 w-48 text-left">Họ và Tên</th>
                {allDates.map(date => (
                  <th key={date} className="py-3 px-4 border-r border-[#E4E3E0]/20 min-w-[200px]">
                    {format(parseISO(date), 'dd/MM/yyyy')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-sans text-xs">
              {allMembers.length === 0 ? (
                <tr>
                  <td colSpan={allDates.length + 1} className="py-8 text-center text-[10px] uppercase opacity-50 italic">
                    Chưa có hoạt động nào được ghi lại.
                  </td>
                </tr>
              ) : (
                allMembers.map((member, i) => (
                  <tr key={member} className={`border-b border-[#141414]/20 hover:bg-white ${i % 2 === 0 ? '' : 'bg-[#E4E3E0]/30'}`}>
                    <td className="py-3 px-4 font-bold border-r border-[#141414]/10">
                      {member}
                    </td>
                    {allDates.map(date => {
                       // Find entries for this member on this date
                       const cellEntries = filteredEntries.filter(e => e.date === date && e.members?.includes(member));
                       return (
                         <td key={date} className="py-2 px-3 border-r border-[#141414]/10 align-top">
                           {cellEntries.length > 0 ? (
                             <div className="space-y-2">
                               {cellEntries.map(e => (
                                 <div key={e.id} className="bg-white border border-[#141414]/20 p-2 shadow-sm relative group">
                                   <div className="pr-6 leading-relaxed whitespace-pre-wrap">{e.content}</div>
                                   <button 
                                     onClick={() => handleDelete(e.id)}
                                     title="Xóa"
                                     className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white border border-red-200 hover:bg-red-50"
                                   >
                                     <Trash2 className="w-3 h-3" />
                                   </button>
                                 </div>
                               ))}
                             </div>
                           ) : (
                             <span className="text-[#141414] opacity-10 block text-center">-</span>
                           )}
                         </td>
                       );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
