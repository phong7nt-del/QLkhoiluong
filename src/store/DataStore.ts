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
}

const STORAGE_KEY = 'workload_data_v1';
const SCRIPT_URL_KEY = 'app_script_url_v1';
const TEAMS_KEY = 'sheet_teams_v1';
const MEMBERS_KEY = 'sheet_members_v1';
const STATIONS_KEY = 'sheet_stations_v1';

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
         localStorage.setItem(TEAMS_KEY, JSON.stringify(json.teams || []));
         localStorage.setItem(MEMBERS_KEY, JSON.stringify(json.members || []));
         if (json.stations) {
           localStorage.setItem(STATIONS_KEY, JSON.stringify(json.stations));
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
