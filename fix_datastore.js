import fs from 'fs';

let code = fs.readFileSync('src/store/DataStore.ts', 'utf-8');

// First remove the broken injected code
const brokenStart = "  syncKhoToSheet: async (khoData: any[]) => {";
const brokenEnd = "    }\n  },";

const idx1 = code.indexOf(brokenStart);
if (idx1 !== -1) {
   let snippet = code.substring(idx1, code.indexOf(brokenEnd, idx1) + brokenEnd.length);
   code = code.replace(snippet, "");
}

// Now add the functions properly at the end of the object before the closing };
const functionsToAdd = `
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
`;

// Insert before the last closing brace in the file (which should be the end of the DataStore object)
const lastBraceIndex = code.lastIndexOf('};');
if (lastBraceIndex !== -1) {
    code = code.substring(0, lastBraceIndex) + functionsToAdd + '\n};';
}

fs.writeFileSync('src/store/DataStore.ts', code);
