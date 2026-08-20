const fs = require('fs');

let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const oldCode = `updateXuLyDoXaToSheet: async (entry: XuLyDoXaEntry) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update_xulydoxa', data: entry }),
      });
      const result = await response.json();
      return { ok: result.status === 'success', message: result.message || JSON.stringify(result) };
    } catch (e) {
      console.error('Failed to update XuLyDoXa to sheet', e);
      return false;
    }
  },`;

const newCode = `updateXuLyDoXaToSheet: async (entry: XuLyDoXaEntry) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update_xulydoxa', data: entry }),
      });
      const rawText = await response.text();
      try {
         const result = JSON.parse(rawText);
         return { ok: result.status === 'success', message: result.message || JSON.stringify(result) };
      } catch(parseErr) {
         console.error('Non-JSON response from GS:', rawText);
         return { ok: false, message: 'html_response' };
      }
    } catch (e: any) {
      console.error('Failed to update XuLyDoXa to sheet', e);
      return { ok: false, message: e.message || String(e) };
    }
  },`;

if (code.includes(oldCode)) {
    code = code.replace(oldCode, newCode);
    fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
    console.log("Updated DataStore.ts");
} else {
    console.log("Could not find old code in DataStore.ts");
}
