import fs from 'fs';

async function test() {
  const url = "https://script.google.com/macros/s/AKfycbyDCcu4I8yfT1g2KOHCRoaDtMMb1gLvfxhP4HJkzFYbqNIg1TSXCyi2HS3D7hDYpInVxQ/exec?action=getData";
  console.log('Fetching...');
  const res = await fetch(url);
  const json = await res.json();
  const stations = json.stations || [];
  console.log('total stations:', stations.length);
  if (stations.length > 0) {
    console.log('first 3 stations:', stations.slice(0, 3));
    const areas = new Set();
    for (const st of stations) {
      if (st.area) areas.add(st.area);
      if (st['Khu vực']) areas.add(st['Khu vực']);
    }
    console.log('areas found:', Array.from(areas));
  }
}
test();
