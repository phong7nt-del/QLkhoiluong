import React, { useState, useMemo } from 'react';
import { DataStore, TaskProgress, SheetMember } from '../store/DataStore';
import { CheckCircle, Clock, AlertCircle, Plus, User as UserIcon, Mic, XCircle, LayoutGrid, List, FileSpreadsheet, MessageSquarePlus, Send } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ProgressTab({ refreshToggle, sessionUser }: { refreshToggle: number, sessionUser: SheetMember | null }) {
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
  const recognitionRef = React.useRef<any>(null);

  // Explanation state
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [expInput, setExpInput] = useState('');

  const roleStr = sessionUser?.role ? sessionUser.role.toLowerCase() : '';
  const isDoiTruong = roleStr.includes('đội trưởng');
  const isManagement = ['đội trưởng', 'đội phó', 'tổ trưởng', 'tổ phó'].some(r => roleStr.includes(r));
  
  React.useEffect(() => {
     setTasks(DataStore.getTasks());
     const mems = DataStore.getMembers().map(m => m.name).filter(Boolean);
     setMembers(Array.from(new Set(mems)));
  }, [refreshToggle]);

  const handleComplete = (id: string) => {
     DataStore.updateTaskStatus(id, 'xong');
     setTasks(DataStore.getTasks());
  };

  const handleSaveExplanation = (id: string) => {
     if (!expInput.trim()) return;
     DataStore.updateTaskExplanation(id, expInput.trim());
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
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
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

  const pendingTasks = tasks.filter(t => t.status.toLowerCase() !== 'xong');
  const completedTasks = tasks.filter(t => t.status.toLowerCase() === 'xong');

  const getStatusColor = (deadlineStr: string) => {
     const dDate = parseDate(deadlineStr);
     if (!dDate) return 'bg-red-50 border-red-400 shadow-[2px_2px_0_theme(colors.red.400)] text-red-900';
     const diffTime = dDate.getTime() - today.getTime();
     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
     if (diffDays > 3) return 'bg-green-50 border-green-400 shadow-[2px_2px_0_theme(colors.green.400)] text-green-900';
     if (diffDays >= 1 && diffDays <= 3) return 'bg-yellow-50 border-yellow-400 shadow-[2px_2px_0_theme(colors.yellow.400)] text-yellow-900';
     return 'bg-red-50 border-red-400 shadow-[2px_2px_0_theme(colors.red.400)] text-red-900';
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
     if (!dDate) return <span className="bg-red-100 text-red-800 px-2 py-0.5text-[10px] font-bold uppercase">Quá hạn / Lỗi ngày</span>;
     const diffTime = dDate.getTime() - today.getTime();
     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
     if (diffDays > 3) return <span className="bg-green-200 text-green-900 px-2 py-0.5 text-[10px] font-bold uppercase">Còn {diffDays} ngày</span>;
     if (diffDays >= 1 && diffDays <= 3) return <span className="bg-yellow-200 text-yellow-900 px-2 py-0.5 text-[10px] font-bold uppercase">Gần hạn ({diffDays} ngày)</span>;
     if (diffDays === 0) return <span className="bg-red-200 text-red-900 px-2 py-0.5 text-[10px] font-bold uppercase">Hôm nay</span>;
     return <span className="bg-red-200 text-red-900 px-2 py-0.5 text-[10px] font-bold uppercase">Quá hạn {Math.abs(diffDays)} ngày</span>;
  };

  const filteredMembers = members.filter(m => m.toLowerCase().includes(searchAssignee.toLowerCase()));

  const getDiffDays = (deadlineStr: string) => {
     const dDate = parseDate(deadlineStr);
     if (!dDate) return -99999; // Lỗi ngày -> đẩy lên đầu
     const diffTime = dDate.getTime() - today.getTime();
     return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const sortedPendingTasks = [...pendingTasks].sort((a, b) => {
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-[#141414] text-white p-4 shadow-[4px_4px_0_rgba(20,20,20,0.2)] gap-4">
         <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quản lý tiến độ công việc
         </h2>
         <div className="flex flex-wrap items-center gap-3">
             <button 
               onClick={exportExcel}
               className="bg-green-600 text-white px-4 py-2 font-bold text-sm hover:bg-green-500 transition tracking-wide flex items-center gap-2 shadow-[2px_2px_0_#fff]"
             >
               <FileSpreadsheet className="w-4 h-4" /> XUẤT EXCEL
             </button>
             {isDoiTruong && (
                 <button 
                   onClick={() => setShowForm(!showForm)}
                   className="bg-white text-[#141414] px-4 py-2 font-bold text-sm hover:bg-gray-200 transition tracking-wide flex items-center gap-2"
                 >
                   <Plus className="w-4 h-4" /> THÊM CÔNG VIỆC
                 </button>
             )}
         </div>
      </div>

      {showForm && (
         <div className="bg-white border-2 border-[#141414] p-6 shadow-[8px_8px_0_#141414] animate-in fade-in slide-in-from-top-4">
            <h3 className="font-bold uppercase tracking-widest mb-4 border-b-2 border-[#141414] pb-2">Nhập Công Việc Mới</h3>
            <form onSubmit={handleAddTask} className="space-y-4">
               <div>
                  <label className="block text-xs font-bold uppercase tracking-wide opacity-70 mb-1">Nội dung công việc</label>
                  <div className="relative">
                      <textarea 
                         required
                         value={newContent}
                         onChange={e => setNewContent(e.target.value)}
                         className="w-full border-2 border-[#141414] p-3 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 min-h-[80px]"
                         placeholder="Ví dụ: Lập báo cáo..."
                      />
                      <button
                         type="button"
                         onClick={toggleRecording}
                         className={`absolute right-2 top-2 p-2 rounded-full transition-colors ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                         title="Nhập bằng giọng nói"
                      >
                         <Mic className="w-4 h-4" />
                      </button>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold uppercase tracking-wide opacity-70 mb-1">Căn cứ</label>
                     <input 
                        type="text"
                        value={newRef}
                        onChange={e => setNewRef(e.target.value)}
                        className="w-full border-2 border-[#141414] p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                        placeholder="Số CV..."
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold uppercase tracking-wide opacity-70 mb-1">Ngày hoàn tất</label>
                     <input 
                        type="date"
                        required
                        value={newDeadline}
                        onChange={e => setNewDeadline(e.target.value)}
                        className="w-full border-2 border-[#141414] p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                     />
                  </div>
               </div>
               
               <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-wide opacity-70 mb-1">Phân công</label>
                  <div className="flex items-center border-2 border-[#141414] bg-slate-50 relative">
                     <UserIcon className="w-4 h-4 ml-3 opacity-50" />
                     <input 
                        type="text"
                        value={newAssignee}
                        onChange={e => { setNewAssignee(e.target.value); setSearchAssignee(e.target.value); }}
                        className="w-full p-3 text-sm font-medium focus:outline-none bg-transparent"
                        placeholder="Nhập tên người nhận việc..."
                     />
                  </div>
                  {searchAssignee && newAssignee === searchAssignee && filteredMembers.length > 0 && (
                     <div className="absolute z-10 w-full mt-1 bg-white border-2 border-[#141414] max-h-40 overflow-y-auto shadow-[4px_4px_0_#141414]">
                        {filteredMembers.map(m => (
                           <div 
                              key={m} 
                              className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-sm font-medium border-b border-[#141414]/10 last:border-0"
                              onClick={() => { setNewAssignee(m); setSearchAssignee(''); }}
                           >
                              {m}
                           </div>
                        ))}
                     </div>
                  )}
               </div>

               <div className="flex justify-end pt-2 gap-4">
                  <button type="button" onClick={handleCancel} className="bg-white border-2 border-[#141414] text-[#141414] font-bold uppercase tracking-widest px-6 py-3 hover:bg-gray-100 transition-colors shadow-[2px_2px_0_rgba(20,20,20,0.2)]">
                     HỦY
                  </button>
                  <button type="submit" className="bg-[#141414] text-white font-bold uppercase tracking-widest px-8 py-3 hover:bg-blue-600 transition-colors shadow-[4px_4px_0_rgba(20,20,20,0.2)]">
                     LƯU CÔNG VIỆC
                  </button>
               </div>
            </form>
         </div>
      )}

      <div>
         <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
               <AlertCircle className="w-5 h-5 text-red-600" />
               ĐANG THỰC HIỆN ({pendingTasks.length})
            </h3>
            <div className="flex items-center gap-2">
               <button 
                  onClick={() => setPendingViewMode('grid')}
                  className={`p-2 border-2 border-[#141414] transition-colors ${pendingViewMode === 'grid' ? 'bg-[#141414] text-white' : 'bg-white hover:bg-slate-100'}`}
                  title="Dạng thẻ"
               ><LayoutGrid className="w-4 h-4" /></button>
               <button 
                  onClick={() => setPendingViewMode('table')}
                  className={`p-2 border-2 border-[#141414] transition-colors ${pendingViewMode === 'table' ? 'bg-[#141414] text-white' : 'bg-white hover:bg-slate-100'}`}
                  title="Dạng bảng"
               ><List className="w-4 h-4" /></button>
            </div>
         </div>
         
         {pendingViewMode === 'grid' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {sortedPendingTasks.map((t, idx) => {
                   const colorClasses = getStatusColor(t.deadline);
                   return (
                      <div key={t.id || idx} className={`border border-[#141414] p-3 flex flex-col justify-between ${colorClasses}`}>
                         <div>
                            <div className="flex justify-between items-start mb-2">
                               <div className="flex items-center gap-2">
                                  {getStatusBadge(t.deadline)}
                               </div>
                               {isDoiTruong && (
                                   <button 
                                     onClick={() => handleComplete(t.id)}
                                     title="Đánh dấu hoàn tất"
                                     className="text-current opacity-60 hover:opacity-100 bg-white/50 hover:bg-white rounded p-1 transition border-none cursor-pointer"
                                   >
                                      <CheckCircle className="w-5 h-5" />
                                   </button>
                               )}
                            </div>
                            <h4 className="font-bold text-sm mb-1 leading-tight">{t.content}</h4>
                            {t.reference && (
                               <div className="text-[10px] font-mono opacity-80 mb-1 truncate" title={t.reference}>
                                  {t.reference}
                               </div>
                            )}
                            {t.explanation && (
                               <div className="mt-2 text-xs font-medium space-y-1 bg-white/40 p-2 rounded border border-current/10">
                                  {t.explanation.split('\n').map((line, i) => (
                                      <div key={i} className="text-[10px] leading-tight opacity-90">{line}</div>
                                  ))}
                               </div>
                            )}
                         </div>
                         <div className="mt-3">
                            {editingExpId === t.id ? (
                               <div className="flex flex-col gap-2 mt-2 border border-current/20 p-2 bg-white/50 rounded">
                                  <textarea 
                                     autoFocus
                                     value={expInput}
                                     onChange={e => setExpInput(e.target.value)}
                                     placeholder="Nhập nội dung giải trình..."
                                     className="w-full text-xs p-1.5 focus:outline-none resize-none bg-transparent"
                                     rows={2}
                                  />
                                  <div className="flex justify-end gap-2">
                                     <button onClick={() => setEditingExpId(null)} className="text-[10px] font-bold uppercase opacity-60 hover:opacity-100">Hủy</button>
                                     <button onClick={() => handleSaveExplanation(t.id)} className="text-[10px] font-bold uppercase bg-blue-600 text-white px-2 py-1 rounded shadow hover:bg-blue-700 flex items-center gap-1">
                                        <Send className="w-3 h-3" /> Lưu
                                     </button>
                                  </div>
                               </div>
                            ) : (
                               <div className="pt-2 border-t border-current/20 flex justify-between items-center text-[10px] font-bold">
                                  <div className="opacity-80 truncate max-w-[100px]" title={t.assignee}>
                                     {t.assignee || 'Chưa phân công'}
                                  </div>
                                  <div className="flex items-center gap-3">
                                     {isManagement && (
                                         <button 
                                            onClick={() => { setEditingExpId(t.id); setExpInput(''); }} 
                                            className="opacity-70 hover:opacity-100 flex items-center gap-1"
                                            title="Cập nhật giải trình"
                                         >
                                            <MessageSquarePlus className="w-3 h-3" /> GT
                                         </button>
                                     )}
                                     <div className="opacity-90 tracking-wide">
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
             <div className="overflow-x-auto border border-[#141414] bg-white shadow-[4px_4px_0_#141414]">
                <table className="w-full text-left text-sm whitespace-nowrap">
                   <thead className="bg-[#141414]/5 border-b border-[#141414] uppercase text-[10px] font-bold tracking-wider">
                      <tr>
                         <th className="px-4 py-3 text-center">STT</th>
                         <th className="px-4 py-3">Trạng thái</th>
                         <th className="px-4 py-3">Nội dung</th>
                         <th className="px-4 py-3">Căn cứ</th>
                         <th className="px-4 py-3">Phân công</th>
                         <th className="px-4 py-3 text-center">Tác vụ</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-[#141414]/10">
                      {sortedPendingTasks.length === 0 ? (
                         <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">Không có công việc nào.</td></tr>
                      ) : sortedPendingTasks.map((t, idx) => (
                         <tr key={t.id || idx} className="hover:bg-[#141414]/5 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs opacity-50 text-center">{idx + 1}</td>
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
      </div>

      <div className="w-full h-px bg-[#141414]/10 my-8"></div>

      <div>
         <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            ĐÃ HOÀN TẤT ({completedTasks.length})
         </h3>
         
         <div className="overflow-x-auto border border-[#141414] bg-white shadow-[4px_4px_0_#141414]">
            <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-[#141414]/5 border-b border-[#141414] uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                     <th className="px-4 py-3 w-10 text-center">STT</th>
                     <th className="px-4 py-3">Nội dung</th>
                     <th className="px-4 py-3">Căn cứ</th>
                     <th className="px-4 py-3">Phân công</th>
                     <th className="px-4 py-3">Hạn chót</th>
                     <th className="px-4 py-3 text-center">Trạng thái</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[#141414]/10">
                  {completedTasks.length === 0 ? (
                     <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">Chưa có công việc hoàn tất.</td></tr>
                  ) : completedTasks.map((t, idx) => (
                     <tr key={t.id || idx} className="hover:bg-[#141414]/5 transition-colors">
                        <td className="px-4 py-3 text-center opacity-50 font-mono text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium truncate max-w-[250px]" title={t.content}>
                           {t.content}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs opacity-70 truncate max-w-[150px]">
                           {t.reference}
                        </td>
                        <td className="px-4 py-3">
                           {t.assignee}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                           {t.deadline}
                        </td>
                        <td className="px-4 py-3 text-center">
                           <button onClick={() => handleRevert(t.id)} title="Đánh dấu chưa hoàn tất" className="inline-flex items-center gap-1 bg-green-100 hover:bg-red-100 text-green-800 hover:text-red-800 px-2 py-1 text-[10px] font-bold uppercase rounded-sm border border-transparent hover:border-red-300 transition-colors cursor-pointer group">
                              <CheckCircle className="w-3 h-3 group-hover:hidden" />
                              <XCircle className="w-3 h-3 hidden group-hover:block" />
                              <span className="group-hover:hidden">Xong</span>
                              <span className="hidden group-hover:inline">Hủy Xong</span>
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

    </div>
  );
}
