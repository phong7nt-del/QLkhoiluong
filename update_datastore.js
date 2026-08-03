import fs from 'fs';

let code = fs.readFileSync('src/store/DataStore.ts', 'utf-8');

// Add memCacheVTTBList
code = code.replace(/let memCacheKhoList: any\[\] \| null = null;/, "let memCacheKhoList: any[] | null = null;\nlet memCacheVTTBList: any[] | null = null;");

// Add 'sheet_vttb_v1' to keys
code = code.replace(/'sheet_sangtai_v1', 'sheet_kho_v1'/, "'sheet_sangtai_v1', 'sheet_kho_v1', 'sheet_vttb_v1'");

// Add fetch VTTB logic
const fetchKhoRegex = /\/\/ Fetch Kho[\s\S]*?console\.error\('Error fetching Kho:', e\);\n\s*\}/;
const fetchVTTBCode = `// Fetch VTTB
            try {
               const vttbRes = await fetch(\`https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=\${encodeURIComponent("VTTB")}&_t=\${new Date().getTime()}\`);
               const vttbText = await vttbRes.text();
               if (!vttbText.includes('<html')) {
                   const { data } = Papa.parse(vttbText, { header: true, skipEmptyLines: true });
                   if (data && data.length > 0) {
                       memCacheVTTBList = data;
                       try {
                           safeSetItem('sheet_vttb_v1', JSON.stringify(data));
                       } catch(e) {
                           console.warn("localStorage quota exceeded for VTTB");
                       }
                   }
               }
            } catch(e) {
               console.error('Error fetching VTTB:', e);
            }`;

code = code.replace(fetchKhoRegex, match => match + '\n\n            ' + fetchVTTBCode);

// Add getVTTB
const getKhoRegex = /getKho: \(\): any\[\] => \{[\s\S]*?\},/;
const getVTTBCode = `getVTTB: (): any[] => {
     if (memCacheVTTBList) return memCacheVTTBList;
     try {
       const cached = safeGetItem('sheet_vttb_v1');
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
  },`;

code = code.replace(getKhoRegex, match => match + '\n\n  ' + getVTTBCode);

// Add sync function placeholders
const syncFunctions = `
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
  },`;

code = code.replace(/syncSangTaiBulkToSheet: async.*?\},/s, match => match + syncFunctions);

fs.writeFileSync('src/store/DataStore.ts', code);
