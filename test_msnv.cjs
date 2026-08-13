const Papa = require('papaparse');
async function run() {
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
  
  for (let i = headRow + 1; i < cbcnvData.length; i++) {
      const row = cbcnvData[i];
      if (row && row.length > Math.max(msnvCol, nameCol)) {
         const msnv = String(row[msnvCol] || '').trim();
         const rawName = String(row[nameCol] || '').trim();
         if (rawName && msnv && (rawName.includes('Phong') || rawName.includes('Nhàn'))) {
             console.log(rawName, '-> MSNV:', msnv);
         }
      }
  }
}
run();
