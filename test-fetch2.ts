import Papa from 'papaparse';

async function test() {
  const cRes = await fetch("https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=CBCNV");
  const cText = await cRes.text();
  const cData = Papa.parse(cText, { header: false }).data;
  console.log('CBCNV row 0:', cData[0]);

  const tRes = await fetch("https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=CongTac");
  const tText = await tRes.text();
  const tData = Papa.parse(tText, { header: false }).data;
  console.log('CongTac row 0:', tData[0]);
}

test();
