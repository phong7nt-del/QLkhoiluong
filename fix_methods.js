import fs from 'fs';

let dsCode = fs.readFileSync('src/store/DataStore.ts', 'utf-8');

const additionalMethods = `
  updateEntry: (id: string, updates: Partial<WorkloadEntry>) => {
    const entries = DataStore.getEntries();
    const index = entries.findIndex((e) => e.id === id);
    if (index !== -1) {
      entries[index] = { ...entries[index], ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch(e) {}
    }
  },

  deleteEntry: (id: string) => {
    const entries = DataStore.getEntries();
    const filtered = entries.filter((e) => e.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch(e) {}
  },

  getUniqueContents: (): string[] => {
    const entries = DataStore.getEntries();
    const contents = new Set(entries.map((e) => e.content));
    return Array.from(contents).filter(Boolean);
  },
`;

if (!dsCode.includes('deleteEntry:')) {
    dsCode = dsCode.replace("  addEntry: (entry: Omit<WorkloadEntry, 'id' | 'timestamp'>) => {", additionalMethods + "\n  addEntry: (entry: Omit<WorkloadEntry, 'id' | 'timestamp'>) => {");
}

fs.writeFileSync('src/store/DataStore.ts', dsCode);
