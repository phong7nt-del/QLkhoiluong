const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

const oldBulkBlock = `              const ok = await DataStore.syncXuLyDoXaBulkToSheet(formattedData);
              setIsImporting(false);
              if (ok) {
                  alert("Đã import " + formattedData.length + " dòng thành công!");
                  refreshData();
              }`;
const newBulkBlock = `              const ok = await DataStore.syncXuLyDoXaBulkToSheet(formattedData);
              setIsImporting(false);
              if (ok) {
                  alert("Đã import " + formattedData.length + " dòng thành công!");
                  if (setXuLyList) {
                      setXuLyList(prev => [...formattedData, ...prev]);
                  }
                  refreshData();
              }`;
code = code.replace(oldBulkBlock, newBulkBlock);
fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
