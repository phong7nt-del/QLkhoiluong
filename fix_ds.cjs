const fs = require('fs');
let content = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const injectDataStore = `
  importDcu: async (dataList: any[]) => {
      try {
          const url = DataStore.getAppScriptUrl();
          if (!url) return false;
          const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                  action: 'import_dcu',
                  data: dataList
              })
          });
          const json = await res.json();
          return json.status === 'success';
      } catch(e) {
          console.error(e);
          return false;
      }
  },
  
  updateDcu: async (data: any) => {
      try {
          const url = DataStore.getAppScriptUrl();
          if (!url) return false;
          const userObj = JSON.parse(localStorage.getItem('sessionUser') || '{}');
          const finalData = { ...data, user: userObj.name || userObj.email || '' };
          
          const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                  action: 'update_dcu',
                  data: finalData
              })
          });
          const json = await res.json();
          return json.status === 'success';
      } catch(e) {
          console.error(e);
          return false;
      }
  },
`;

content = content.replace(/addDcu: async/, injectDataStore + "\n  addDcu: async");
fs.writeFileSync('src/store/DataStore.ts', content, 'utf8');
console.log('Fixed DataStore.ts');
