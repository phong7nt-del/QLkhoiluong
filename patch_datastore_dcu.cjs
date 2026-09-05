const fs = require('fs');
let content = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const strToReplace = `         return data.map((r: any) => ({
             stt: r['STT'] || r['stt'] || '',
             id: r['ID'] || r['id'] || '',
             ten: r['Tên'] || r['ten'] || '',
             toadoX: r['Tọa độ X'] || r['toadoX'] || '',
             toadoY: r['Tọa độ Y'] || r['toadoY'] || '',
             hinhAnh: r['Hình ảnh'] || r['hinhAnh'] || '',
             ghiChu: r['Ghi chú'] || r['ghiChu'] || ''
         }));`;

const newStr = `         return data.map((r: any) => {
             // Hàm hỗ trợ tìm key linh hoạt (bỏ qua hoa thường, khoảng trắng)
             const findKey = (possibleNames: string[]) => {
                 const keys = Object.keys(r);
                 for (let k of keys) {
                     const lowerK = k.toLowerCase().trim();
                     if (possibleNames.some(p => lowerK === p.toLowerCase().trim())) {
                         return r[k];
                     }
                 }
                 return '';
             };
             
             return {
                 stt: findKey(['STT']),
                 id: findKey(['ID']),
                 ten: findKey(['Tên', 'Ten', 'Tên DCU']),
                 diaChi: findKey(['Địa chỉ', 'Dia chi', 'Địa Chỉ']),
                 toadoX: findKey(['Tọa độ X', 'toadoX', 'Vĩ độ']),
                 toadoY: findKey(['Tọa độ Y', 'toadoY', 'Kinh độ']),
                 hinhAnh: findKey(['Hình ảnh', 'hinhAnh', 'Ảnh']),
                 ghiChu: findKey(['Ghi chú', 'ghiChu'])
             };
         });`;

content = content.replace(strToReplace, newStr);
fs.writeFileSync('src/store/DataStore.ts', content, 'utf8');
console.log('Patched DataStore.ts getDcu');
