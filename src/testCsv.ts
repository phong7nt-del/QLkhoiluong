async function test() {
    const tutiRes = await fetch(`https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("TUTI")}`);
    const tutiText = await tutiRes.text();
    console.log(tutiText.slice(0, 1000));
}
test();
