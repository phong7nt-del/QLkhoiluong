import Papa from 'papaparse';
async function test() {
  const dmRes = await fetch('https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('Định mức') + '&_t=' + Date.now());
  const dmText = await dmRes.text();
  const dmData = Papa.parse(dmText, { header: true }).data;
  console.log(Object.keys(dmData[0]).filter(k => k.includes('8/2026')).map(k => "'" + k + "' (" + k.length + " chars)"));
}
test();
