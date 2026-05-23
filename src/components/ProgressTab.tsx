import React, { useState, useMemo } from 'react';
import { DataStore, TaskProgress, SheetMember } from '../store/DataStore';
import { CheckCircle, Clock, AlertCircle, Plus, User as UserIcon, Mic, XCircle, LayoutGrid, List, FileSpreadsheet, MessageSquarePlus, Send, Search, ChevronDown, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { SeasonTheme } from '../App';

export default function ProgressTab({ refreshToggle, sessionUser, theme }: { refreshToggle: number, sessionUser: SheetMember | null, theme: SeasonTheme }) {
  const [tasks, setTasks] = useState<TaskProgress[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  
  // New task form state
  const [showForm, setShowForm] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newRef, setNewRef] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [searchAssignee, setSearchAssignee] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [pendingViewMode, setPendingViewMode] = useState<'grid' | 'table'>('grid');
  const [isPendingExpanded, setIsPendingExpanded] = useState(true);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [filterState, setFilterState] = useState({ ok: true, warning: true, overdue: true });
  const [searchText, setSearchText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  // Explanation state
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [expInput, setExpInput] = useState('');

  const roleStr = sessionUser?.role ? sessionUser.role.toLowerCase() : '';
  const isDoiTruong = ['đội trưởng', 'giám đốc'].some(r => roleStr.includes(r));
  const isManagement = ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'].some(r => roleStr.includes(r));
  
  const fetchProgress = async () => {
    setIsRefreshing(true);
    await DataStore.syncMasterData();
    setTasks(DataStore.getTasks());
    setIsRefreshing(false);
  };

  React.useEffect(() => {
     setTasks(DataStore.getTasks());
     const mems = DataStore.getMembers().map(m => m.name).filter(Boolean);
     setMembers(Array.from(new Set(mems)));
  }, [refreshToggle]);

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProgress();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleComplete = (id: string) => {
     DataStore.updateTaskStatus(id, 'xong');
     setTasks(DataStore.getTasks());
  };

  const handleSaveExplanation = (id: string) => {
     if (!expInput.trim()) return;
     DataStore.updateTaskExplanation(id, expInput.trim(), sessionUser?.name || '');
     setTasks(DataStore.getTasks());
     setEditingExpId(null);
     setExpInput('');
  };

  const handleRevert = (id: string) => {
     DataStore.updateTaskStatus(id, '');
     setTasks(DataStore.getTasks());
  };

  const handleCancel = () => {
     setNewContent('');
     setNewRef('');
     setNewDeadline('');
     setNewAssignee('');
     setShowForm(false);
  };

  const handleAddTask = (e: React.FormEvent) => {
     e.preventDefault();
     if (!newContent) return;
     let formattedDeadline = newDeadline;
     if (newDeadline.includes('-')) {
         const parts = newDeadline.split('-');
         if (parts.length === 3) formattedDeadline = `${parts[2]}/${parts[1]}/${parts[0]}`;
     }
     DataStore.addTask({
         content: newContent,
         reference: newRef,
         deadline: formattedDeadline,
         assignee: newAssignee,
         status: ''
     });
     setTasks(DataStore.getTasks());
     handleCancel();
  };

  const recognitionTimeoutRef = React.useRef<any>(null);

  const clearVoiceTimeout = () => {
    if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
    }
  };

  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
       alert("Trình duyệt không hỗ trợ nhận dạng giọng nói!");
       return;
    }
    
    if (isRecording && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecording(false);
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'vi-VN';
    recognition.interimResults = true;
    
    // Store original so we only append new transcript
    let baseContent = newContent;
    
    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
        clearVoiceTimeout();
        recognitionTimeoutRef.current = setTimeout(() => {
           recognition.stop();
        }, 3000);

        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
        }

        if (currentTranscript.trim().toLowerCase().match(/\b(hết|kết thúc)\s*[.,]?\s*$/i)) {
            currentTranscript = currentTranscript.replace(/\b(hết|kết thúc)\s*[.,]?\s*$/i, '');
            setTimeout(() => recognition.stop(), 500);
        }

        setNewContent(baseContent ? `${baseContent} ${currentTranscript}` : currentTranscript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    
    recognition.start();
  };

  // Parse dd/mm/yyyy
  const parseDate = (dStr: string) => {
      if (!dStr) return null;
      const parts = dStr.split('/');
      if (parts.length === 3) {
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      return null;
  };

  const today = new Date();
  today.setHours(0,0,0,0);

  const removeAccents = (str: string) => {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  };

  const isCompletedTask = (statusStr: string) => {
    const s = removeAccents(statusStr).replace(/[\s_]+/g, '');
    return s.includes('xong') || s.includes('hoanthanh') || s.includes('hoantat') || s.includes('ketthuc') || s.includes('dathu');
  };

  const pendingTasksRaw = tasks.filter(t => !isCompletedTask(t.status));
  const completedTasksRaw = tasks.filter(t => isCompletedTask(t.status));

  const safeSearch = removeAccents(searchText);
  const pendingTasks = safeSearch ? pendingTasksRaw.filter(t => 
       removeAccents(t.content).includes(safeSearch) || 
       removeAccents(t.assignee).includes(safeSearch)
  ) : pendingTasksRaw;
  
  const completedTasks = safeSearch ? completedTasksRaw.filter(t => 
       removeAccents(t.content).includes(safeSearch) || 
       removeAccents(t.assignee).includes(safeSearch)
  ) : completedTasksRaw;

  const getStatusColor = (deadlineStr: string) => {
     const dDate = parseDate(deadlineStr);
     if (!dDate) return `${theme.status.overdue.bg} ${theme.status.overdue.border} ${theme.status.overdue.text} border`;
     const diffTime = dDate.getTime() - today.getTime();
     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
     if (diffDays > 3) return `${theme.status.ok.bg} ${theme.status.ok.border} border ${theme.status.ok.text}`;
     if (diffDays >= 1 && diffDays <= 3) return `${theme.status.near.bg} ${theme.status.near.border} border ${theme.status.near.text}`;
     return `${theme.status.overdue.bg} ${theme.status.overdue.border} border ${theme.status.overdue.text}`;
  };

  let overdueCount = 0;
  let warningCount = 0;
  let okCount = 0;
  
  pendingTasks.forEach(t => {
      const dDate = parseDate(t.deadline);
      if (!dDate) { overdueCount++; return; }
      const diffTime = dDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 3) okCount++;
      else if (diffDays >= 1) warningCount++;
      else overdueCount++;
  });

  const getStatusBadge = (deadlineStr: string) => {
     const dDate = parseDate(deadlineStr);
     if (!dDate) return <div className={`flex items-center gap-1.5 ${theme.status.overdue.bg} ${theme.status.overdue.text} px-2.5 py-1 rounded-md border ${theme.status.overdue.border} text-[10px] font-black uppercase tracking-wider shadow-sm`}><span className={`w-2 h-2 rounded-full ${theme.status.overdue.dot} animate-pulse`}></span>Quá hạn / Lỗi ngày</div>;
     const diffTime = dDate.getTime() - today.getTime();
     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
     if (diffDays > 3) return <div className={`flex items-center gap-1.5 ${theme.status.ok.bg} ${theme.status.ok.text} px-2.5 py-1 rounded-md border ${theme.status.ok.border} text-[10px] font-black uppercase tracking-wider shadow-sm`}><span className={`w-2 h-2 rounded-full ${theme.status.ok.dot}`}></span>Còn {diffDays} ngày</div>;
     if (diffDays >= 1 && diffDays <= 3) return <div className={`flex items-center gap-1.5 ${theme.status.near.bg} ${theme.status.near.text} px-2.5 py-1 rounded-md border ${theme.status.near.border} text-[10px] font-black uppercase tracking-wider shadow-sm`}><span className={`w-2 h-2 rounded-full ${theme.status.near.dot} animate-pulse`}></span>Gần hạn ({diffDays} ngày)</div>;
     if (diffDays === 0) return <div className={`flex items-center gap-1.5 ${theme.status.overdue.bg} ${theme.status.overdue.text} px-2.5 py-1 rounded-md border ${theme.status.overdue.border} text-[10px] font-black uppercase tracking-wider shadow-sm`}><span className={`w-2 h-2 rounded-full ${theme.status.overdue.dot} animate-pulse`}></span>Hôm nay</div>;
     return <div className={`flex items-center gap-1.5 ${theme.status.overdue.bg} ${theme.status.overdue.text} px-2.5 py-1 rounded-md border ${theme.status.overdue.border} text-[10px] font-black uppercase tracking-wider shadow-sm`}><span className={`w-2 h-2 rounded-full ${theme.status.overdue.dot} animate-pulse`}></span>Quá hạn {Math.abs(diffDays)} ngày</div>;
  };

  const filteredMembers = members.filter(m => m.toLowerCase().includes(searchAssignee.toLowerCase()));

  const getDiffDays = (deadlineStr: string) => {
     const dDate = parseDate(deadlineStr);
     if (!dDate) return -99999; // Lỗi ngày -> đẩy lên đầu
     const diffTime = dDate.getTime() - today.getTime();
     return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const sortedPendingTasks = [...pendingTasks].filter(t => {
      const dDays = getDiffDays(t.deadline);
      if (dDays > 3 && !filterState.ok) return false;
      if (dDays >= 1 && dDays <= 3 && !filterState.warning) return false;
      if (dDays <= 0 && !filterState.overdue) return false;
      return true;
  }).sort((a, b) => {
      return getDiffDays(a.deadline) - getDiffDays(b.deadline);
  });

  const exportExcel = () => {
     // Prepare data array
     const data = [
        ['STT', 'Tiến độ', 'Nội dung', 'Căn cứ', 'Phân công', 'Ngày hoàn tất', 'Trạng thái']
     ];
     
     const addRow = (t: TaskProgress, idx: number, progressGroup: string) => {
         let timeStatus = 'Đã hoàn tất';
         if (t.status.toLowerCase() !== 'xong') {
             const dDays = getDiffDays(t.deadline);
             if (dDays === -99999) timeStatus = 'Lỗi ngày / Quá hạn';
             else if (dDays > 3) timeStatus = `Còn ${dDays} ngày`;
             else if (dDays >= 1 && dDays <= 3) timeStatus = `Sắp quá hạn (${dDays} ngày)`;
             else if (dDays === 0) timeStatus = 'Hôm nay';
             else timeStatus = `Quá hạn ${Math.abs(dDays)} ngày`;
         }

         data.push([
             String(idx + 1),
             progressGroup,
             t.content,
             t.reference || '',
             t.assignee || '',
             t.deadline || '',
             timeStatus
         ]);
     };

     sortedPendingTasks.forEach((t, i) => addRow(t, i, 'Đang thực hiện'));
     completedTasks.forEach((t, i) => addRow(t, i, 'Đã hoàn tất'));

     const wb = XLSX.utils.book_new();
     const ws = XLSX.utils.aoa_to_sheet(data);
     
     // basic width
     ws['!cols'] = [
        { wch: 5 }, { wch: 15 }, { wch: 50 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }
     ];

     XLSX.utils.book_append_sheet(wb, ws, "Tien_Do_Cong_Viec");
     XLSX.writeFile(wb, "Tien_Do_Cong_Viec.xlsx");
  };

  return (
    <div className="space-y-8 pb-12">
       
      {/* Search and Refresh Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
         <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
               type="text" 
               placeholder="Tìm kiếm nội dung công việc hoặc người nhận..." 
               value={searchText}
               onChange={(e) => setSearchText(e.target.value)}
               className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
            />
            {searchText && (
               <button onClick={() => setSearchText('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <XCircle className="w-5 h-5" />
               </button>
            )}
         </div>
         <button
            onClick={fetchProgress}
            disabled={isRefreshing}
            className="px-6 py-3 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 transition-all font-bold text-sm shadow-sm disabled:opacity-50 min-w-[140px]"
         >
            {isRefreshing ? 'ĐANG TẢI...' : '⟳ LÀM MỚI'}
         </button>
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] gap-4">
         <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
            <div className="bg-amber-100 text-amber-600 p-2 rounded-xl">
               <Clock className="w-5 h-5" />
            </div>
            Quản lý tiến độ công việc
         </h2>
         <div className="flex flex-wrap items-center gap-3">
             <button 
               onClick={exportExcel}
               className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 font-bold text-xs hover:bg-emerald-100 rounded-xl transition-all tracking-wide flex items-center gap-2 shadow-sm"
             >
               <FileSpreadsheet className="w-4 h-4" /> XUẤT EXCEL
             </button>
             {isDoiTruong && (
                 <button 
                   onClick={() => setShowForm(!showForm)}
                   className="bg-blue-600 text-white px-5 py-2 font-bold text-xs hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/30 flex items-center gap-2"
                 >
                   <Plus className="w-4 h-4" /> THÊM CÔNG VIỆC
                 </button>
             )}
         </div>
      </div>

      {showForm && (
         <div className="bg-white border text-slate-700 border-slate-200 rounded-2xl p-6 md:p-8 shadow-xl shadow-slate-200/50 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <h3 className="font-bold uppercase tracking-wider mb-6 text-slate-800 flex justify-between items-center">
               Nhập Công Việc Mới
            </h3>
            <form onSubmit={handleAddTask} className="space-y-5">
               <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5 p-0.5">Nội dung công việc</label>
                  <div className="relative group">
                      <textarea 
                         required
                         value={newContent}
                         onChange={e => setNewContent(e.target.value)}
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 min-h-[100px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all hover:bg-white resize-y shadow-sm"
                         placeholder="Ví dụ: Lập báo cáo..."
                      />
                      <button
                         type="button"
                         onClick={toggleRecording}
                         className={`absolute right-3 bottom-4 p-2.5 rounded-full transition-all shadow-sm ${isRecording ? 'bg-red-50 text-red-600 animate-pulse ring-2 ring-red-500/30' : 'bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200'}`}
                         title="Nhập bằng giọng nói"
                      >
                         <Mic className="w-4 h-4" />
                      </button>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                     <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5 p-0.5">Căn cứ</label>
                     <input 
                        type="text"
                        value={newRef}
                        onChange={e => setNewRef(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all hover:bg-white shadow-sm"
                        placeholder="Số CV..."
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5 p-0.5">Ngày hoàn tất</label>
                     <input 
                        type="date"
                        required
                        value={newDeadline}
                        onChange={e => setNewDeadline(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all hover:bg-white shadow-sm"
                     />
                  </div>
               </div>
               
               <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5 p-0.5">Phân công</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl transition-all focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 focus-within:bg-white shadow-sm relative overflow-hidden group">
                     <UserIcon className="w-4 h-4 ml-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                     <input 
                        type="text"
                        value={newAssignee}
                        onChange={e => { setNewAssignee(e.target.value); setSearchAssignee(e.target.value); }}
                        className="w-full p-3 font-medium text-slate-700 focus:outline-none bg-transparent"
                        placeholder="Nhập tên người nhận việc..."
                     />
                  </div>
                  {searchAssignee && newAssignee === searchAssignee && filteredMembers.length > 0 && (
                     <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl max-h-48 overflow-y-auto shadow-xl shadow-slate-200/50">
                        {filteredMembers.map(m => (
                           <div 
                              key={m} 
                              className="px-5 py-3 hover:bg-blue-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0 transition-colors text-slate-700"
                              onClick={() => { setNewAssignee(m); setSearchAssignee(''); }}
                           >
                              {m}
                           </div>
                        ))}
                     </div>
                  )}
               </div>

               <div className="flex justify-end pt-4 gap-3">
                  <button type="button" onClick={handleCancel} className="bg-white border border-slate-200 text-slate-600 font-bold px-6 py-3 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm">
                     HỦY
                  </button>
                  <button type="submit" className="bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/30">
                     LƯU CÔNG VIỆC
                  </button>
               </div>
            </form>
         </div>
      )}

      <div>
         <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <button 
               onClick={() => setIsPendingExpanded(!isPendingExpanded)}
               className="font-bold text-lg flex items-center gap-2 text-slate-800 hover:text-blue-600 transition-colors cursor-pointer text-left focus:outline-none"
            >
               {isPendingExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
               <AlertCircle className="w-5 h-5 text-amber-500" />
               ĐANG THỰC HIỆN <span className="bg-amber-100 text-amber-700 font-black px-2 py-0.5 rounded-full text-sm">{pendingTasks.length}</span>
            </button>
            
            <div className="flex flex-wrap items-center gap-3">
               <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200/50 shadow-sm text-xs font-bold text-slate-600">
                  <label className={`flex items-center gap-1.5 cursor-pointer hover:${theme.status.ok.text}`}>
                     <input type="checkbox" checked={filterState.ok} onChange={e => setFilterState(s => ({...s, ok: e.target.checked}))} className="rounded cursor-pointer" />
                     Còn hạn
                  </label>
                  <label className={`flex items-center gap-1.5 cursor-pointer hover:${theme.status.near.text}`}>
                     <input type="checkbox" checked={filterState.warning} onChange={e => setFilterState(s => ({...s, warning: e.target.checked}))} className="rounded cursor-pointer" />
                     Sắp đến hạn
                  </label>
                  <label className={`flex items-center gap-1.5 cursor-pointer hover:${theme.status.overdue.text}`}>
                     <input type="checkbox" checked={filterState.overdue} onChange={e => setFilterState(s => ({...s, overdue: e.target.checked}))} className="rounded cursor-pointer" />
                     Quá hạn
                  </label>
               </div>

               <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                  <button 
                     onClick={() => setPendingViewMode('grid')}
                     className={`p-2 rounded-lg transition-all ${pendingViewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                     title="Dạng thẻ"
                  ><LayoutGrid className="w-4 h-4" /></button>
                  <button 
                     onClick={() => setPendingViewMode('table')}
                     className={`p-2 rounded-lg transition-all ${pendingViewMode === 'table' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                     title="Dạng bảng"
                  ><List className="w-4 h-4" /></button>
               </div>
            </div>
         </div>
         
         {isPendingExpanded && (
           <>
             {pendingViewMode === 'grid' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sortedPendingTasks.map((t, idx) => {
                       const colorClasses = getStatusColor(t.deadline);
                   return (
                      <div key={`${t.id || 't'}-${idx}`} className={`p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all ${colorClasses}`}>
                         <div>
                            <div className="flex justify-between items-start mb-3">
                               <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white shadow-sm border border-slate-700">#{idx + 1}</span>
                                  {getStatusBadge(t.deadline)}
                               </div>
                               {isDoiTruong && (
                                   <button 
                                     onClick={() => handleComplete(t.id)}
                                     title="Đánh dấu hoàn tất"
                                     className="text-current opacity-60 hover:opacity-100 bg-white/60 hover:bg-white hover:scale-110 rounded-full p-1.5 transition-all shadow-sm cursor-pointer"
                                   >
                                      <CheckCircle className="w-5 h-5" />
                                   </button>
                               )}
                            </div>
                            <h4 className="font-bold text-base mb-1.5 leading-snug">{t.content}</h4>
                            {t.reference && (
                               <div className="text-[11px] font-medium opacity-80 mb-2 line-clamp-2" title={t.reference}>
                                  {t.reference}
                               </div>
                            )}
                            {t.explanation && (
                               <div className="mt-3 text-[11px] font-medium space-y-1 bg-white/50 p-2.5 rounded-lg border border-current/10 shadow-inner">
                                  {t.explanation.split('\n').map((line, i) => (
                                      <div key={i} className="leading-relaxed opacity-90">{line}</div>
                                  ))}
                               </div>
                            )}
                         </div>
                         <div className="mt-4 pt-3 border-t border-current/10">
                            {editingExpId === t.id ? (
                               <div className="flex flex-col gap-2 bg-white/60 p-2.5 rounded-xl shadow-sm border border-current/10">
                                  <textarea 
                                     autoFocus
                                     value={expInput}
                                     onChange={e => setExpInput(e.target.value)}
                                     placeholder="Nhập nội dung giải trình..."
                                     className="w-full text-xs p-2 rounded-lg focus:outline-none resize-none bg-white font-medium shadow-inner"
                                     rows={2}
                                  />
                                  <div className="flex justify-end gap-2">
                                     <button onClick={() => setEditingExpId(null)} className="text-[10px] font-bold uppercase opacity-60 hover:opacity-100 px-3 py-1.5">Hủy</button>
                                     <button onClick={() => handleSaveExplanation(t.id)} className="text-[11px] font-bold uppercase bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5">
                                        <Send className="w-3.5 h-3.5" /> Lưu
                                     </button>
                                  </div>
                               </div>
                            ) : (
                               <div className="flex justify-between items-center text-[11px] font-bold">
                                  <div className="flex items-center gap-1.5 opacity-80 truncate max-w-[120px]" title={t.assignee}>
                                     <UserIcon className="w-3.5 h-3.5" />
                                     {t.assignee || 'Chưa phân công'}
                                  </div>
                                  <div className="flex items-center gap-3">
                                     {isManagement && (
                                         <button 
                                            onClick={() => { setEditingExpId(t.id); setExpInput(''); }} 
                                            className="opacity-70 hover:opacity-100 flex items-center gap-1 bg-white/50 px-2 py-1 rounded-md transition-all hover:bg-white shadow-sm"
                                            title="Cập nhật giải trình"
                                         >
                                            <MessageSquarePlus className="w-3.5 h-3.5" /> Giải trình
                                         </button>
                                     )}
                                     <div className="opacity-90 tracking-wide font-mono bg-white/40 px-2 py-1 rounded-md shadow-sm">
                                        Hạn: {t.deadline}
                                     </div>
                                  </div>
                               </div>
                            )}
                         </div>
                      </div>
                   );
                })}
             </div>
         ) : (
             <div className="overflow-x-auto bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200">
                <table className="w-full text-left text-sm whitespace-nowrap">
                   <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[11px] font-bold tracking-wider text-slate-500">
                      <tr>
                         <th className="px-5 py-4 text-center">STT</th>
                         <th className="px-5 py-4">Trạng thái</th>
                         <th className="px-5 py-4">Nội dung</th>
                         <th className="px-5 py-4">Căn cứ</th>
                         <th className="px-5 py-4">Phân công</th>
                         <th className="px-5 py-4 text-center">Tác vụ</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {sortedPendingTasks.length === 0 ? (
                         <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500 font-medium">Không có công việc nào cần xử lý.</td></tr>
                      ) : sortedPendingTasks.map((t, idx) => (
                         <tr key={`${t.id || 't'}-${idx}`} className="hover:bg-blue-50/50 transition-colors">
                            <td className="px-5 py-4 font-mono text-[11px] font-bold text-slate-400 text-center">{idx + 1}</td>
                            <td className="px-4 py-3">{getStatusBadge(t.deadline)}</td>
                            <td className="px-4 py-3 min-w-[200px]">
                               <div className="font-medium whitespace-normal">{t.content}</div>
                               {t.explanation && (
                                  <div className="mt-2 pl-2 border-l-2 border-blue-500 whitespace-normal">
                                      {t.explanation.split('\n').map((line, i) => (
                                          <div key={i} className="text-[10px] text-slate-600 font-medium">{line}</div>
                                      ))}
                                  </div>
                               )}
                               {editingExpId === t.id && (
                                   <div className="flex flex-col gap-2 mt-2 bg-slate-50 border p-2 rounded">
                                      <textarea 
                                         autoFocus
                                         value={expInput}
                                         onChange={e => setExpInput(e.target.value)}
                                         placeholder="Nhập nội dung giải trình..."
                                         className="w-full text-xs p-1.5 focus:outline-none resize-none bg-white"
                                         rows={2}
                                      />
                                      <div className="flex justify-start gap-2">
                                         <button onClick={() => setEditingExpId(null)} className="text-[10px] font-bold uppercase opacity-60 hover:opacity-100">Hủy</button>
                                         <button onClick={() => handleSaveExplanation(t.id)} className="text-[10px] font-bold uppercase bg-blue-600 text-white px-2 py-1 rounded shadow hover:bg-blue-700 flex items-center gap-1">
                                            <Send className="w-3 h-3" /> Lưu
                                         </button>
                                      </div>
                                   </div>
                               )}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs opacity-70 whitespace-normal max-w-[150px]">
                               {t.reference}
                            </td>
                            <td className="px-4 py-3 whitespace-normal">
                               {t.assignee}
                            </td>
                            <td className="px-4 py-3 text-center space-y-2">
                               {isDoiTruong && (
                                   <button onClick={() => handleComplete(t.id)} title="Đánh dấu hoàn tất" className="w-full justify-center inline-flex items-center gap-1 bg-slate-100/50 hover:bg-green-100 text-slate-500 hover:text-green-800 px-2 py-1.5 text-[10px] font-bold uppercase rounded-sm border border-slate-200 hover:border-green-400 transition-colors cursor-pointer">
                                      <CheckCircle className="w-3 h-3" />
                                      Hoàn tất
                                   </button>
                               )}
                               {isManagement && (
                                   <button onClick={() => { setEditingExpId(t.id); setExpInput(''); }} title="Cập nhật giải trình" className="w-full justify-center inline-flex items-center gap-1 bg-slate-100/50 hover:bg-blue-100 text-slate-500 hover:text-blue-800 px-2 py-1.5 text-[10px] font-bold uppercase rounded-sm border border-slate-200 hover:border-blue-400 transition-colors cursor-pointer">
                                      <MessageSquarePlus className="w-3 h-3" />
                                      Giải trình
                                   </button>
                               )}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
         )}
           </>
         )}
      </div>

      <div className="w-full h-px bg-slate-200 my-8"></div>

      <div>
         <button 
             onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
             className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800 hover:text-blue-600 transition-colors cursor-pointer text-left focus:outline-none"
         >
            {isCompletedExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            ĐÃ HOÀN TẤT <span className="bg-emerald-100 text-emerald-700 font-black px-2 py-0.5 rounded-full text-sm">{completedTasks.length}</span>
         </button>
         
         {isCompletedExpanded && (
           <div className="overflow-x-auto bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200">
            <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[11px] font-bold tracking-wider text-slate-500">
                  <tr>
                     <th className="px-5 py-4 w-10 text-center">STT</th>
                     <th className="px-5 py-4">Nội dung</th>
                     <th className="px-5 py-4">Căn cứ</th>
                     <th className="px-5 py-4">Phân công</th>
                     <th className="px-5 py-4">Hạn chót</th>
                     <th className="px-5 py-4 text-center">Trạng thái</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {completedTasks.length === 0 ? (
                     <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500 font-medium">Chưa có công việc hoàn tất.</td></tr>
                  ) : completedTasks.map((t, idx) => (
                     <tr key={`${t.id || 'tc'}-${idx}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 text-center opacity-50 font-mono text-[11px] font-bold">{idx + 1}</td>
                        <td className="px-5 py-4 font-medium truncate max-w-[250px] opacity-60 line-through" title={t.content}>
                           {t.content}
                        </td>
                        <td className="px-5 py-4 font-mono text-[11px] opacity-50 truncate max-w-[150px]">
                           {t.reference}
                        </td>
                        <td className="px-5 py-4">
                           <div className="inline-flex items-center gap-1.5 opacity-80 text-xs font-semibold bg-slate-100 px-2.5 py-1 rounded-lg">
                              <UserIcon className="w-3.5 h-3.5" />
                              {t.assignee || 'Chưa phân công'}
                           </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-[11px] font-bold opacity-60">
                           {t.deadline}
                        </td>
                        <td className="px-5 py-4 text-center">
                           <button onClick={() => handleRevert(t.id)} title="Đánh dấu chưa hoàn tất" className="inline-flex justify-center items-center gap-1 bg-emerald-50 hover:bg-red-50 text-emerald-600 hover:text-red-600 px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg border border-emerald-200 hover:border-red-200 shadow-sm transition-all cursor-pointer group">
                              <CheckCircle className="w-3.5 h-3.5 group-hover:hidden" />
                              <XCircle className="w-3.5 h-3.5 hidden group-hover:block" />
                              <span className="group-hover:hidden">Đã xong</span>
                              <span className="hidden group-hover:inline">Hủy xong</span>
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         )}
      </div>

    </div>
  );
}
