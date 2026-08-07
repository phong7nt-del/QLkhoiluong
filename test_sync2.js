async function test() {
  const url = 'https://script.google.com/macros/s/AKfycbyDCcu4I8yfT1g2KOHCRoaDtMMb1gLvfxhP4HJkzFYbqNIg1TSXCyi2HS3D7hDYpInVxQ/exec';
  const formData = new URLSearchParams();
  formData.append('action', 'update_plan_month');
  formData.append('month', 'Tháng 8/2026');
  formData.append('items', JSON.stringify([{name: 'Bấm chì', quantity: 10}]));
  const res = await fetch(url, {
    method: 'POST',
    body: formData
  });
  console.log(await res.text());
}
test();
