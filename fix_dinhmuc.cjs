const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

code = code.replace(
/const nameKey = keys\.find\(k => \{\s*const nk = k\.normalize\('NFD'\)\.replace\(\/\[\\u0300-\\u036f\]\/g, ''\)\.replace\(\/đ\/g, 'd'\)\.replace\(\/Đ\/g, 'D'\)\.toLowerCase\(\);\s*return nk\.includes\('noi dung'\) \|\| nk\.includes\('ten'\);\s*\}\);/,
`const nameKey = keys.find(k => {
                             const nk = k.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
                             return nk.includes('noi dung') || nk.includes('ten') || nk.includes('danh muc');
                         });`
);

code = code.replace(
/const quotaKey = keys\.find\(k => \{\s*const nk = k\.normalize\('NFD'\)\.replace\(\/\[\\u0300-\\u036f\]\/g, ''\)\.replace\(\/đ\/g, 'd'\)\.replace\(\/Đ\/g, 'D'\)\.toLowerCase\(\);\s*return nk\.includes\('dinh muc'\) \|\| nk\.includes\('quota'\) \|\| nk\.includes\('diem'\);\s*\}\);/,
`const quotaKey = keys.find(k => {
                             const nk = k.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
                             return nk.includes('dinh muc') || nk.includes('quota') || nk.includes('diem') || nk.includes('khoi luong') || nk.includes('chi tieu');
                         });`
);

fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
