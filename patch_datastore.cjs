const fs = require('fs');
let content = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const strToReplace = `  addDcu: async (data: any) => {
     try {
         const url = DataStore.getAppScriptUrl();
         const res = await fetch(url, {
             method: 'POST',
             mode: 'no-cors',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 action: 'add_dcu',
                 payload: { data }
             })
         });
         return true;
     } catch(e) {
         console.error('Lỗi lưu DCU:', e);
         return false;
     }
  },`;

const newStr = `  addDcu: async (data: any) => {
     try {
         const url = DataStore.getAppScriptUrl();
         const res = await fetch(url, {
             method: 'POST',
             headers: { 'Content-Type': 'text/plain;charset=utf-8' },
             body: JSON.stringify({
                 action: 'add_dcu',
                 payload: { data }
             })
         });
         const json = await res.json();
         if (json.status !== 'success') {
             throw new Error(json.message || 'Lưu thất bại');
         }
         return true;
     } catch(e) {
         console.error('Lỗi lưu DCU:', e);
         return false;
     }
  },`;

content = content.replace(strToReplace, newStr);
fs.writeFileSync('src/store/DataStore.ts', content, 'utf8');
console.log('Patched addDcu in DataStore.ts');
