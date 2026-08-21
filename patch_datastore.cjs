const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const oldGetDinhMuc = `getDinhMuc: (): { name: string; quota: number; isGroup?: boolean; history?: Record<string, number> }[] => {`;
const newGetDinhMuc = `getDinhMuc: (): { name: string; quota: number; isGroup?: boolean; history?: Record<string, number>; relation?: string }[] => {`;
code = code.replace(oldGetDinhMuc, newGetDinhMuc);

const oldKeys = `                         const groupKey = keys.find(k => {
                             const nk = k.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
                             return nk.includes('chung nhom');
                         });`;
const newKeys = `                         const groupKey = keys.find(k => {
                             const nk = k.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
                             return nk.includes('chung nhom');
                         });
                         const relationKey = keys.find(k => {
                             const nk = k.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
                             return nk.includes('quan he');
                         });`;
if(code.includes(oldKeys)) {
    code = code.replace(oldKeys, newKeys);
} else {
    console.log("Could not find oldKeys");
}

const oldPush = `                                 if (val1 && val1.toLowerCase() !== 'stt') {
                                     newDinhMuc.push({ name: val1, quota: val2, isGroup, history });
                                 }`;
const newPush = `                                 let relation = relationKey ? String(row[relationKey] || '').trim() : '';
                                 if (val1 && val1.toLowerCase() !== 'stt') {
                                     newDinhMuc.push({ name: val1, quota: val2, isGroup, history, relation });
                                 }`;
if(code.includes(oldPush)) {
    code = code.replace(oldPush, newPush);
} else {
    console.log("Could not find oldPush");
}

fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
console.log("Patched DataStore.ts");
