const id = '1';
const entries = [{ id: '1', ketLuan: '' }];
const finalUpdates = { ketLuan: 'Đúng' };
const optimisticEntry = { ...(entries.find(e => e.id === id) || {}), ...finalUpdates };
console.log(optimisticEntry);
