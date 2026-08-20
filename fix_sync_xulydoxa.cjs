const fs = require('fs');

let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const oldSyncAdd = `  syncXuLyDoXaToSheet: async (entry: XuLyDoXaEntry) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'add_xulydoxa', data: entry }),
      });
      const result = await response.json();
      return result.status === 'success';
    } catch (e) {
      console.error('Failed to sync XuLyDoXa to sheet', e);
      return false;
    }
  },`;

const newSyncAdd = `  syncXuLyDoXaToSheet: async (entry: XuLyDoXaEntry) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'add_xulydoxa', data: entry }),
      });
      const rawText = await response.text();
      try {
         const result = JSON.parse(rawText);
         return { ok: result.status === 'success', message: result.message || JSON.stringify(result) };
      } catch(parseErr) {
         return { ok: false, message: 'html_response' };
      }
    } catch (e: any) {
      console.error('Failed to sync XuLyDoXa to sheet', e);
      return { ok: false, message: e.message || String(e) };
    }
  },`;

const oldSyncBulk = `  syncXuLyDoXaBulkToSheet: async (entries: XuLyDoXaEntry[]) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'add_xulydoxa_bulk', data: entries }),
      });
      const result = await response.json();
      return result.status === 'success';
    } catch (e) {
      console.error('Failed to sync bulk XuLyDoXa to sheet', e);
      return false;
    }
  },`;

const newSyncBulk = `  syncXuLyDoXaBulkToSheet: async (entries: XuLyDoXaEntry[]) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'add_xulydoxa_bulk', data: entries }),
      });
      const rawText = await response.text();
      try {
         const result = JSON.parse(rawText);
         return { ok: result.status === 'success', message: result.message || JSON.stringify(result) };
      } catch(parseErr) {
         return { ok: false, message: 'html_response' };
      }
    } catch (e: any) {
      console.error('Failed to sync bulk XuLyDoXa to sheet', e);
      return { ok: false, message: e.message || String(e) };
    }
  },`;

if (code.includes(oldSyncAdd)) {
    code = code.replace(oldSyncAdd, newSyncAdd);
    console.log("Replaced syncXuLyDoXaToSheet");
}
if (code.includes(oldSyncBulk)) {
    code = code.replace(oldSyncBulk, newSyncBulk);
    console.log("Replaced syncXuLyDoXaBulkToSheet");
}

fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');

