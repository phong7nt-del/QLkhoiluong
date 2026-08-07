import Papa from 'papaparse';

async function test() {
  const t = await fetch('https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('Định mức') + '&_t=' + Date.now()).then(r => r.text());
  
  const parsed = Papa.parse(t, { header: true, skipEmptyLines: true });
  const records = parsed.data;
  
  const keys = Object.keys(records[0] || {});
  console.log("Keys:", keys);
  
  const d = records.find(r => r['Nội dung'] && r['Nội dung'].includes('Bảo dưỡng'));
  if (d) {
     let history = {};
     keys.forEach(k => {
         if (k.toLowerCase().includes('tháng') || k.toLowerCase().includes('thang') || /\d+\/\d{4}/.test(k)) {
             let hVal = parseFloat(String(d[k] || '0').replace(/,/g, '.'));
             if (!isNaN(hVal)) history[k.trim()] = hVal;
         }
     });
     console.log("History for", d['Nội dung'], ":", history);
  }
}
test();
