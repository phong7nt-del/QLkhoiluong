const fs = require('fs');

// 1. Fix ConfigModal.tsx
let configModal = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const configOld = `      // Đọc sheet DinhMuc
      var dinhMucList = [];
      var sheetDinhMuc = getSheetFlexibly(ss, ['DinhMuc', 'Định Mức', 'Dinh muc', 'Định mức']);
      if (sheetDinhMuc) {
        var dmData = sheetDinhMuc.getDataRange().getValues();
        var headers = dmData[0] || [];
        var nameCol = -1;
        var quotaCol = -1;
        for (var j = 0; j < headers.length; j++) {
           var h = String(headers[j]).toLowerCase();
           if (h.indexOf('nội dung') > -1 || h.indexOf('danh mục') > -1 || h.indexOf('tên') > -1) {
               if (nameCol === -1) nameCol = j;
           }
           if (h.indexOf('định mức') > -1 || h.indexOf('khối lượng') > -1 || h.indexOf('chỉ tiêu') > -1) {
               quotaCol = j;
           }
        }
        if (nameCol === -1) nameCol = 0;
        if (quotaCol === -1 && dmData[0].length > 1) quotaCol = 1;
        
        for (var d = 1; d < dmData.length; d++) {
           var val1 = String(dmData[d][nameCol] || '').trim();
           var val2 = quotaCol > -1 ? Number(dmData[d][quotaCol]) : 0;
           if (isNaN(val2)) val2 = 0;
           
           if (val1 && val1.toLowerCase() !== 'stt') {
              dinhMucList.push({ name: val1, quota: val2 });
           }
        }
      }`;

const configNew = `      // Đọc sheet DinhMuc
      var dinhMucList = [];
      var sheetDinhMuc = getSheetFlexibly(ss, ['DinhMuc', 'Định Mức', 'Dinh muc', 'Định mức']);
      if (sheetDinhMuc) {
        var dmData = sheetDinhMuc.getDataRange().getValues();
        var nameCol = -1;
        var quotaCol = -1;
        var startRow = 1;
        
        for (var r = 0; r < 5 && r < dmData.length; r++) {
            var row = dmData[r] || [];
            for (var j = 0; j < row.length; j++) {
               var h = String(row[j]).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/đ/g, 'd');
               if (h.indexOf('noi dung') > -1 || h.indexOf('danh muc') > -1 || h.indexOf('ten') > -1) {
                   if (nameCol === -1) nameCol = j;
               }
               if (h.indexOf('dinh muc') > -1 || h.indexOf('khoi luong') > -1 || h.indexOf('chi tieu') > -1 || h.indexOf('quota') > -1 || h.indexOf('diem') > -1) {
                   quotaCol = j;
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
           
           if (val1 && val1.toLowerCase() !== 'stt' && val1.toLowerCase() !== 'tổng') {
              dinhMucList.push({ name: val1, quota: val2 });
           }
        }
      }`;

configModal = configModal.replace(configOld, configNew);
fs.writeFileSync('src/components/ConfigModal.tsx', configModal, 'utf8');


// 2. Fix DataStore.ts
let dataStore = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const storeOld = `            // Fetch DinhMuc via CSV
            try {
               const dmSheets = ['DinhMuc', 'Định Mức', 'Dinh muc', 'Định mức'];
               for (const sheetName of dmSheets) {
                  const dmRes = await fetch(\`https://docs.google.com/spreadsheets/d/\${sheetId}/gviz/tq?tqx=out:csv&sheet=\${encodeURIComponent(sheetName)}\`);
                  const dmText = await dmRes.text();
                  if (!dmText.includes('<html') && dmText.trim() && dmText.length > 50) {
                     const dmData: any[] = Papa.parse(dmText, { header: true }).data as any[];
                     const newDinhMuc: any[] = [];
                     if (dmData && dmData.length > 0) {
                         const firstRow = dmData[0];
                         const keys = Object.keys(firstRow);
                         const nameKey = keys.find(k => {
                             const nk = k.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
                             return nk.includes('noi dung') || nk.includes('ten') || nk.includes('danh muc');
                         });
                         const quotaKey = keys.find(k => {
                             const nk = k.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
                             return nk.includes('dinh muc') || nk.includes('quota') || nk.includes('diem') || nk.includes('khoi luong') || nk.includes('chi tieu');
                         });
                         const groupKey = keys.find(k => {
                             const nk = k.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
                             return nk.includes('chung nhom');
                         });
                         const relationKey = keys.find(k => {
                             const nk = k.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
                             return nk.includes('quan he');
                         });
                         
                         if (nameKey) {
                             for (const row of dmData) {
                                 const val1 = String(row[nameKey] || '').trim();
                                 let quotaStr = String(row[quotaKey] || '0').replace(/,/g, '.');
                                 let val2 = parseFloat(quotaStr);
                                 if (isNaN(val2)) val2 = 0;
                                 
                                 
                                 let isGroupStr = groupKey ? String(row[groupKey] || '').toLowerCase().trim() : '';
                                 let isGroup = isGroupStr === 'x';
                                 
                                 let history: Record<string, number> = {};
                                 keys.forEach(k => {
                                     if (k.toLowerCase().includes('tháng') || k.toLowerCase().includes('thang') || /\\d+\\/\\d{4}/.test(k)) {
                                         let hVal = parseFloat(String(row[k] || '0').replace(/,/g, '.'));
                                         if (!isNaN(hVal)) history[k.trim()] = hVal;
                                     }
                                 });

                                 let relation = relationKey ? String(row[relationKey] || '').trim() : '';
                                 if (val1 && val1.toLowerCase() !== 'stt') {
                                     newDinhMuc.push({ name: val1, quota: val2, isGroup, history, relation });
                                 }
                             }
                             if (newDinhMuc.length > 0) {
                                 json.dinhMuc = newDinhMuc;
                                 break;
                             }
                         }
                     }
                  }
               }
            } catch (e) {
               console.error('Error fetching DinhMuc', e);
            }`;

const storeNew = `            // Fetch DinhMuc via CSV
            try {
               const dmSheets = ['DinhMuc', 'Định Mức', 'Dinh muc', 'Định mức'];
               for (const sheetName of dmSheets) {
                  const dmRes = await fetch(\`https://docs.google.com/spreadsheets/d/\${sheetId}/gviz/tq?tqx=out:csv&sheet=\${encodeURIComponent(sheetName)}\`);
                  const dmText = await dmRes.text();
                  if (!dmText.includes('<html') && dmText.trim() && dmText.length > 50) {
                     const { data } = Papa.parse(dmText, { header: false });
                     if (data && data.length > 0) {
                         let headRow = -1;
                         let nameCol = -1, quotaCol = -1, groupCol = -1, relationCol = -1;
                         const historyCols: Record<string, number> = {};
                         
                         for (let r = 0; r < 5; r++) {
                             if (!data[r]) continue;
                             const rowData = data[r] as string[];
                             for (let c = 0; c < rowData.length; c++) {
                                 const val = String(rowData[c] || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
                                 if (val.includes('noi dung') || val.includes('ten') || val.includes('danh muc')) nameCol = c;
                                 if (val.includes('dinh muc') || val.includes('quota') || val.includes('diem') || val.includes('khoi luong') || val.includes('chi tieu')) quotaCol = c;
                                 if (val.includes('chung nhom')) groupCol = c;
                                 if (val.includes('quan he')) relationCol = c;
                                 if (val.includes('thang') || /\\d+\\/\\d{4}/.test(val)) historyCols[String(rowData[c]).trim()] = c;
                             }
                             if (nameCol !== -1) {
                                 headRow = r;
                                 break;
                             }
                         }
            
                         if (headRow !== -1 && nameCol !== -1) {
                             const newDinhMuc: any[] = [];
                             for (let i = headRow + 1; i < data.length; i++) {
                                 const row = data[i] as string[];
                                 if (!row || row.length <= nameCol) continue;
                                 
                                 const val1 = String(row[nameCol] || '').trim();
                                 let quotaStr = quotaCol !== -1 ? String(row[quotaCol] || '0').replace(/,/g, '.') : '0';
                                 let val2 = parseFloat(quotaStr);
                                 if (isNaN(val2)) val2 = 0;
                                 
                                 let isGroupStr = groupCol !== -1 ? String(row[groupCol] || '').toLowerCase().trim() : '';
                                 let isGroup = isGroupStr === 'x';
                                 
                                 let relation = relationCol !== -1 ? String(row[relationCol] || '').trim() : '';
                                 
                                 let history: Record<string, number> = {};
                                 Object.keys(historyCols).forEach(k => {
                                     let colIdx = historyCols[k];
                                     if (colIdx !== undefined && row.length > colIdx) {
                                         let hVal = parseFloat(String(row[colIdx] || '0').replace(/,/g, '.'));
                                         if (!isNaN(hVal)) history[k] = hVal;
                                     }
                                 });
                                 
                                 if (val1 && val1.toLowerCase() !== 'stt' && val1.toLowerCase() !== 'tong' && val1.toLowerCase() !== 'tổng') {
                                     newDinhMuc.push({ name: val1, quota: val2, isGroup, history, relation });
                                 }
                             }
                             
                             if (newDinhMuc.length > 0) {
                                 json.dinhMuc = newDinhMuc;
                                 break;
                             }
                         }
                     }
                  }
               }
            } catch (e) {
               console.error('Error fetching DinhMuc', e);
            }`;

dataStore = dataStore.replace(storeOld, storeNew);
fs.writeFileSync('src/store/DataStore.ts', dataStore, 'utf8');

