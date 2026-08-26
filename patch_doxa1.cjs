const fs = require('fs');

// 1. DataStore.ts
let ds = fs.readFileSync('src/store/DataStore.ts', 'utf8');

ds = ds.replace('maDd: string;', 'maDd: string;\n  tenKh?: string;');
ds = ds.replace(
    "maDd: getVal(['madd', 'mãdd', 'mãđđ']),",
    "maDd: getVal(['madd', 'mãdd', 'mãđđ']),\n                tenKh: getVal(['tenkh', 'tênkh', 'tênkháchhàng']),"
);

fs.writeFileSync('src/store/DataStore.ts', ds, 'utf8');
console.log("Patched DataStore.ts");

