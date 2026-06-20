import fetch from 'node-fetch';

async function test() {
    const url = 'https://script.google.com/macros/s/AKfycbyDCcu4I8yfT1g2KOHCRoaDtMMb1gLvfxhP4HJkzFYbqNIg1TSXCyi2HS3D7hDYpInVxQ/exec';
    const res = await fetch(`${url}?action=getData&_t=${new Date().getTime()}`);
    const json = await res.json();
    console.log("Keys in json.tuti[0]:", Object.keys(json.tuti[0]));
    console.log("json.tuti[0]:", json.tuti[0]);
}
test();
