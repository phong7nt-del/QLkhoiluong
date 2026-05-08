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

export interface SheetMember {
  team: string;
  name: string;
  [key: string]: any;
}

const STORAGE_KEY = 'workload_data_v1';
const SCRIPT_URL_KEY = 'app_script_url_v1';
const TEAMS_KEY = 'sheet_teams_v1';
const MEMBERS_KEY = 'sheet_members_v1';
const STATIONS_KEY = 'sheet_stations_v1';
const DINHMUC_KEY = 'sheet_dinhmuc_v1';

export const DataStore = {
  getAppScriptUrl: () => localStorage.getItem(SCRIPT_URL_KEY) || 'https://script.google.com/macros/s/AKfycbyDCcu4I8yfT1g2KOHCRoaDtMMb1gLvfxhP4HJkzFYbqNIg1TSXCyi2HS3D7hDYpInVxQ/exec',
  setAppScriptUrl: (url: string) => localStorage.setItem(SCRIPT_URL_KEY, url),

  getEntries: (): WorkloadEntry[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
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

  syncMasterData: async () => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) return false;
      const res = await fetch(`${url}?action=getData`);
      const json = await res.json();
      if (json.status === 'success') {
         // Lấy MSNV và bổ sung thêm NV từ file CSV
         try {
            const cbcnvRes = await fetch("https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=CBCNV");
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
                  
                  if (rawName && msnv) {
                     const key = rawName.toLowerCase().replace(/\s+/g, '');
                     if (membersMap.has(key)) {
                        membersMap.get(key)!.msnv = msnv;
                     } else {
                        membersMap.set(key, {
                           name: rawName,
                           msnv: msnv,
                           team: teamAbbr || teamFull || "Không xác định",
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

            // Bắt buộc lấy danh sách Tổ công tác từ sheet CongTac (cột số 5 Khu vực)
            try {
               const ctRes = await fetch("https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=CongTac");
               const ctText = await ctRes.text();
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
