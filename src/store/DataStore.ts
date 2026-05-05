export interface WorkloadEntry {
  id: string;
  team: string;
  members: string[]; // Thay workGroup bằng members
  content: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
}

const STORAGE_KEY = 'workload_data_v1';
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyDCcu4I8yfT1g2KOHCRoaDtMMb1gLvfxhP4HJkzFYbqNIg1TSXCyi2HS3D7hDYpInVxQ/exec';

export const DataStore = {
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
      await fetch(APP_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'add_workload', data: entry }),
      });
      return true;
    } catch (error) {
      console.error('Error syncing to sheet:', error);
      return false;
    }
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
  },
  
  getUniqueMembers: (): string[] => {
    const entries = DataStore.getEntries();
    const membersSet = new Set<string>();
    entries.forEach(e => {
      if (e.members && Array.isArray(e.members)) {
        e.members.forEach(m => membersSet.add(m));
      }
    });
    return Array.from(membersSet).filter(Boolean);
  }
};
