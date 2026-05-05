import React, { useState, useEffect } from 'react';
import { DataStore, SheetMember } from '../store/DataStore';
import { PlusCircle, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function WorkloadForm({ onSaved, refreshToggle }: { onSaved: () => void, refreshToggle: number }) {
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [allSheetMembers, setAllSheetMembers] = useState<SheetMember[]>([]);
  
  const [team, setTeam] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [memberInput, setMemberInput] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [recentContents, setRecentContents] = useState<string[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<string[]>([]);
  const [filteredContents, setFilteredContents] = useState<string[]>([]);

  useEffect(() => {
    const teams = DataStore.getTeams();
    const sm = DataStore.getMembers();
    setAvailableTeams(teams);
    setAllSheetMembers(sm);
    if (teams.length > 0 && !team) {
      setTeam(teams[0]);
    }
    setRecentContents(DataStore.getUniqueContents());
  }, [refreshToggle]);

  useEffect(() => {
    const availableMembers = (team ? allSheetMembers.filter(m => m.team === team) : allSheetMembers).map(m => m.name);
    if (memberInput.length > 0) {
      const lowerReq = memberInput.toLowerCase();
      setFilteredMembers(
        availableMembers.filter(m => m.toLowerCase().includes(lowerReq) && !members.includes(m))
      );
    } else {
      setFilteredMembers(availableMembers.filter(m => !members.includes(m)));
    }
  }, [memberInput, team, allSheetMembers, members]);

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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || members.length === 0 || !content || !date) {
      alert("Vui lòng điền đầy đủ thông tin");
      return;
    }

    setIsSubmitting(true);

    const entry = {
      team,
      members,
      content,
      date
    };

    // Add to local store
    DataStore.addEntry(entry);
    
    // Sync to Google Sheet
    const success = await DataStore.syncToSheet(entry);

    setIsSubmitting(false);

    if (success) {
      alert("Đã lưu và đồng bộ thành công!");
    } else {
      alert("Đã lưu cục bộ nhưng đồng bộ thất bại. Vui lòng thử lại sau.");
    }

    setContent('');
    setMembers([]);
    setMemberInput('');
    setRecentContents(DataStore.getUniqueContents());
    
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
              onChange={e => {
                 setTeam(e.target.value);
                 setMembers([]); // reset members when team changes
              }}
              className="w-full bg-transparent border-b border-[#141414] pb-2 font-bold focus:outline-none"
              required
            >
              <option value="" disabled>Chọn tổ...</option>
              {availableTeams.length > 0 ? availableTeams.map(t => <option key={t} value={t}>{t}</option>) : <option disabled>Chưa có dữ liệu Tổ (Vào Cấu hình tải)</option>}
            </select>
          </div>
        </div>

        <div className="relative">
          <label className="block text-[10px] font-mono opacity-50 uppercase mb-2">Họ và Tên (Nhóm Công Tác)</label>
          <div className="w-full bg-[#E4E3E0] bg-opacity-30 border border-[#141414] p-2 flex flex-wrap gap-2 min-h-[46px] items-center text-sm font-medium focus-within:ring-2 focus-within:ring-[#141414]">
             {members.map(m => (
               <div key={m} className="bg-[#141414] text-[#E4E3E0] px-2 py-1 flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold">
                  {m}
                  <button type="button" onClick={() => setMembers(prev => prev.filter(x => x !== m))} className="opacity-50 hover:opacity-100 ml-1">×</button>
               </div>
             ))}
             <input
               type="text"
               value={memberInput}
               onChange={e => setMemberInput(e.target.value)}
               onKeyDown={e => {
                  if (e.key === 'Enter') {
                     e.preventDefault();
                     const val = memberInput.trim();
                     if (val) {
                        const exactMatch = allSheetMembers.find(m => m.name.toLowerCase() === val.toLowerCase());
                        if (exactMatch) {
                           if (!members.includes(exactMatch.name)) setMembers(prev => [...prev, exactMatch.name]);
                           setMemberInput('');
                        } else {
                           alert(`Lỗi! Tên "${val}" không khớp với danh sách nhân viên trong hệ thống (Sheet CongTac).`);
                        }
                     }
                  }
               }}
               placeholder={members.length === 0 ? "Nhập tên và nhấn Enter..." : ""}
               className="flex-1 min-w-[150px] bg-transparent focus:outline-none placeholder-gray-500"
             />
          </div>
          
          {memberInput && filteredMembers.length > 0 && (
            <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-[#141414] shadow-[4px_4px_0_#141414] max-h-48 overflow-y-auto">
              {filteredMembers.map((suggestion, idx) => (
                <div 
                  key={idx}
                  className="p-3 text-xs border-b border-[#E4E3E0] hover:bg-[#141414] hover:text-white cursor-pointer font-bold uppercase"
                  onClick={() => {
                    setMembers(prev => [...prev, suggestion]);
                    setMemberInput('');
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
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

        <div className="pt-6">
          <button 
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-[#141414] text-white p-4 font-bold uppercase tracking-widest text-sm hover:invert transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'ĐANG ĐỒNG BỘ...' : 'Cập Nhật Lên Hệ Thống [Enter]'}
          </button>
        </div>
      </form>
    </div>
  );
}
