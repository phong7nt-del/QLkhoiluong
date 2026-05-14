import Papa from 'papaparse';

export interface Station {
  id: string; // Mã trạm
  name: string; // Tên trạm
  type: string; // Loại trạm
  area: string; // Khu vực (Tổ)
  details: Record<string, string>; // Tất cả các thông tin khác
}

export interface WorkloadEntry {
  id: string;
  team: string;
  members: string[]; // Thay workGroup bằng members
  content: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
}

export interface TaskProgress {
  id: string; // TT
  content: string; // Nội dung
  reference: string; // căn cứ
  deadline: string; // ngày hoàn tất (dd/mm/yyyy)
  assignee: string; // Phân công
  status: string; // Hoàn tất ('xong' or '')
  explanation?: string; // Giải trình
  isLocal?: boolean;
  timestamp?: number;
}

export interface SheetMember {
  team: string;
  name: string;
  [key: string]: any;
}

export interface TutiEntry {
  id: string;
  maTram: string; // Mã trạm
  tenDiemDo: string; // Tên điểm đo
  thongSoTU: string; // Thông số TU
  thongSoTI: string; // Thông số TI
  kiemTraTU: string; // Kiểm tra TU
  kiemTraTI: string; // Kiểm tra TI
  khac: string; // Khác
  ketLuan: string; // Kết luận ('Đúng' | 'Sai' | '')
  ngayCapNhat: string; // Ngày cập nhật (dd/mm/yyyy)
  ngayDuaLen: string; // Ngày đưa lên (dd/mm/yyyy)
  isLocal?: boolean;
}

const STORAGE_KEY = 'workload_data_v1';
const SCRIPT_URL_KEY = 'app_script_url_v1';
const TEAMS_KEY = 'sheet_teams_v1';
const MEMBERS_KEY = 'sheet_members_v1';
const STATIONS_KEY = 'sheet_stations_v1';
const DINHMUC_KEY = 'sheet_dinhmuc_v1';
const PROGRESS_KEY = 'sheet_progress_v1';
const LOCAL_PROGRESS_UPDATES_KEY = 'local_progress_updates_v1';
const TUTI_KEY = 'sheet_tuti_v1';
const LOCAL_TUTI_UPDATES_KEY = 'local_tuti_updates_v1';

export const DataStore = {
  getAppScriptUrl: () => localStorage.getItem(SCRIPT_URL_KEY) || 'https://script.google.com/macros/s/AKfycbyDCcu4I8yfT1g2KOHCRoaDtMMb1gLvfxhP4HJkzFYbqNIg1TSXCyi2HS3D7hDYpInVxQ/exec',
  setAppScriptUrl: (url: string) => localStorage.setItem(SCRIPT_URL_KEY, url),

  getEntries: (): WorkloadEntry[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed) {
          const arr = Array.isArray(parsed) ? parsed : Object.values(parsed);
          return arr.map((item: any) => {
            if (!item) return item;
            let members = item.members || item.workGroup || [];
            if (typeof members === 'string') {
               members = members.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
            return {
              ...item,
              members: Array.isArray(members) ? members : []
            };
          }).filter(Boolean);
        }
      }
      return [];
    } catch (e) {
      console.error("DEBUG DataStore getEntries Error:", e);
      return [];
    }
  },
  
  addEntry: (entry: Omit<WorkloadEntry, 'id' | 'timestamp'>) => {
    const entries = DataStore.getEntries();
    const newEntry: WorkloadEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now()
    };
    entries.push(newEntry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return newEntry;
  },

  syncToSheet: async (entry: Omit<WorkloadEntry, 'id' | 'timestamp'>) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'add_workload', data: entry }),
      });
      const result = await response.json();
      return result.status === 'success';
    } catch (error) {
      console.error('Error syncing to sheet:', error);
      return false;
    }
  },

  syncProgressToSheet: async (task: TaskProgress) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'update_progress', data: task }),
      });
      const result = await response.json();
      return result.status === 'success';
    } catch (error) {
      console.error('Error syncing progress to sheet:', error);
      return false;
    }
  },

  syncMasterData: async () => {
    try {
      let json: any = { status: 'success', members: [], teams: [] };
      try {
        const url = DataStore.getAppScriptUrl();
        if (url) {
          const res = await fetch(`${url}?action=getData&_t=${new Date().getTime()}`);
          const fetchedJson = await res.json();
          if (fetchedJson && fetchedJson.status === 'success') {
            json = fetchedJson;
          }
        }
      } catch(e) {
        console.warn("Could not fetch from App Script. Proceeding with CSV fallback.", e);
      }

      if (json.status === 'success') {
         // Lấy MSNV và bổ sung thêm NV từ file CSV
         try {
            const cbcnvRes = await fetch(`https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=CBCNV&_t=${new Date().getTime()}`);
            const csvText = await cbcnvRes.text();
            const { data } = Papa.parse(csvText, { header: false });
            
            const membersMap = new Map<string, any>();
            
            // 1. Thêm members từ JSON (App Script) trước
            if (json.members && Array.isArray(json.members)) {
               for (const m of json.members) {
                  const key = String(m.name || '').toLowerCase().replace(/\s+/g, '');
                  membersMap.set(key, m);
               }
            }
            
            // 2. Scan CSV để cập nhật hoặc thêm mới NV
            const startIndex = 1; // Bỏ qua header
            for (let i = startIndex; i < data.length; i++) {
               const row = data[i] as string[];
               // format: Stt[0], MSNV[1], Link[2], Họ tên[3], ... Phòng Đội viết tắt[9],  Phòng Đội[10]
               if (row && row.length > 3) {
                  const msnv = String(row[1] || '').trim();
                  const rawName = String(row[3] || '').trim();
                  const teamAbbr = String(row[9] || '').trim();
                  const teamFull = String(row[10] || '').trim();
                  const role = String(row[12] || '').trim();
                  
                  if (rawName && msnv) {
                     const key = rawName.toLowerCase().replace(/\s+/g, '');
                     if (membersMap.has(key)) {
                        membersMap.get(key)!.msnv = msnv;
                        if (role) membersMap.get(key)!.role = role;
                     } else {
                        membersMap.set(key, {
                           name: rawName,
                           msnv: msnv,
                           team: teamAbbr || teamFull || "Không xác định",
                           role: role,
                        });
                     }
                  }
               }
            }
            
            json.members = Array.from(membersMap.values());
            
            // Gộp team mới vào json.teams nếu cần (tránh lỗi thiếu team trong filter)
            const allTeams = new Set<string>((json.teams || []).map((t: string) => t));
            json.members.forEach((m: any) => allTeams.add(m.team));
            let finalTeams = Array.from(allTeams);
            let ctText = '';

            // Bắt buộc lấy danh sách Tổ công tác từ sheet CongTac (cột số 5 Khu vực)
            try {
               const ctRes = await fetch(`https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=CongTac&_t=${new Date().getTime()}`);
               ctText = await ctRes.text();
               const ctData = Papa.parse(ctText, { header: false }).data;
               const ctTeamsMap = new Map<string, string>();
               for (let i = 1; i < ctData.length; i++) {
                  const row = ctData[i] as string[];
                  if (row && row[5] && row[5].trim()) {
                     const teamStr = row[5].trim().replace(/\s+/g, ' ');
                     const normalized = teamStr.normalize('NFC').toLowerCase();
                     if (!ctTeamsMap.has(normalized)) {
                        ctTeamsMap.set(normalized, teamStr);
                     }
                  }
               }
               const ctTeams = Array.from(ctTeamsMap.values());
               if (ctTeams.length > 0) {
                  finalTeams = ctTeams; 
               }
            } catch (e) {
               console.error('Error fetching CongTac teams', e);
            }

            json.teams = finalTeams;

            // Fetch "Nhật ký/CongTac" for workloads directly!
            try {
               // We already fetched ctText and ctData above
               const ctDataForWorkloads = Papa.parse(ctText, { header: false }).data;
               const newWorkloads: WorkloadEntry[] = [];
               
               let headerRowIdx = -1;
               let nameColIdx = -1;
               for(let r = 0; r < 5; r++) {
                   if (!ctDataForWorkloads[r]) continue;
                   const rData = ctDataForWorkloads[r] as string[];
                   for(let c = 0; c < rData.length; c++) {
                       if (rData[c] && String(rData[c]).toLowerCase().includes('họ và tên')) {
                           headerRowIdx = r;
                           nameColIdx = c;
                           break;
                       }
                   }
                   if(headerRowIdx !== -1) break;
               }

               if(headerRowIdx !== -1) {
                   const headers = ctDataForWorkloads[headerRowIdx] as string[];
                   
                   for(let r = headerRowIdx + 1; r < ctDataForWorkloads.length; r++) {
                       const row = ctDataForWorkloads[r] as string[];
                       if (!row || !row[nameColIdx]) continue;
                       const memberName = row[nameColIdx].trim();
                       if (!memberName) continue;
                       
                       for(let c = 5; c < headers.length; c++) { // dates start after functions/area cols
                           if (!headers[c]) continue;
                           const dateStr = headers[c].trim();
                           // Ensure header looks like a date/has numbers
                           if (!dateStr.match(/\d+/)) continue;

                           const cellValue = row[c] ? String(row[c]).trim() : '';
                           if (cellValue) {
                               const parts = dateStr.split('/');
                               let formattedDate = dateStr;
                               if (parts.length >= 2) {
                                   let day = parts[0];
                                   let month = parts[1];
                                   let year = parts[2] || new Date().getFullYear().toString();
                                   formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                               }

                               newWorkloads.push({
                                   id: Math.random().toString(36).substring(2, 9),
                                   content: cellValue,
                                   team: row[5] ? String(row[5]).trim() : '',
                                   members: [memberName],
                                   timestamp: Date.now(),
                                   date: formattedDate
                               });
                           }

                       }
                   }
               }
               json.workloads = newWorkloads;
            } catch (e) {
               console.error('Error parsing CongTac for Workloads', e);
            }

            // Fetch "Tiến độ" sheet
            try {
               const progRes = await fetch(`https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("Tiến độ")}&_t=${new Date().getTime()}`);
               const progText = await progRes.text();
               const { data: progData } = Papa.parse(progText, { header: true });
               const progressList: TaskProgress[] = [];
               for (const row of progData as any[]) {
                  const getVal = (opts: string[]) => {
                      for (const k of Object.keys(row)) {
                          if (opts.some(opt => k.toLowerCase().includes(opt))) {
                              return row[k];
                          }
                      }
                      return '';
                  };
                  const content = getVal(['nội dung']);
                  const tt = getVal(['tt', 'stt']);
                  if (content || tt) {
                     progressList.push({
                         id: String(tt || Math.random().toString(36).substring(7)),
                         content: String(content || ''),
                         reference: String(getVal(['căn cứ'])),
                         deadline: String(getVal(['ngày hoàn tất'])),
                         assignee: String(getVal(['phân công'])),
                         status: String(getVal(['hoàn tất'])),
                         explanation: String(getVal(['giải trình']))
                     });
                  }
               }
               localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressList));
            } catch (e) {
               console.error('Error fetching Progress sheet', e);
            }

            // Fetch DinhMuc via CSV
            try {
               const dmSheets = ['DinhMuc', 'Định Mức', 'Dinh muc', 'Định mức'];
               for (const sheetName of dmSheets) {
                  const dmRes = await fetch(`https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&_t=${new Date().getTime()}`);
                  const dmText = await dmRes.text();
                  if (!dmText.includes('<html') && dmText.trim() && dmText.length > 50) {
                     const dmData: any[] = Papa.parse(dmText, { header: true }).data as any[];
                     const newDinhMuc: {name: string, quota: number}[] = [];
                     if (dmData && dmData.length > 0) {
                         const firstRow = dmData[0];
                         const keys = Object.keys(firstRow);
                         const nameKey = keys.find(k => k.toLowerCase().includes('nội dung') || k.toLowerCase().includes('tên'));
                         const quotaKey = keys.find(k => k.toLowerCase().includes('định mức') || k.toLowerCase().includes('quota') || k.toLowerCase().includes('điểm'));
                         
                         if (nameKey) {
                             for (const row of dmData) {
                                 const val1 = String(row[nameKey] || '').trim();
                                 let val2 = quotaKey ? Number(row[quotaKey]) : 0;
                                 if (isNaN(val2)) val2 = 0;
                                 if (val1 && val1.toLowerCase() !== 'stt') {
                                     newDinhMuc.push({ name: val1, quota: val2 });
                                 }
                             }
                             if (newDinhMuc.length > 0) {
                                 json.dinhMuc = newDinhMuc;
                                 break;
                             }
                         }
                     }
                  }
               }
            } catch (e) {
               console.error('Error fetching DinhMuc', e);
            }

            // Fetch TUTI via CSV
            try {
               const tutiRes = await fetch(`https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("TUTI")}&_t=${new Date().getTime()}`);
               const tutiText = await tutiRes.text();
               if (!tutiText.includes('<html') && tutiText.trim()) {
                   const { data: tutiData } = Papa.parse(tutiText, { header: true });
                   const tutiList: TutiEntry[] = [];
                   for (const row of tutiData as any[]) {
                       if (!row || Object.keys(row).length === 0) continue;
                       const getVal = (opts: string[]) => {
                           for (const k of Object.keys(row)) {
                               if (opts.some(opt => k.toLowerCase().includes(opt))) {
                                   return row[k] ? String(row[k]) : '';
                               }
                           }
                           return '';
                       };
                       
                       const maTram = getVal(['mã trạm']);
                       const tenDiemDo = getVal(['tên điểm đo']);
                       if (maTram || tenDiemDo) {
                          tutiList.push({
                              id: String(Math.random().toString(36).substring(2)),
                              maTram: maTram,
                              tenDiemDo: tenDiemDo,
                              thongSoTU: getVal(['thông số tu']),
                              thongSoTI: getVal(['thông số ti']),
                              kiemTraTU: getVal(['kiểm tra tu']),
                              kiemTraTI: getVal(['kiểm tra ti']),
                              khac: getVal(['khác']),
                              ketLuan: getVal(['kết luận']),
                              ngayCapNhat: getVal(['ngày cập nhật']),
                              ngayDuaLen: getVal(['ngày đưa lên']),
                          });
                       }
                   }
                   localStorage.setItem(TUTI_KEY, JSON.stringify(tutiList));
               }
            } catch (e) {
               console.error('Error fetching TUTI', e);
            }

         } catch (e) {
            console.error('Error parsing CBCNV from CSV', e);
         }

         localStorage.setItem(TEAMS_KEY, JSON.stringify(json.teams || []));
         localStorage.setItem(MEMBERS_KEY, JSON.stringify(json.members || []));
         if (json.stations) {
           localStorage.setItem(STATIONS_KEY, JSON.stringify(json.stations));
         }
         if (json.workloads) {
           localStorage.setItem(STORAGE_KEY, JSON.stringify(json.workloads));
         }
         if (json.dinhMuc) {
           localStorage.setItem(DINHMUC_KEY, JSON.stringify(json.dinhMuc));
         }
         
         const localCached = localStorage.getItem(LOCAL_PROGRESS_UPDATES_KEY);
         if (localCached) {
             const localTasks: TaskProgress[] = JSON.parse(localCached);
             const now = Date.now();
             const validLocal = localTasks.filter(t => t.timestamp && (now - t.timestamp) < 5 * 60 * 1000);
             if (validLocal.length > 0) {
                 localStorage.setItem(LOCAL_PROGRESS_UPDATES_KEY, JSON.stringify(validLocal));
             } else {
                 localStorage.removeItem(LOCAL_PROGRESS_UPDATES_KEY);
             }
         }
         return true;
      }
    } catch (error) {
      console.error('Master data sync error:', error);
    }
    return false;
  },

  getTeams: (): string[] => {
    try {
       const cached = localStorage.getItem(TEAMS_KEY);
       return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  },

  getMembers: (): SheetMember[] => {
     try {
       const cached = localStorage.getItem(MEMBERS_KEY);
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
  },

  getStations: (): Station[] => {
     try {
       const cached = localStorage.getItem(STATIONS_KEY);
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
  },

  getDinhMuc: (): { name: string; quota: number }[] => {
     try {
       const cached = localStorage.getItem(DINHMUC_KEY);
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
  },

  getTasks: (): TaskProgress[] => {
     try {
       const cached = localStorage.getItem(PROGRESS_KEY);
       const remoteTasks: TaskProgress[] = cached ? JSON.parse(cached) : [];
       
       const localCached = localStorage.getItem(LOCAL_PROGRESS_UPDATES_KEY);
       const localTasks: TaskProgress[] = localCached ? JSON.parse(localCached) : [];
       
       // Merge: local tasks overwrite remote ones by ID, and new local tasks are appended
       const remoteMap = new Map(remoteTasks.map(t => [t.id, t]));
       localTasks.forEach(lt => {
           remoteMap.set(lt.id, lt);
       });
       
       return Array.from(remoteMap.values());
     } catch { return []; }
  },

  addTask: (task: Omit<TaskProgress, 'id'>) => {
     const localCached = localStorage.getItem(LOCAL_PROGRESS_UPDATES_KEY);
     const localTasks: TaskProgress[] = localCached ? JSON.parse(localCached) : [];
     const newTask: TaskProgress = {
        ...task,
        id: '', // Empty ID tells App Script to insert it
        isLocal: true,
        timestamp: Date.now()
     };
     localTasks.push(newTask);
     localStorage.setItem(LOCAL_PROGRESS_UPDATES_KEY, JSON.stringify(localTasks));
     DataStore.syncProgressToSheet(newTask);
     return newTask;
  },

  updateTaskStatus: (id: string, status: string) => {
     const allTasks = DataStore.getTasks();
     const task = allTasks.find(t => t.id === id);
     if (!task) return null;
     
     const updatedTask = { ...task, status, isLocal: true, timestamp: Date.now() };
     
     const localCached = localStorage.getItem(LOCAL_PROGRESS_UPDATES_KEY);
     const localTasks: TaskProgress[] = localCached ? JSON.parse(localCached) : [];
     
     const existingIndex = localTasks.findIndex(t => t.id === id);
     if (existingIndex >= 0) {
        localTasks[existingIndex] = updatedTask;
     } else {
        localTasks.push(updatedTask);
     }
     localStorage.setItem(LOCAL_PROGRESS_UPDATES_KEY, JSON.stringify(localTasks));
     DataStore.syncProgressToSheet(updatedTask);
     return updatedTask;
  },

  updateTaskExplanation: (id: string, newExplanation: string) => {
     const allTasks = DataStore.getTasks();
     const task = allTasks.find(t => t.id === id);
     if (!task) return null;
     
     const today = new Date();
     const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth()+1).toString().padStart(2, '0')}/${today.getFullYear()}`;
     
     // Build the string: "(stt)(nội dung giải trình)(ngày)"
     // First, determine STT by counting existing rows
     let currentExplanations = task.explanation ? task.explanation.trim() : '';
     let lines = currentExplanations ? currentExplanations.split('\n') : [];
     let stt = lines.length + 1;
     let lineText = `(${stt})(${newExplanation})(${dateStr})`;
     
     let updatedExplanation = currentExplanations ? currentExplanations + '\n' + lineText : lineText;
     
     const updatedTask = { ...task, explanation: updatedExplanation, isLocal: true, timestamp: Date.now() };
     
     const localCached = localStorage.getItem(LOCAL_PROGRESS_UPDATES_KEY);
     const localTasks: TaskProgress[] = localCached ? JSON.parse(localCached) : [];
     
     const existingIndex = localTasks.findIndex(t => t.id === id);
     if (existingIndex >= 0) {
        localTasks[existingIndex] = updatedTask;
     } else {
        localTasks.push(updatedTask);
     }
     localStorage.setItem(LOCAL_PROGRESS_UPDATES_KEY, JSON.stringify(localTasks));
     DataStore.syncProgressToSheet(updatedTask);
     return updatedTask;
  },

  syncTutiToSheet: async (entry: TutiEntry) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) return false;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'update_tuti', data: entry }),
      });
      const result = await response.json();
      return result.status === 'success';
    } catch (error) {
      console.error('Error syncing TUTI to sheet:', error);
      return false;
    }
  },

  getTutiEntries: (): TutiEntry[] => {
     try {
       const cached = localStorage.getItem(TUTI_KEY);
       const remoteTasks: TutiEntry[] = cached ? JSON.parse(cached) : [];
       
       const localCached = localStorage.getItem(LOCAL_TUTI_UPDATES_KEY);
       const localTasks: TutiEntry[] = localCached ? JSON.parse(localCached) : [];
       
       // Priority to local tasks
       const mergedMap = new Map(remoteTasks.map(t => [t.id, t]));
       localTasks.forEach(lt => mergedMap.set(lt.id, lt));
       
       return Array.from(mergedMap.values());
     } catch { return []; }
  },

  addTutiEntry: (entry: Omit<TutiEntry, 'id'>) => {
     const localCached = localStorage.getItem(LOCAL_TUTI_UPDATES_KEY);
     const localTasks: TutiEntry[] = localCached ? JSON.parse(localCached) : [];
     const newEntry: TutiEntry = {
        ...entry,
        id: Math.random().toString(36).substring(2, 9),
        isLocal: true
     };
     localTasks.push(newEntry);
     localStorage.setItem(LOCAL_TUTI_UPDATES_KEY, JSON.stringify(localTasks));
     DataStore.syncTutiToSheet(newEntry);
     return newEntry;
  },

  updateTutiEntry: (id: string, updates: Partial<TutiEntry>) => {
     const allEntries = DataStore.getTutiEntries();
     const entry = allEntries.find(t => t.id === id);
     if (!entry) return null;
     
     const updatedEntry = { ...entry, ...updates, isLocal: true };
     
     const localCached = localStorage.getItem(LOCAL_TUTI_UPDATES_KEY);
     const localTasks: TutiEntry[] = localCached ? JSON.parse(localCached) : [];
     
     const existingIndex = localTasks.findIndex(t => t.id === id);
     if (existingIndex >= 0) {
        localTasks[existingIndex] = updatedEntry;
     } else {
        localTasks.push(updatedEntry);
     }
     localStorage.setItem(LOCAL_TUTI_UPDATES_KEY, JSON.stringify(localTasks));
     DataStore.syncTutiToSheet(updatedEntry);
     return updatedEntry;
  },

  deleteEntry: (id: string) => {
    const entries = DataStore.getEntries();
    const filtered = entries.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  getUniqueContents: (): string[] => {
    const entries = DataStore.getEntries();
    const contents = new Set(entries.map((e) => e.content));
    return Array.from(contents);
  }
};
