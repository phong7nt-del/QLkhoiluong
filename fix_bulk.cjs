const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

code = code.replace(
/syncXuLyDoXaBulkToSheet: async \(\entries: XuLyDoXaEntry\[\]\) => \{[\s\S]*?return response\.ok;\n    \} catch \(e\) \{/g,
`syncXuLyDoXaBulkToSheet: async (entries: XuLyDoXaEntry[]) => {
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
    } catch (e) {`
);

fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
