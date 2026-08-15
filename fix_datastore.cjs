const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const replacement = `getXuLyDoXa: async () => {
     try {
         const sheetId = localStorage.getItem('SPREADSHEET_ID') || "1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ";
         const res = await fetch(\`https://docs.google.com/spreadsheets/d/\${sheetId}/gviz/tq?tqx=out:csv&sheet=\${encodeURIComponent("XuLyDoXa")}\`);
         if (!res.ok) return [];
         const text = await res.text();
         if (text.includes('<html')) return [];
         const data = Papa.parse(text, { header: true }).data;
         const filtered = data.filter((row: any) => row && Object.keys(row).length > 0);
         return filtered.map((row: any) => {
            const getVal = (possibleKeys) => {
                const rowKey = Object.keys(row).find(k => possibleKeys.includes(k.trim().toLowerCase().replace(/[\\s_]+/g, '')));
                return rowKey ? row[rowKey] : undefined;
            };
            return {
                stt: getVal(['stt']),
                loaiXl: getVal(['loaixl', 'loạixl']),
                nguoiXl: getVal(['nguoixl', 'ngườixl']),
                thoiGianXl: getVal(['thoigianxl', 'thờigianxl']),
                maDd: getVal(['madd', 'mãdd', 'mãđđ']),
                cachXl: getVal(['cachxl', 'cáchxl']),
                ketQua: getVal(['ketqua', 'kếtquả']),
                ghiChu: getVal(['ghichu', 'ghichú'])
            };
         }).filter(item => item.stt || item.maDd || item.nguoiXl);
     } catch (e) {
         console.error('Error fetching XuLyDoXa', e);
         return [];
     }
  },
  
  syncXuLyDoXaToSheet: async (entry: XuLyDoXaEntry) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'add_xulydoxa', data: entry }),
      });
      return response.ok;
    } catch (e) {
      console.error('Failed to sync XuLyDoXa to sheet', e);
      return false;
    }
  },`;

code = code.replace(
  /getXuLyDoXa: async \(\) => \{[\s\S]*?console\.error\('Failed to sync XuLyDoXa to sheet', e\);\n      return false;\n    \}\n  \},/,
  replacement
);

fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
