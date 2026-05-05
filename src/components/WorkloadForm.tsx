import React, { useState, useEffect } from 'react';
import { DataStore } from '../store/DataStore';
import { PlusCircle, Search } from 'lucide-react';
import { format } from 'date-fns';

const TEAMS = ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4', 'Tổ 5', 'Tổ Điện', 'Tổ Nước', 'Tổ Xây Dựng'];
const UNITS = ['m', 'm2', 'm3', 'cái', 'bộ', 'cuộn', 'giờ', 'ngày', 'tấn', 'kg'];

export default function WorkloadForm({ onSaved }: { onSaved: () => void }) {
  const [team, setTeam] = useState(TEAMS[0]);
  const [workGroup, setWorkGroup] = useState('');
  const [content, setContent] = useState('');
  const [volume, setVolume] = useState<number | ''>('');
  const [unit, setUnit] = useState(UNITS[0]);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [recentGroups, setRecentGroups] = useState<string[]>([]);
  const [recentContents, setRecentContents] = useState<string[]>([]);

  const [filteredContents, setFilteredContents] = useState<string[]>([]);

  useEffect(() => {
    setRecentGroups(DataStore.getUniqueWorkGroups());
    setRecentContents(DataStore.getUniqueContents());
  }, []);

  useEffect(() => {
    if (content.length > 0) {
      const lowerReq = content.toLowerCase();
      setFilteredContents(
        recentContents.filter(c => c.toLowerCase().includes(lowerReq) && c !== content)
      );
    } else {
      setFilteredContents([]);
    }
  }, [content, recentContents]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !workGroup || !content || volume === '' || !unit || !date) {
      alert("Vui lòng điền đầy đủ thông tin");
      return;
    }

    DataStore.addEntry({
      team,
      workGroup,
      content,
      volume: Number(volume),
      unit,
      date
    });

    setContent('');
    setVolume('');
    setRecentGroups(DataStore.getUniqueWorkGroups());
    setRecentContents(DataStore.getUniqueContents());
    
    alert("Đã lưu thành công!");
    onSaved();
  };

  return (
    <div className="bg-white border border-[#141414] p-6 sm:p-10 max-w-3xl shadow-[4px_4px_0_#141414] sm:shadow-[8px_8px_0_#141414]">
      <h2 className="text-xl sm:text-2xl font-serif italic mb-8 border-b border-[#141414] pb-4 flex items-center gap-3 text-[#141414]">
        Nhập Nội Dung Công Tác
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative">
            <label className="block text-[10px] font-mono opacity-50 uppercase mb-2">Ngày thực hiện</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="w-full bg-transparent border-b border-[#141414] pb-2 font-bold focus:outline-none"
              required
            />
          </div>
          <div className="relative">
            <label className="block text-[10px] font-mono opacity-50 uppercase mb-2">Tổ công tác</label>
            <select 
              value={team} 
              onChange={e => setTeam(e.target.value)}
              className="w-full bg-transparent border-b border-[#141414] pb-2 font-bold focus:outline-none"
              required
            >
              <option value="" disabled>Chọn tổ...</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="relative">
          <label className="block text-[10px] font-mono opacity-50 uppercase mb-2">Nhóm công tác</label>
          <input 
            type="text" 
            list="workGroupList"
            value={workGroup} 
            onChange={e => setWorkGroup(e.target.value)}
            placeholder="VD: Lắp đặt thiết bị chiếu sáng"
            className="w-full bg-[#E4E3E0] bg-opacity-30 border border-[#141414] p-3 text-sm focus:outline-none font-medium"
            required
          />
          <datalist id="workGroupList">
            {recentGroups.map(g => <option key={g} value={g} />)}
          </datalist>
        </div>

        <div className="relative">
          <label className="block text-[10px] font-mono opacity-50 uppercase mb-2">Nội dung công việc</label>
          <div className="relative">
            <input 
              type="text" 
              value={content} 
              onChange={e => setContent(e.target.value)}
              placeholder="Nhập nội dung công việc..."
              className="w-full bg-[#E4E3E0] bg-opacity-30 border border-[#141414] p-3 pr-10 text-sm focus:outline-none font-medium"
              required
              autoComplete="off"
            />
            <Search className="absolute right-3 top-3 w-5 h-5 opacity-30" />
          </div>
          
          {filteredContents.length > 0 && (
            <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-[#141414] shadow-[4px_4px_0_#141414] max-h-48 overflow-y-auto">
              {filteredContents.map((suggestion, idx) => (
                <div 
                  key={idx}
                  className="p-3 text-xs border-b border-[#E4E3E0] hover:bg-[#141414] hover:text-white cursor-pointer font-medium"
                  onClick={() => {
                    setContent(suggestion);
                    setFilteredContents([]);
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="relative">
            <label className="block text-[10px] font-mono opacity-50 uppercase mb-2">Khối lượng</label>
            <input 
              type="number" 
              step="any"
              value={volume} 
              onChange={e => setVolume(e.target.value !== '' ? Number(e.target.value) : '')}
              placeholder="0.0"
              className="w-full bg-transparent border-b border-[#141414] pb-2 font-mono text-xl focus:outline-none"
              required
            />
          </div>
          <div className="relative">
            <label className="block text-[10px] font-mono opacity-50 uppercase mb-2">Đơn vị</label>
            <select 
              value={unit} 
              onChange={e => setUnit(e.target.value)}
              className="w-full bg-transparent border-b border-[#141414] pb-2 font-mono text-xl focus:outline-none"
              required
            >
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="pt-6">
          <button 
            type="submit"
            className="w-full bg-[#141414] text-white p-4 font-bold uppercase tracking-widest text-sm hover:invert transition-all flex items-center justify-center gap-2"
          >
            Cập Nhật Lên Hệ Thống [Enter]
          </button>
        </div>
      </form>
    </div>
  );
}
