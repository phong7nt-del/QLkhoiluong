import fs from 'fs';

let code = fs.readFileSync('src/store/DataStore.ts', 'utf-8');

const interfaceTuti = `export interface TutiEntry {`;
if (!code.includes('export interface LocalTutiUpdate')) {
    code = code.replace(interfaceTuti, `export interface LocalTutiUpdate {\n  entryId: string;\n  updates: Partial<TutiEntry>;\n  timestamp: number;\n  synced: boolean;\n}\n\n` + interfaceTuti);
}

const addTutiFunctions = `
  addTutiEntry: async (entry: TutiEntry) => {
     const entries = DataStore.getTutiEntries();
     entries.unshift(entry);
     try {
       localStorage.setItem(TUTI_KEY, JSON.stringify(entries));
     } catch(e) {}
     await DataStore.syncTutiToSheet(entry);
     return entry;
  },

  updateTutiEntry: async (id: string, updates: Partial<TutiEntry>) => {
     const entries = DataStore.getTutiEntries();
     const index = entries.findIndex(e => e.id === id);
     if (index !== -1) {
         entries[index] = { ...entries[index], ...updates };
         try {
           localStorage.setItem(TUTI_KEY, JSON.stringify(entries));
         } catch(e) {}
         await DataStore.syncTutiToSheet(entries[index]);
     }
  },
`;

if (!code.includes('addTutiEntry: async')) {
    code = code.replace('  getTutiEntries: (): TutiEntry[] => {', addTutiFunctions + '\n  getTutiEntries: (): TutiEntry[] => {');
}

fs.writeFileSync('src/store/DataStore.ts', code);
