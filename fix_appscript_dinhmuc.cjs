const fs = require('fs');

let configModal = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const regex = /\/\/ Đọc sheet DinhMuc[\s\S]*?(?=\/\/ Đọc sheet TUTI)/;

const newBlock = `// Đọc sheet DinhMuc
      var dinhMucList = [];
      var sheetDinhMuc = getSheetFlexibly(ss, ['DinhMuc', 'Định Mức', 'Dinh muc', 'Định mức']);
      if (sheetDinhMuc) {
        var dmData = sheetDinhMuc.getDataRange().getValues();
        var nameCol = -1;
        var quotaCol = -1;
        var groupCol = -1;
        var relationCol = -1;
        var startRow = 1;
        var historyCols = {};
        
        for (var r = 0; r < 5 && r < dmData.length; r++) {
            var row = dmData[r] || [];
            for (var j = 0; j < row.length; j++) {
               var rawVal = String(row[j]).trim();
               var h = rawVal.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/đ/g, 'd');
               
               if (h.indexOf('noi dung') > -1 || h.indexOf('danh muc') > -1 || h.indexOf('ten') > -1) {
                   if (nameCol === -1) nameCol = j;
               }
               if (h.indexOf('dinh muc') > -1 || h.indexOf('khoi luong') > -1 || h.indexOf('chi tieu') > -1 || h.indexOf('quota') > -1 || h.indexOf('diem') > -1) {
                   if (quotaCol === -1) quotaCol = j;
               }
               if (h.indexOf('chung nhom') > -1) groupCol = j;
               if (h.indexOf('quan he') > -1) relationCol = j;
               if (h.indexOf('thang') > -1 || /\\d+\\/\\d{4}/.test(h)) {
                   historyCols[rawVal] = j;
               }
            }
            if (nameCol !== -1) {
                startRow = r + 1;
                break;
            }
        }
        if (nameCol === -1) nameCol = 0;
        if (quotaCol === -1 && dmData[0] && dmData[0].length > 1) quotaCol = 1;
        
        for (var d = startRow; d < dmData.length; d++) {
           var val1 = String(dmData[d][nameCol] || '').trim();
           var val2 = quotaCol > -1 ? Number(String(dmData[d][quotaCol]).replace(/,/g, '.')) : 0;
           if (isNaN(val2)) val2 = 0;
           
           var isGroupStr = groupCol !== -1 ? String(dmData[d][groupCol] || '').toLowerCase().trim() : '';
           var isGroup = isGroupStr === 'x';
           var relation = relationCol !== -1 ? String(dmData[d][relationCol] || '').trim() : '';
           
           var history = {};
           for (var k in historyCols) {
               var colIdx = historyCols[k];
               var hVal = parseFloat(String(dmData[d][colIdx] || '0').replace(/,/g, '.'));
               if (!isNaN(hVal)) history[k] = hVal;
           }
           
           if (val1 && val1.toLowerCase() !== 'stt' && val1.toLowerCase() !== 'tổng' && val1.toLowerCase() !== 'tong') {
              dinhMucList.push({ name: val1, quota: val2, isGroup: isGroup, relation: relation, history: history });
           }
        }
      }
      
      `;

configModal = configModal.replace(regex, newBlock);
fs.writeFileSync('src/components/ConfigModal.tsx', configModal, 'utf8');

