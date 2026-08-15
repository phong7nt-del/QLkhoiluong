const fs = require('fs');
let dsCode = fs.readFileSync('src/store/DataStore.ts', 'utf8');

dsCode = dsCode.replace(
/updateXuLyDoXaToSheet: async \(\entry: XuLyDoXaEntry\) => \{[\s\S]*?return result\.status === 'success';\n    \} catch \(e\) \{/g,
`updateXuLyDoXaToSheet: async (entry: XuLyDoXaEntry) => {
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
    } catch (e) {`
);

fs.writeFileSync('src/store/DataStore.ts', dsCode, 'utf8');

let viewCode = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

viewCode = viewCode.replace(
`const ok = editingItem ? await DataStore.updateXuLyDoXaToSheet(entry) : await DataStore.syncXuLyDoXaToSheet(entry);
    setSaving(false);
    
    if (ok) {`,
`let ok = false;
    let errMsg = "";
    if (editingItem) {
        const res = await DataStore.updateXuLyDoXaToSheet(entry);
        ok = res.ok;
        errMsg = res.message || "";
    } else {
        ok = await DataStore.syncXuLyDoXaToSheet(entry);
    }
    setSaving(false);
    
    if (ok) {`
);

viewCode = viewCode.replace(
`alert("Có lỗi xảy ra khi lưu!");`,
`alert("Có lỗi xảy ra khi lưu: " + errMsg);`
);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', viewCode, 'utf8');
