const sortConfig = { key: 'planQty', direction: 'desc' };
const arr = [ { name: 'A', planQty: 0 }, { name: 'B', planQty: 35 }, { name: 'C', planQty: 10 } ];
arr.sort((a, b) => {
  if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
  if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
  return 0;
});
console.log(arr);
