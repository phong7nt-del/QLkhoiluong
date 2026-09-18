const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const target = `  updateTutiEntry: async (id: string, updates: Partial<TutiEntry>) => {`;

const injection = `  deleteTutiEntry: async (id: string) => {
     const entries = DataStore.getTutiEntries();
     const entry = entries.find(e => e.id === id);
     if (entry) {
         const newEntries = entries.filter(e => e.id !== id);
         try {
           localStorage.setItem(TUTI_KEY, JSON.stringify(newEntries));
         } catch(e) {}
         
         try {
             const url = DataStore.getAppScriptUrl();
             if (url) {
                 await fetch(url, {
                     method: 'POST',
                     headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                     body: JSON.stringify({ action: 'delete_tuti', data: { maTram: entry.maTram, tenDiemDo: entry.tenDiemDo } })
                 });
             }
         } catch(e) {}
     }
  },

  updateTutiEntry: async (id: string, updates: Partial<TutiEntry>) => {`;

code = code.replace(target, injection);
fs.writeFileSync('src/store/DataStore.ts', code);
