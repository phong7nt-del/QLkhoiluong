const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

if (!code.includes('export interface XuLyDoXaEntry')) {
  code = code.replace("export interface SheetMember", "export interface XuLyDoXaEntry {\n  stt?: number;\n  loaiXl: string;\n  nguoiXl: string;\n  thoiGianXl: string;\n  maDd: string;\n  cachXl: string;\n  ghiChu: string;\n}\n\nexport interface SheetMember");
}

if (!code.includes('syncXuLyDoXaToSheet')) {
  code = code.replace("syncToSheet: async", "getXuLyDoXa: async () => {\n     try {\n         const sheetId = localStorage.getItem('SPREADSHEET_ID') || \"1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ\";\n         const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(\"XuLyDoXa\")}`);\n         if (!res.ok) return [];\n         const text = await res.text();\n         if (text.includes('<html')) return [];\n         const data = Papa.parse(text, { header: true }).data;\n         return data.filter((row: any) => row && Object.keys(row).length > 0 && (row['STT'] || row['stt'] || row['Nguoi XL'] || row['Ma DD']));\n     } catch (e) {\n         console.error('Error fetching XuLyDoXa', e);\n         return [];\n     }\n  },\n  \n  syncXuLyDoXaToSheet: async (entry: XuLyDoXaEntry) => {\n    try {\n      const url = DataStore.getAppScriptUrl();\n      if (!url) throw new Error('No Apps Script URL configured');\n      const response = await fetch(url, {\n        method: 'POST',\n        headers: { 'Content-Type': 'text/plain;charset=utf-8' },\n        body: JSON.stringify({ action: 'add_xulydoxa', data: entry }),\n      });\n      return response.ok;\n    } catch (e) {\n      console.error('Failed to sync XuLyDoXa to sheet', e);\n      return false;\n    }\n  },\n\n  syncToSheet: async");
}

fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
