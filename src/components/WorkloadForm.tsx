import React, { useState, useEffect, useRef } from 'react';
import { DataStore, SheetMember } from '../store/DataStore';
import { PlusCircle, Search, CheckSquare, Square, Mic } from 'lucide-react';
import { format } from 'date-fns';

export default function WorkloadForm({ onSaved, refreshToggle }: { onSaved: () => void, refreshToggle: number }) {
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [allSheetMembers, setAllSheetMembers] = useState<SheetMember[]>([]);
  const [dinhMucList, setDinhMucList] = useState<{name: string, quota: number}[]>([]);
  
  const [team, setTeam] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [memberInput, setMemberInput] = useState('');
  const [phatHien, setPhatHien] = useState('không có');
  const [isRecordingPhatHien, setIsRecordingPhatHien] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const [selectedTasks, setSelectedTasks] = useState<Record<string, {selected: boolean, quantity: number | string}>>({});
  
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [filteredMembers, setFilteredMembers] = useState<string[]>([]);

  useEffect(() => {
    const teams = DataStore.getTeams();
    const sm = DataStore.getMembers();
    const dm = DataStore.getDinhMuc();
    setAvailableTeams(teams);
    setAllSheetMembers(sm);
    setDinhMucList(dm);
    if (teams.length > 0 && !team) {
      setTeam(teams[0]);
    }
    
    // Initialize task selection state
    const tTasks: Record<string, {selected: boolean, quantity: number | string}> = {};
    dm.forEach(item => {
        tTasks[item.name] = { selected: false, quantity: item.quota || 1 };
    });
    setSelectedTasks(tTasks);
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const entries = Object.entries(selectedTasks) as [string, {selected: boolean, quantity: number | string}][];
    const selectedList = entries.filter(([_, data]) => data.selected && typeof data.quantity === 'number' && data.quantity > 0);
    
    if (!team || members.length === 0 || !date || selectedList.length === 0) {
      alert("Vui lòng điền đầy đủ thông tin nội dung và có ít nhất 1 nội dung được chọn");
      return;
    }

    setIsSubmitting(true);

    const contentLines = selectedList.map(([name, data]) => `${name}: ${(data as any).quantity}`);
    if (phatHien.trim()) {
       contentLines.push(`Phát hiện: ${phatHien.trim()}`);
    }
    const content = contentLines.join('\n');

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

    setMembers([]);
    setMemberInput('');
    setPhatHien('không có');
    
    // Reset selected tasks
    const rTasks = { ...selectedTasks };
    Object.keys(rTasks).forEach(k => { rTasks[k].selected = false; });
    setSelectedTasks(rTasks);
    
    onSaved();
  };

  const toggleTask = (name: string) => {
     setSelectedTasks(prev => ({
        ...prev,
        [name]: { ...prev[name], selected: !prev[name].selected }
     }));
  };

  const updateQuantity = (name: string, val: number | string) => {
     setSelectedTasks(prev => ({
        ...prev,
        [name]: { ...prev[name], quantity: val }
     }));
  };

  const toggleRecordingPhatHien = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
       alert("Trình duyệt không hỗ trợ nhận dạng giọng nói!");
       return;
    }
    
    if (isRecordingPhatHien && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecordingPhatHien(false);
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'vi-VN';
    recognition.interimResults = true;
    
    let baseContent = (phatHien && phatHien !== 'không có') ? phatHien : '';
    
    recognition.onstart = () => setIsRecordingPhatHien(true);
    recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
        }
        setPhatHien(baseContent ? `${baseContent} ${currentTranscript}` : currentTranscript);
    };
    recognition.onerror = () => setIsRecordingPhatHien(false);
    recognition.onend = () => setIsRecordingPhatHien(false);
    
    recognition.start();
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 p-6 sm:p-10 max-w-4xl shadow-xl shadow-slate-200/40 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      
      <h2 className="text-xl sm:text-2xl font-bold mb-8 border-b border-slate-200 pb-4 flex items-center gap-3 text-slate-800 tracking-tight">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
          <ClipboardList className="w-4 h-4" />
        </div>
        Nhập Ghi Nhận Công Việc
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative group">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Ngày thực hiện</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all hover:bg-white"
              required
            />
          </div>
          <div className="relative group">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tổ công tác</label>
            <select 
              value={team} 
              onChange={e => {
                 setTeam(e.target.value);
                 setMembers([]); // reset members when team changes
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all hover:bg-white"
              required
            >
              <option value="" disabled>Chọn tổ...</option>
              {availableTeams.length > 0 ? availableTeams.map(t => <option key={t} value={t}>{t}</option>) : <option disabled>Chưa có dữ liệu Tổ</option>}
            </select>
          </div>
        </div>

        <div className="relative group">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Họ và Tên (Nhóm Công Tác)</label>
          <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-wrap gap-2 min-h-[50px] items-center text-sm font-medium focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all">
             {members.map(m => (
               <div key={m} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-bold shadow-sm border border-blue-200">
                  {m}
                  <button type="button" onClick={() => setMembers(prev => prev.filter(x => x !== m))} className="opacity-60 hover:opacity-100 hover:text-red-500 transition-colors bg-blue-200/50 rounded-full w-4 h-4 flex items-center justify-center">×</button>
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
               placeholder={members.length === 0 ? "Nhập tên và nhấn Enter..." : "Thêm người..."}
               className="flex-1 min-w-[150px] bg-transparent focus:outline-none placeholder-slate-400 font-medium ml-1"
             />
          </div>
          
          {memberInput && filteredMembers.length > 0 && (
            <div className="absolute z-10 left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
              {filteredMembers.map((suggestion, idx) => (
                <div 
                  key={idx}
                  className="p-3 text-sm border-b border-slate-100 hover:bg-blue-50 hover:text-blue-700 cursor-pointer font-semibold transition-colors"
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

        <div>
           <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Các Nội Dung Công Việc</label>
           <div className="space-y-1.5 bg-slate-50/50 rounded-xl p-3 border border-slate-200 max-h-[28rem] overflow-y-auto">
             {dinhMucList.length > 0 ? (
               dinhMucList.map(dm => {
                 const isChecked = selectedTasks[dm.name]?.selected || false;
                 const qty = selectedTasks[dm.name]?.quantity || 1;
                 
                 return (
                   <div key={dm.name} className={`flex items-center justify-between py-1.5 px-3 border ${isChecked ? 'bg-white border-[#141414] shadow-[2px_2px_0_#141414]' : 'bg-transparent border-[#141414]/20 hover:border-[#141414]/50 hover:bg-[#E4E3E0]/30'} transition-all`}>
                      <div 
                         className="flex items-center gap-3 cursor-pointer flex-1"
                         onClick={() => toggleTask(dm.name)}
                      >
                         {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#141414]" />
                         ) : (
                            <Square className="w-4 h-4 opacity-30" />
                         )}
                         <div>
                            <span className={`text-sm font-bold block ${isChecked ? 'text-[#141414]' : 'text-[#141414]/60'}`}>
                               {dm.name}
                            </span>
                         </div>
                      </div>
                      
                      <div className="w-20">
                         {isChecked && (
                            <input 
                              type="number"
                              min="1"
                              value={qty}
                              onChange={e => {
                                 const val = e.target.value;
                                 updateQuantity(dm.name, val === '' ? '' : (parseInt(val) || 1));
                              }}
                              className="w-full bg-[#141414] text-[#E4E3E0] font-bold p-1 text-center text-sm focus:outline-none"
                              placeholder="K.Lượng"
                            />
                         )}
                      </div>
                   </div>
                 );
               })
             ) : (
               <div className="text-center italic opacity-50 text-sm py-4">Chưa có Nội dung định mức (Vào Cấu hình tải)</div>
             )}
           </div>
        </div>

        <div className="pt-4">
           <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Nội dung phát hiện</label>
           <div className="relative group">
               <textarea
                 value={phatHien}
                 onChange={(e) => setPhatHien(e.target.value)}
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 min-h-[100px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all hover:bg-white resize-y shadow-sm"
                 placeholder="Nhập nội dung phát hiện (mặc định: không có)"
               />
               <button
                  type="button"
                  onClick={toggleRecordingPhatHien}
                  className={`absolute right-3 bottom-4 p-2.5 rounded-full transition-all shadow-sm ${isRecordingPhatHien ? 'bg-red-50 text-red-600 animate-pulse ring-2 ring-red-500/30' : 'bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200'}`}
                  title={isRecordingPhatHien ? "Dừng ghi âm" : "Ghi âm bằng giọng nói"}
               >
                  <Mic className="w-4 h-4" />
               </button>
           </div>
        </div>

        <div className="pt-6">
          <button 
            type="submit"
            disabled={isSubmitting || members.length === 0}
            className={`w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed text-white/50' : 'hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0'}`}
          >
            {isSubmitting ? 'ĐANG ĐỒNG BỘ...' : 'Cập Nhật Lên Hệ Thống [Enter]'}
          </button>
          <p className="text-center text-xs font-medium text-slate-400 mt-4 tracking-wide uppercase">
             Vui lòng kiểm tra kỹ danh sách thành viên trước khi gửi
          </p>
        </div>
      </form>
    </div>
  );
}
