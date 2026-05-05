import React, { useState, useMemo } from 'react';
import { DataStore, WorkloadEntry } from '../store/DataStore';
import { format, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Filter, Trash2 } from 'lucide-react';

export default function Analytics({ refreshToggle }: { refreshToggle: number }) {
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  const entries = useMemo(() => DataStore.getEntries().sort((a, b) => b.timestamp - a.timestamp), [refreshToggle]);

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) {
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

  const chartData = useMemo(() => {
    const grouped = filteredEntries.reduce((acc, curr) => {
      acc[curr.team] = (acc[curr.team] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped).map(([name, count]) => ({
      name,
      'Số công việc': count
    }));
  }, [filteredEntries]);

  const uniqueTeams = useMemo(() => Array.from(new Set(entries.map(e => e.team))), [entries]);

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

        {chartData.length > 0 && (
          <div className="h-[250px] w-full p-6 border-b border-[#141414] bg-[#E4E3E0]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#141414" strokeOpacity={0.2} />
                <XAxis dataKey="name" tick={{fontSize: 10, fontFamily: 'monospace', fill: '#141414'}} stroke="#141414" />
                <YAxis allowDecimals={false} tick={{fontSize: 10, fontFamily: 'monospace', fill: '#141414'}} stroke="#141414" />
                <Tooltip cursor={{fill: '#141414', opacity: 0.1}} contentStyle={{backgroundColor: '#141414', color: '#E4E3E0', border: 'none', borderRadius: 0, fontFamily: 'monospace', fontSize: 10}} />
                <Bar dataKey="Số công việc" fill="#141414" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="overflow-x-auto bg-[#F5F4F2]">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-[#141414] text-[#E4E3E0]">
              <tr className="text-[10px] font-mono uppercase tracking-tighter text-center">
                <th className="py-3 px-4 border-r border-[#E4E3E0]/20 w-28">Ngày</th>
                <th className="py-3 px-4 border-r border-[#E4E3E0]/20 w-32">Tổ</th>
                <th className="py-3 px-4 border-r border-[#E4E3E0]/20">Nhóm Công Tác</th>
                <th className="py-3 px-4 border-r border-[#E4E3E0]/20">Nội Dung</th>
                <th className="py-3 px-4 border-r border-[#E4E3E0]/20 w-32 text-right">Khối Lượng</th>
                <th className="py-3 px-4 w-16 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[10px] uppercase opacity-50 italic">
                    Chưa có hoạt động nào được ghi lại.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, i) => (
                  <tr key={entry.id} className={`border-b border-[#141414]/20 hover:bg-white text-center ${i % 2 === 0 ? '' : 'bg-[#E4E3E0]/30'}`}>
                    <td className="py-3 px-4 opacity-70">
                      {format(parseISO(entry.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="py-3 px-4 font-bold border-r border-l border-[#141414]/10">
                      {entry.team}
                    </td>
                    <td className="py-3 px-4 text-left border-r border-[#141414]/10 opacity-80">{entry.workGroup}</td>
                    <td className="py-3 px-4 text-left border-r border-[#141414]/10 italic max-w-sm truncate" title={entry.content}>{entry.content}</td>
                    <td className="py-3 px-4 text-right border-r border-[#141414]/10 shrink-0">
                      <span className="font-bold text-sm bg-black/5 px-2 py-1">{entry.volume}</span>
                      <span className="opacity-50 ml-1 text-[10px] uppercase">{entry.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-700 hover:text-white hover:bg-red-700 px-2 py-1 border border-red-700 transition-colors uppercase text-[9px] font-bold"
                        title="Xóa"
                      >
                        Del
                      </button>
                    </td>
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
