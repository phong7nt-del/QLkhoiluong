import fetch from "node-fetch";
async function test() {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("KhuVuc")}`);
    const text = await res.text();
    console.log(text.slice(0, 1000));
}
test();
