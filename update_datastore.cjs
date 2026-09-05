const fs = require('fs');
let content = fs.readFileSync('src/store/DataStore.ts', 'utf8');

// Add importDcu and updateDcu methods
const injectDataStore = `
  async importDcu(dataList: any[]) {
      try {
          const url = this.getAppScriptUrl();
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
  
  async updateDcu(data: any) {
      try {
          const url = this.getAppScriptUrl();
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

content = content.replace(/async addDcu/, injectDataStore + "\n  async addDcu");

// Extract user field
content = content.replace(
    /ghiChu: findKey\(\['Ghi chú', 'ghiChu'\]\)/,
    "ghiChu: findKey(['Ghi chú', 'ghiChu']),\n                 user: findKey(['User', 'Người cập nhật'])"
);

fs.writeFileSync('src/store/DataStore.ts', content, 'utf8');
console.log('Added methods to DataStore.ts');
