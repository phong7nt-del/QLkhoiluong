import fetch from 'node-fetch';

async function test() {
    const url = 'https://script.google.com/macros/s/AKfycbyDCcu4I8yfT1g2KOHCRoaDtMMb1gLvfxhP4HJkzFYbqNIg1TSXCyi2HS3D7hDYpInVxQ/exec';
    const res = await fetch(`${url}?action=getData&_t=${new Date().getTime()}`);
    const json = await res.json();
    console.log("Row 0:", json.tuti[0].thongSoTU, json.tuti[0].thongSoTI);
    console.log("Row 1:", json.tuti[1].thongSoTU, json.tuti[1].thongSoTI);
    console.log("Row 2:", json.tuti[2].thongSoTU, json.tuti[2].thongSoTI);
    console.log("Row 3:", json.tuti[3].thongSoTU, json.tuti[3].thongSoTI);
}
test();
