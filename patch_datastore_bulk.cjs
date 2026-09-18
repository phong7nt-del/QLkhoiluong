const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const injectionXulydoxaDelete = `  deleteXuLyDoXaBulk: async (maDdList: string[]) => {
      try {
          const url = DataStore.getAppScriptUrl();
          if (!url) return false;
          await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'delete_xulydoxa_bulk', data: maDdList })
          });
          return true;
      } catch (e) {
          console.error(e);
          return false;
      }
  },`;

const injectionDcuDelete = `  deleteDcuBulk: async (idList: string[]) => {
      try {
          const url = DataStore.getAppScriptUrl();
          if (!url) return false;
          await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'delete_dcu_bulk', data: idList })
          });
          return true;
      } catch (e) {
          console.error(e);
          return false;
      }
  },`;

code = code.replace("updateXuLyDoXaToSheet: async (entry: XuLyDoXaEntry) => {", injectionXulydoxaDelete + "\\n\\n  updateXuLyDoXaToSheet: async (entry: XuLyDoXaEntry) => {");
code = code.replace("importDcu: async (data: any[]) => {", injectionDcuDelete + "\\n\\n  importDcu: async (data: any[]) => {");

fs.writeFileSync('src/store/DataStore.ts', code);
