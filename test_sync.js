async function test() {
  const url = 'https://script.google.com/macros/s/AKfycbyDCcu4I8yfT1g2KOHCRoaDtMMb1gLvfxhP4HJkzFYbqNIg1TSXCyi2HS3D7hDYpInVxQ/exec';
  const data = {
    action: 'update_plan_month',
    month: 'Tháng 8/2026',
    items: JSON.stringify([{name: 'Bấm chì', quantity: 10}])
  };
  console.log('Sending:', data);
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  });
  console.log(await res.text());
}
test();
