import React, { useState, useEffect, useRef } from 'react';
import { DataStore, SheetMember } from '../store/DataStore';
import { PermissionStore } from '../store/PermissionStore';
import { PlusCircle, Search, CheckSquare, Square, Mic, ClipboardList, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function WorkloadForm({ onSaved, refreshToggle, isManagement }: { onSaved: () => void, refreshToggle: number, isManagement?: boolean }) {
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [allSheetMembers, setAllSheetMembers] = useState<SheetMember[]>([]);
  const [dinhMucList, setDinhMucList] = useState<{name: string, quota: number}[]>([]);
  
  const [team, setTeam] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [memberInput, setMemberInput] = useState('');
  const [phatHien, setPhatHien] = useState('không có');
  const [isRecordingPhatHien, setIsRecordingPhatHien] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isSmartRecording, setIsSmartRecording] = useState(false);
  const smartRecognitionRef = useRef<any>(null);
  const smartInitialState = useRef<{
     selectedTasks: Record<string, {selected: boolean, quantity: number | string}>;
     members: string[];
     phatHien: string;
     team: string;
  }>({ selectedTasks: {}, members: [], phatHien: 'không có', team: '' });

  const recognitionTimeoutRef = useRef<any>(null);

  const clearVoiceTimeout = () => {
    if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
    }
  };
  
  const [selectedTasks, setSelectedTasks] = useState<Record<string, {selected: boolean, quantity: number | string}>>({});
  const [taskSearch, setTaskSearch] = useState('');
  
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [filteredMembers, setFilteredMembers] = useState<string[]>([]);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [sessionUser, setSessionUser] = useState<SheetMember | null>(null);
  
  useEffect(() => {
    const stored = sessionStorage.getItem('workload_user_session');
    if (stored) {
       try { setSessionUser(JSON.parse(stored)); } catch(e){}
    }
  }, []);
  
  const isDeleteAllowed = () => {
      if (!sessionUser) return false;
      const roleStr = sessionUser.role ? sessionUser.role.toLowerCase() : '';
      // isManagement logic replaced with PermissionStore check
      const canEditOthers = PermissionStore.hasActionAccess('edit_others_workload', roleStr);
            
      if (canEditOthers) return true;
      return false;
  };
  
  const [membersToDelete, setMembersToDelete] = useState<string[]>([]);
  const triggerDeleteConfirm = () => {
      if (members.length === 0) {
          setMessage({ type: 'error', text: "Bạn phải chọn 1 thành viên để xóa báo cáo."});
          return;
      }
      if (members.length >= 2) {
          setMessage({ type: 'error', text: "Vui lòng chỉ chọn 1 thành viên để xóa. Hệ thống sẽ tự động tìm và xóa cả nhóm nếu làm chung." });
          return;
      }
      
      const targetMember = members[0];
      const existingEntries = DataStore.getEntries();
      const dateEntries = existingEntries.filter(e => e.date === date);
      
      const memberEntry = dateEntries.find(e => e.members.includes(targetMember));
      let groupToDelete = [targetMember];
      
      if (memberEntry && memberEntry.content) {
          const lines = memberEntry.content.split('\n');
          const lastLine = lines[lines.length - 1].trim();
          if (/^\d+$/.test(lastLine)) {
              const groupId = lastLine;
              // Only group them if groupId is strictly greater than 0
              if (parseInt(groupId, 10) > 0) {
                  groupToDelete = [];
                  dateEntries.forEach(e => {
                      const elines = e.content.split('\n');
                      if (elines[elines.length - 1].trim() === groupId) {
                          groupToDelete.push(...e.members);
                      }
                  });
                  groupToDelete = [...new Set(groupToDelete)];
              }
          }
      }
      
      setMembersToDelete(groupToDelete);
      setShowDeleteConfirm(true);
  };

  const executeDeleteGroup = async () => {
      setShowDeleteConfirm(false);
      setIsSubmitting(true);
      setMessage(null);
      try {
          const res = await DataStore.deleteWorkloadGroup({ date, members: membersToDelete });
          if (res && res.status === 'success') {
              setMessage({ type: 'success', text: "Đã xóa báo cáo nhóm thành công!" });
              setMembers([]); // reset
              onSaved();
          } else if (res && res.reason === 'date_not_found') {
              setMessage({ type: 'error', text: "Không tìm thấy cột ngày tương ứng trong file Google Sheets (" + date.split('-').reverse().join('/') + ")" });
          } else if (res && res.reason === 'html_response') {
              setMessage({ type: 'error', text: "Mã App Script chưa được cập nhật phiên bản mới nhất! Hãy vào Cài đặt -> Copy mã mới -> Dán vào App Script và bấm [Deploy -> New version]." });
          } else {
              setMessage({ type: 'error', text: "Lỗi từ server: " + (res?.text || JSON.stringify(res)) });
          }
      } catch (e) {
          setMessage({ type: 'error', text: "Lỗi hệ thống khi xóa báo cáo: " + e.message });
      } finally {
          setIsSubmitting(false);
      }
  };

  useEffect(() => {
    const teams = DataStore.getTeams();
    const sm = DataStore.getMembers();
    const dm = DataStore.getDinhMuc();
    setAvailableTeams(['Đội', ...teams.filter(t => t !== 'Đội')]);
    setAllSheetMembers(sm);
    setDinhMucList(dm);
    
    // Initialize task selection state
    const tTasks: Record<string, {selected: boolean, quantity: number | string}> = {};
    dm.forEach(item => {
        tTasks[item.name] = { selected: false, quantity: item.quota || 1 };
    });
    setSelectedTasks(tTasks);
  }, [refreshToggle]);

  useEffect(() => {
    const excludedRoles = ["tổ trưởng", "đội phó", "phó phòng", "đội trưởng", "trưởng phòng", "phó giám đốc", "giám đốc"]
      .map(r => r.normalize('NFC').toLowerCase().replace(/\s+/g, ''));
      
    const filterValidRoles = (m: any) => {
        const role = (m.role || '').normalize('NFC').toLowerCase().replace(/\s+/g, '');
        return !excludedRoles.includes(role);
    };

    if (memberInput.length > 0) {
      const lowerReq = memberInput.toLowerCase();
      setFilteredMembers(
        allSheetMembers
          .filter(filterValidRoles)
          .map(m => m.name)
          .filter(m => m.toLowerCase().includes(lowerReq) && !members.includes(m))
      );
    } else {
      const pool = (team && members.length === 0) ? allSheetMembers.filter(m => m.team === team) : allSheetMembers;
      setFilteredMembers(pool.filter(filterValidRoles).map(m => m.name).filter(m => !members.includes(m)));
    }
  }, [memberInput, team, allSheetMembers, members]);

  
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);
  const handlePlanSubmit = async () => {
    const entries = Object.entries(selectedTasks) as [string, {selected: boolean, quantity: number | string}][];
    const selectedList = entries.filter(([_, data]: [string, any]) => data.selected && Number(data.quantity) > 0).map(([name, data]: [string, any]) => ({name, quantity: Number(data.quantity)}));
    
    if (!team) {
      setMessage({ type: 'error', text: "Vui lòng chọn Đội hoặc Tổ công tác để lưu kế hoạch" });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    if (selectedList.length === 0) {
      setMessage({ type: 'error', text: "Vui lòng chọn ít nhất 1 nội dung để lập kế hoạch" });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    if (!date) {
      setMessage({ type: 'error', text: "Vui lòng chọn ngày để lấy thông tin Tháng/Năm" });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    const d = new Date(date);
    let prefix = "Tháng";
    if (team === 'Đội') prefix = "D -";
    else if (team.includes("Phú Mỹ")) prefix = "P -";
    else if (team.includes("Bà Rịa") || team.includes("Bà Ria")) prefix = "B -";
    else if (team.includes("Vũng Tàu")) prefix = "V -";
    const monthYear = `${prefix} ${d.getMonth() + 1}/${d.getFullYear()}`;
    
    // Check if plan already exists for this team and month
    const existingPlan = dinhMucList.some(dm => dm.history && dm.history[monthYear] !== undefined && dm.history[monthYear] > 0);
    if (existingPlan) {
      setMessage({ type: 'error', text: `Kế hoạch cho ${team} trong tháng ${d.getMonth() + 1}/${d.getFullYear()} đã tồn tại.` });
      setTimeout(() => setMessage(null), 5000);
      return;
    }
    
    // window.confirm blocked in iframe

    setIsSubmittingPlan(true);
    const success = await DataStore.syncPlanToSheet(monthYear, selectedList);
    if (success) {
       await DataStore.syncMasterData(); // Refresh to get newly added plan data
    }
    setIsSubmittingPlan(false);

    if (success) {
       setMessage({ type: 'success', text: "Đã lưu kế hoạch tháng thành công!" });
       setTimeout(() => setMessage(null), 5000);
       // Reset form
       setTeam('');
       setMembers([]);
       const resetTasks: any = {};
       Object.keys(selectedTasks).forEach(k => {
          resetTasks[k] = { selected: false, quantity: '' };
       });
       setSelectedTasks(resetTasks);
       onSaved();
    } else {
       const isDefault = DataStore.getAppScriptUrl() === 'https://script.google.com/macros/s/AKfycbzpw3SlqJxXYC29qjPRqH8ehfJp764bNvQFUzqIgMW_rMrpitMKvvRvWbbGrP505Sdi/exec';
       if (isDefault) {
           setMessage({ type: 'error', text: "Lỗi: Máy này chưa cấu hình Link App Script mới. Vào phần Cài đặt (bánh răng) để cập nhật Link App Script!" });
       } else {
           setMessage({ type: 'error', text: "Có lỗi xảy ra. Hãy kiểm tra kết nối mạng hoặc đảm bảo Link App Script (trong Cài đặt) đã chính xác." });
       }
       setTimeout(() => setMessage(null), 8000);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hasSelectedTasks = Object.values(selectedTasks).some((data: any) => data.selected && Number(data.quantity) > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const entries = Object.entries(selectedTasks) as [string, {selected: boolean, quantity: number | string}][];
    const selectedList = entries.filter(([_, data]: [string, any]) => data.selected && Number(data.quantity) > 0);
    
    if (!team || members.length === 0 || !date || selectedList.length === 0) {
      setMessage({ type: 'error', text: "Vui lòng điền đầy đủ thông tin nội dung và có ít nhất 1 nội dung được chọn" });
      setTimeout(() => setMessage(null), 5000);
      return;
    }
    
    if (sessionUser && sessionUser.name && !members.includes(sessionUser.name)) {
      setMessage({ type: 'error', text: "Bạn chỉ được phép nhập báo cáo cho chính mình hoặc nhóm mà bạn là thành viên." });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    const existingEntries = DataStore.getEntries();
    // Chỉ chặn nếu các CÁ NHÂN được chọn đã có dữ liệu công việc trong ngày
    const submittedMembers = members.filter(m => {
       return existingEntries.some(e => {
          if (e.date !== date || !e.members.includes(m)) return false;
          return e.isLocal || e.content.includes(': ') || e.content.includes('- ') || e.content.includes('\n');
       });
    });

    if (submittedMembers.length > 0) {
      const formattedDate = date.split('-').reverse().join('/');
      setMessage({ type: 'error', text: `Thành viên ${submittedMembers.join(', ')} đã cập nhật công việc trong ngày ${formattedDate}. Không thể cập nhật thêm.` });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    setIsSubmitting(true);

    const contentLines = selectedList.map(([name, data]) => `${name}: ${(data as any).quantity}`);
    if (phatHien.trim()) {
       contentLines.push(`Phát hiện: ${phatHien.trim()}`);
    }
    
    if (date >= '2026-08-01') {
       if (members.length === 1) {
          contentLines.push('0');
       } else {
          const dateEntries = existingEntries.filter(e => e.date === date);
          // Generate a highly unique 5-digit ID to prevent any collisions between simultaneous inputs
          const uniqueGroupId = Math.floor(Math.random() * 90000 + 10000);
          contentLines.push(uniqueGroupId.toString());
       }
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
      setMessage({ type: 'success', text: "Đã lưu và đồng bộ thành công!" });
      setTimeout(() => setMessage(null), 5000);
    } else {
      setMessage({ type: 'error', text: "Đã lưu cục bộ nhưng đồng bộ thất bại. Vui lòng thử lại sau." });
      setTimeout(() => setMessage(null), 5000);
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
       setMessage({ type: 'error', text: "Trình duyệt không hỗ trợ nhận dạng giọng nói!" });
       setTimeout(() => setMessage(null), 5000);
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
        setPhatHien(baseContent ? `${baseContent} ${currentTranscript}` : currentTranscript);
    };
    recognition.onerror = () => setIsRecordingPhatHien(false);
    recognition.onend = () => setIsRecordingPhatHien(false);
    
    recognition.start();
  };

  const toggleSmartRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
       setMessage({ type: 'error', text: "Trình duyệt không hỗ trợ nhận dạng giọng nói!" });
       setTimeout(() => setMessage(null), 5000);
       return;
    }
    
    if (isSmartRecording && smartRecognitionRef.current) {
        smartRecognitionRef.current.stop();
        setIsSmartRecording(false);
        return;
    }
    
    setMembers([]);
    setMemberInput('');
    setSelectedTasks({});
    setPhatHien('không có');

    smartInitialState.current = {
        selectedTasks: {},
        members: [],
        phatHien: 'không có',
        team
    };
    
    const recognition = new SpeechRecognition();
    smartRecognitionRef.current = recognition;
    recognition.lang = 'vi-VN';
    recognition.interimResults = true;
    recognition.continuous = true;
    
    recognition.onstart = () => setIsSmartRecording(true);
    recognition.onresult = (event: any) => {
        clearVoiceTimeout();
        recognitionTimeoutRef.current = setTimeout(() => {
           recognition.stop();
        }, 3000);

        let text = '';
        for (let i = 0; i < event.results.length; ++i) {
            text += event.results[i][0].transcript + ' ';
        }
        
        let shouldStop = false;
        if (text.trim().toLowerCase().match(/\b(hết|kết thúc)\s*[.,]?\s*$/i)) {
            shouldStop = true;
            text = text.replace(/\b(hết|kết thúc)\s*[.,]?\s*$/i, '');
        }
        
        let currentMembers = [...smartInitialState.current.members];
        let currentPhatHien = smartInitialState.current.phatHien;
        let currentTeam = smartInitialState.current.team;
        
        const textLower = text.toLowerCase();
        
        // Match Họ và tên
        const nameMatch = text.match(/(họ và tên|họ tên|tên)[\s:]+([^-]+?)(công việc|phát hiện|$)/i);
        if (nameMatch) {
           const spokenName = nameMatch[2].replace(/[:,;\.]/g, '').trim().toLowerCase();
           let bestMatch = '';
           let bestMatchCount = 0;
           allSheetMembers.forEach(m => {
              const lowerM = m.name.toLowerCase();
              if (lowerM.includes(spokenName)) {
                 bestMatch = m.name;
              } else {
                 const spokenWords = spokenName.split(/\s+/);
                 let matchCount = 0;
                 spokenWords.forEach(w => {
                     if (w.length > 2 && lowerM.includes(w)) matchCount++;
                 });
                 if (matchCount > bestMatchCount) {
                    bestMatchCount = matchCount;
                    bestMatch = m.name;
                 }
              }
           });
           
           if (bestMatch && !currentMembers.includes(bestMatch)) {
              currentMembers.push(bestMatch);
              const matchedMemberObj = allSheetMembers.find(m => m.name === bestMatch);
              if (matchedMemberObj && matchedMemberObj.team) {
                  currentTeam = matchedMemberObj.team;
              }
           }
        }
        
        // Match Phát hiện
        const phatHienMatch = text.match(/phát hiện[\s:]+(.+)$/i);
        if (phatHienMatch && phatHienMatch[1]) {
           let phText = phatHienMatch[1].trim();
           phText = phText.replace(/\b(hết|kết thúc)\s*[.,]?\s*$/i, '').trim();
           currentPhatHien = phText;
        }
        
        // Match Công việc
        let tasksText = '';
        const cvMatch = text.match(/công việc[\s:]+([\s\S]*?)(phát hiện|$)/i);
        if (cvMatch) {
            tasksText = cvMatch[1].trim();
        } else {
            // Nếu không có chữ Công việc, dùng heuristics như cũ loại phần đầu
            tasksText = text;
            if (nameMatch) {
               tasksText = tasksText.substring(tasksText.indexOf(nameMatch[0]) + nameMatch[0].length);
            }
            if (phatHienMatch) {
               const idx = tasksText.toLowerCase().indexOf('phát hiện');
               if (idx !== -1) tasksText = tasksText.substring(0, idx);
            }
        }
        
        const newSelectedTasks = { ...smartInitialState.current.selectedTasks };
        let tasksTextLower = tasksText.toLowerCase();

        // Convert Vietnamese numbers to digits
        const vnNumbers: any = {
            'mười một': 11, 'mười hai': 12, 'mười ba': 13, 'mười bốn': 14, 'mười lăm': 15, 'mười năm': 15,
            'mười sáu': 16, 'mười bảy': 17, 'mười tám': 18, 'mười chín': 19, 'hai mươi': 20,
            'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'năm': 5, 'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9, 'mười': 10
        };
        const wordsPattern = Object.keys(vnNumbers).join('|');
        tasksTextLower = tasksTextLower
            .replace(new RegExp(`\\b(${wordsPattern})\\s+(rưỡi|phẩy năm|chấm năm)\\b`, 'gi'), (match, p1) => {
                 return vnNumbers[p1.toLowerCase()] + '.5';
            })
            .replace(new RegExp(`\\b(${wordsPattern})\\b`, 'gi'), (match) => {
                 return vnNumbers[match.toLowerCase()];
            })
            .replace(/\brưỡi\b/g, '0.5');

        const taskStrings = tasksTextLower.split(/[,;\.]|\b\s*và\s*\b|\b\s*thêm\s*\b|\b\s*với\s*\b/i).filter((s: string) => s.trim().length > 0);
        
        taskStrings.forEach((chunk: string) => {
            let remainingChunk = chunk;
            let foundAny = true;
            let loopCount = 0;
            const matchedTasksInChunk = new Set<string>();
            
            while(foundAny && remainingChunk.trim().length > 2 && loopCount < 10) {
                foundAny = false;
                loopCount++;
                
                let bestTask: any = null;
                let maxMatchScore = 0;
                let bestMatchWords: string[] = [];
                
                dinhMucList.forEach(dm => {
                    if (matchedTasksInChunk.has(dm.name)) return;
                    if (newSelectedTasks[dm.name]?.selected && !smartInitialState.current.selectedTasks[dm.name]?.selected) return;
                    
                    const dmNameLower = dm.name.toLowerCase();
                    const words = dmNameLower.split(/\s+/).filter((w: string) => w.length > 2 || !isNaN(Number(w)));
                    if (words.length === 0) return;
                    
                    let matches = 0;
                    let matchedWords: string[] = [];
                    words.forEach((w: string) => {
                        if (remainingChunk.includes(w)) {
                            matches++;
                            matchedWords.push(w);
                        }
                    });
                    
                    const score = matches / words.length;
                    const finalScore = score * words.length; 
                    
                    if (score >= 0.5 && finalScore > maxMatchScore) {
                        maxMatchScore = finalScore;
                        bestTask = dm;
                        bestMatchWords = matchedWords;
                    }
                });
                
                if (bestTask) {
                    foundAny = true;
                    matchedTasksInChunk.add(bestTask.name);
                    
                    const escapedWords = bestMatchWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                    let regexStr = escapedWords.join('.*?');
                    
                    // Regex find a number following the matched words
                    const followMatch = remainingChunk.match(new RegExp(regexStr + '.{0,20}?(\\d+([.,]\\d+)?)', 'i'));
                    
                    let qty = bestTask.quota || 1;
                    let numberUsed = '';
                    
                    if (followMatch && followMatch[1]) {
                        qty = parseFloat(followMatch[1].replace(',', '.'));
                        numberUsed = followMatch[1];
                    } else if (escapedWords.length > 0) {
                        // Fallback: check if number is before the task
                        const preMatch = remainingChunk.match(new RegExp('(\\d+([.,]\\d+)?).{0,20}?' + escapedWords[0], 'i'));
                        if (preMatch && preMatch[1]) {
                            qty = parseFloat(preMatch[1].replace(',', '.'));
                            numberUsed = preMatch[1];
                        }
                    }
                    
                    newSelectedTasks[bestTask.name] = { 
                        selected: true, 
                        quantity: qty > 0 ? qty : 1 
                    };
                    
                    bestMatchWords.forEach((w: string) => {
                        remainingChunk = remainingChunk.replace(w, ' ');
                    });
                    if (numberUsed) {
                        remainingChunk = remainingChunk.replace(numberUsed, ' ');
                    }
                }
            }
        });
        
        setSelectedTasks(newSelectedTasks);
        setMembers(currentMembers);
        setPhatHien(currentPhatHien);
        if (currentTeam) setTeam(currentTeam);
        
        if (shouldStop) {
            recognition.stop();
            setIsSmartRecording(false);
        }
    };
    recognition.onerror = () => setIsSmartRecording(false);
    recognition.onend = () => setIsSmartRecording(false);
    
    recognition.start();
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 p-6 sm:p-10 max-w-4xl shadow-xl shadow-slate-200/40 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-slate-200 pb-4 gap-4">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3 text-slate-800 tracking-tight">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <ClipboardList className="w-4 h-4" />
          </div>
          Nhập Ghi Nhận Công Việc
        </h2>
        
        <div className="relative group">
          <button
            type="button"
            onClick={toggleSmartRecording}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all shadow-sm border ${isSmartRecording ? 'bg-red-50 text-red-600 border-red-200 animate-pulse ring-2 ring-red-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:shadow-md hover:-translate-y-0.5'}`}
          >
            <Mic className="w-4 h-4 md:w-5 md:h-5" />
            {isSmartRecording ? "Đang Nghe (Báo cáo nhanh)..." : "Báo Cáo Nhanh (Giọng Nói)"}
          </button>
          
          <div className="absolute top-full mt-2 right-0 sm:right-0 w-[280px] bg-slate-800 text-white text-xs rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl pointer-events-none transform origin-top-right">
             <div className="font-bold text-blue-300 mb-1.5 uppercase tracking-wider text-[10px]">Cấu trúc đọc chuẩn</div>
             <ul className="space-y-1.5 text-slate-200">
                <li><span className="text-indigo-300 font-semibold">Tên:</span> [Họ và tên]</li>
                <li><span className="text-indigo-300 font-semibold">Công việc:</span> [Tên việc] số lượng [Số lượng]</li>
                <li><span className="text-indigo-300 font-semibold">Phát hiện:</span> [Nội dung phát hiện]</li>
             </ul>
             <div className="mt-2 pt-2 border-t border-slate-600/50 text-[11px] text-slate-400 italic">
                Ví dụ: "Họ và tên Nguyễn Văn A công việc phát quang số lượng 1 phát hiện điểm đứt cáp... kết thúc"
             </div>
          </div>
        </div>
      </div>
      
      {message && (
         <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 border shadow-sm animate-in fade-in slide-in-from-top-2 ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
            {message.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <span className="text-sm font-bold leading-relaxed">{message.text}</span>
         </div>
      )}

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
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              required
            >
              <option value="" disabled>Chọn tổ...</option>
              {availableTeams.length > 0 ? availableTeams.map(t => <option key={t} value={t}>{t}</option>) : <option disabled>Chưa có dữ liệu Tổ</option>}
            </select>
          </div>
        </div>

        <div className="relative group">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Họ và Tên (Nhóm Công Tác)</label>
          <p className="text-xs text-orange-600 mb-2 italic">Lưu ý: Nhập 1 người nếu công tác 1 mình; nhập 1 lượt tất cả các thành viên nhóm nếu công tác chung nhóm của ngày đó.</p>
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
                           if (!members.includes(exactMatch.name)) {
                               setMembers(prev => [...prev, exactMatch.name]);
                           }
                           if (!team && exactMatch.team) {
                               setTeam(exactMatch.team);
                           }
                           setMemberInput('');
                        } else {
                           setMessage({ type: 'error', text: `Lỗi! Tên "${val}" không khớp với danh sách nhân viên trong hệ thống (Sheet CongTac).` });
                           setTimeout(() => setMessage(null), 5000);
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
                    if (!members.includes(suggestion)) {
                        setMembers(prev => [...prev, suggestion]);
                    }
                    if (!team) {
                        const mObj = allSheetMembers.find(x => x.name === suggestion);
                        if (mObj && mObj.team) setTeam(mObj.team);
                    }
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
           <div className="mb-3 relative">
               <input 
                 type="text" 
                 value={taskSearch} 
                 onChange={e => setTaskSearch(e.target.value)}
                 placeholder="Tìm nhanh nội dung công việc..."
                 className="w-full bg-[#E4E3E0]/50 border border-[#141414]/20 p-2 text-sm focus:outline-none focus:border-[#141414]"
               />
           </div>
           <div className="space-y-1.5 bg-slate-50/50 rounded-xl p-3 border border-slate-200 max-h-[28rem] overflow-y-auto">
             {dinhMucList.length > 0 ? (
               dinhMucList.filter(dm => dm.name.toLowerCase().includes(taskSearch.toLowerCase())).map(dm => {
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
                              min="0" step="any"
                              value={qty}
                              onChange={e => {
                                 updateQuantity(dm.name, e.target.value);
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

        <div className="pt-6 flex gap-3 flex-col sm:flex-row">
          <div className="flex-1 flex gap-3">
              <button 
                type="submit"
                disabled={isSubmitting || members.length === 0}
                className={`flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed text-white/50' : 'hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0'}`}
              >
                {isSubmitting ? 'ĐANG ĐỒNG BỘ...' : 'Cập Nhật Lên Hệ Thống [Enter]'}
              </button>
              
              {isDeleteAllowed() && (
                  <button
                     type="button"
                     disabled={isSubmitting}
                     onClick={triggerDeleteConfirm}
                     className={`px-6 py-4 bg-red-100 text-red-600 font-bold text-base rounded-xl transition-all shadow-sm border border-red-200 flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-200 hover:text-red-700 hover:-translate-y-0.5'}`}
                  >
                     Xóa báo cáo
                  </button>
              )}
          </div>
          
          {isManagement && (
              <button 
                type="button"
                onClick={handlePlanSubmit}
                disabled={isSubmittingPlan || !hasSelectedTasks}
                className={`sm:w-1/3 py-4 bg-gradient-to-r text-white font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-2 ${(isSubmittingPlan || !hasSelectedTasks) ? 'from-slate-400 to-slate-500 opacity-50 cursor-not-allowed shadow-none' : 'from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0'}`}
              >
                {isSubmittingPlan ? 'ĐANG LƯU...' : 'Lưu Kế hoạch Tháng'}
              </button>
          )}
        </div>

      </form>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xóa báo cáo</h3>
              <p className="text-slate-600 text-sm mb-6">
                Bạn có chắc chắn muốn xóa báo cáo của {membersToDelete.length > 1 ? 'nhóm' : 'cá nhân'} gồm <strong className="text-red-600">{membersToDelete.length}</strong> thành viên ({membersToDelete.join(', ')}) trong ngày <strong className="text-blue-600">{date.split('-').reverse().join('/')}</strong> không?
                Hành động này sẽ xóa dữ liệu trên Google Sheets và không thể hoàn tác.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={executeDeleteGroup}
                  className="px-4 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm shadow-red-600/20"
                >
                  Đồng ý xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
