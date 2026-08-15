const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const newMethods = `
  syncXuLyDoXaBulkToSheet: async (entries: XuLyDoXaEntry[]) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'add_xulydoxa_bulk', data: entries }),
      });
      return response.ok;
    } catch (e) {
      console.error('Failed to sync bulk XuLyDoXa to sheet', e);
      return false;
    }
  },

  updateXuLyDoXaToSheet: async (entry: XuLyDoXaEntry) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update_xulydoxa', data: entry }),
      });
      return response.ok;
    } catch (e) {
      console.error('Failed to update XuLyDoXa to sheet', e);
      return false;
    }
  },

  syncToSheet: async (entry: Omit<WorkloadEntry, 'id' | 'timestamp'>) => {`;

code = code.replace("  syncToSheet: async (entry: Omit<WorkloadEntry, 'id' | 'timestamp'>) => {", newMethods);

fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
