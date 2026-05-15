import Papa from 'papaparse';

async function test() {
    const res = await fetch('https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=CongTac');
    const text = await res.text();
    const { data } = Papa.parse(text);
    console.log("Total rows:", data.length);
    let count = 0;
    for (let r of data) {
        if (r && r[1] && String(r[1]).toLowerCase().includes('họ')) {
            console.log("Header row:", r);
        }
        if (r && r[1] && String(r[1]).trim().length > 0) { // assuming name is in col 1
            count++;
        }
    }
    console.log("Rows with some data in col 1:", count);
}
test();
