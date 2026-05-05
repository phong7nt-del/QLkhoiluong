export interface WorkloadEntry {
  id: string;
  team: string;
  workGroup: string;
  content: string;
  volume: number;
  unit: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
}

const STORAGE_KEY = 'workload_data_v1';

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
  
  getUniqueWorkGroups: (): string[] => {
    const entries = DataStore.getEntries();
    const groups = new Set(entries.map((e) => e.workGroup));
    return Array.from(groups).filter(Boolean);
  }
};
