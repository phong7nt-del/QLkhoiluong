const Papa = require('papaparse');
async function run() {
  const normalizeStr = (str) => {
    if (!str) return '';
    return str.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'd')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '');
  };

  const cbcnvRes = await fetch(`https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=CBCNV`);
  const cbcnvText = await cbcnvRes.text();
  const cbcnvData = Papa.parse(cbcnvText, { header: false }).data;
  
  let headRow = -1, msnvCol = -1, nameCol = -1;
  for (let r = 0; r < 5; r++) {
       if (!cbcnvData[r]) continue;
       for (let c = 0; c < cbcnvData[r].length; c++) {
           const val = String(cbcnvData[r][c] || '').toLowerCase().trim();
           if (val.includes('mã nhân viên') || val.includes('msnv')) {
               msnvCol = c;
               headRow = r;
           }
           if (val.includes('họ và tên') || val === 'họ tên') nameCol = c;
       }
       if (headRow !== -1) break;
  }
  
  const cbcnvMap = new Map();
  for (let i = headRow + 1; i < cbcnvData.length; i++) {
      const row = cbcnvData[i];
      if (row && row.length > Math.max(msnvCol, nameCol)) {
         const msnv = String(row[msnvCol] || '').trim();
         const rawName = String(row[nameCol] || '').trim();
         if (rawName && msnv) {
            cbcnvMap.set(rawName.toLowerCase().replace(/\s+/g, ''), { msnv });
            cbcnvMap.set(normalizeStr(rawName), { msnv });
         }
      }
  }

  const ctRes = await fetch(`https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=CongTac`);
  const ctText = await ctRes.text();
  const ctData = Papa.parse(ctText, { header: false }).data;
  
  let ctHeadRow = -1, ctNameCol = -1;
  for(let r=0; r<5; r++) {
      if(ctData[r]) {
          for(let c=0; c<ctData[r].length; c++) {
              const val = String(ctData[r][c] || '').toLowerCase().trim();
              if (val.includes('họ và tên') || val === 'họ tên') {
                  ctHeadRow = r;
                  ctNameCol = c;
              }
          }
      }
      if(ctHeadRow !== -1) break;
  }
  
  let missing = 0;
  for (let i = ctHeadRow + 1; i < ctData.length; i++) {
      const row = ctData[i];
      if (!row || !row[ctNameCol]) continue;
      const rawName = row[ctNameCol].trim();
      if (!rawName) continue;
      
      const keyOld = rawName.toLowerCase().replace(/\s+/g, '');
      const keyNew = normalizeStr(rawName);
      
      if (!cbcnvMap.has(keyOld)) {
          console.log('Old key missed:', rawName);
      }
      if (!cbcnvMap.has(keyNew)) {
          missing++;
          console.log('New key also missed:', rawName);
      }
  }
  console.log('Total missed with new key:', missing);
}
run();
