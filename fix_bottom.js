import fs from 'fs';

let code = fs.readFileSync('src/store/DataStore.ts', 'utf-8');

// The code broke starting from syncSangTaiBulkToSheet's fetch call.
const startIdx = code.indexOf('  syncSangTaiBulkToSheet: async (updates: {maDiemDo: string, maMoi: string}[]) => {');

const newBottom = `  syncSangTaiBulkToSheet: async (updates: {maDiemDo: string, maMoi: string}[]) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
           action: 'update_sangtai_bulk', 
           data: updates
        }),
      });
      const result = await response.json();
      return result.status === 'success';
    } catch (error: any) {
      console.warn('Error syncing SangTai bulk to sheet:', error.message || error);
      return false;
    }
  },

  getTutiEntries: (): TutiEntry[] => {
     try {
       const cached = safeGetItem(TUTI_KEY);
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
  },

  getLocalTutiUpdates: (): LocalTutiUpdate[] => {
     try {
       const cached = safeGetItem(LOCAL_TUTI_UPDATES_KEY);
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
  },

  updateTutiProgress: (id: string, updates: Partial<TutiEntry>, user: SheetMember | null) => {
     const allEntries = DataStore.getTutiEntries();
     const entry = allEntries.find(t => t.id === id);
     if (!entry) return null;

     const now = new Date();
     const dateStr = \`\${now.getDate().toString().padStart(2, '0')}/\${(now.getMonth()+1).toString().padStart(2, '0')}/\${now.getFullYear()}\`;
     const isUpdate = (
         updates.thongSoTU !== undefined || 
         updates.thongSoTI !== undefined || 
         updates.kiemTraTU !== undefined || 
         updates.kiemTraTI !== undefined || 
         updates.khac !== undefined || 
         updates.ketLuan !== undefined
     );

     const updatedEntry = { 
         ...entry, 
         ...updates,
     };

     if (isUpdate && user) {
         updatedEntry.ngayCapNhat = dateStr;
         updatedEntry.nguoiKiemTra = user.name;
         
         const localUpdates = DataStore.getLocalTutiUpdates();
         localUpdates.push({
             entryId: id,
             updates,
             timestamp: Date.now(),
             synced: false
         });
         safeSetItem(LOCAL_TUTI_UPDATES_KEY, JSON.stringify(localUpdates));
     }

     const newEntries = allEntries.map(t => t.id === id ? updatedEntry : t);
     safeSetItem(TUTI_KEY, JSON.stringify(newEntries));
     
     DataStore.syncTutiToSheet(updatedEntry);
     return updatedEntry;
  },

  getEntries: () => {
    try {
      const cached = safeGetItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  },

  addEntry: (entry: any) => {
    const entries = DataStore.getEntries();
    entries.unshift(entry);
    safeSetItem(STORAGE_KEY, JSON.stringify(entries));
  },

  updateEntry: (id: string, updates: any) => {
    const entries = DataStore.getEntries();
    const index = entries.findIndex((e: any) => e.id === id);
    if (index !== -1) {
      entries[index] = { ...entries[index], ...updates };
      safeSetItem(STORAGE_KEY, JSON.stringify(entries));
    }
  },

  deleteEntry: (id: string) => {
    const entries = DataStore.getEntries();
    const filtered = entries.filter((e: any) => e.id !== id);
    safeSetItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  getUniqueContents: (): string[] => {
    const entries = DataStore.getEntries();
    const contents = new Set(entries.map((e: any) => e.content));
    return Array.from(contents);
  },

  syncKhoToSheet: async (khoData: any[]) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update_kho', data: khoData }),
      });
      return response.ok;
    } catch (e) {
      console.warn('Error syncing Kho:', e);
      return false;
    }
  },

  syncVttbToSheet: async (vttbData: any[]) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update_vttb', data: vttbData }),
      });
      return response.ok;
    } catch (e) {
      console.warn('Error syncing VTTB:', e);
      return false;
    }
  }
};
`;

if (startIdx !== -1) {
   code = code.substring(0, startIdx) + newBottom;
   fs.writeFileSync('src/store/DataStore.ts', code);
   console.log('Fixed');
} else {
   console.log('Could not find start index');
}
