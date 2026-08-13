const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

code = code.replace(
  "return data.filter((row: any) => row && Object.keys(row).length > 0 && (row['STT'] || row['stt'] || row['Nguoi XL'] || row['Ma DD']));",
  "const filtered = data.filter((row: any) => row && Object.keys(row).length > 0 && (row['STT'] || row['stt'] || row['Người XL'] || row['Nguoi XL'] || row['Mã DD'] || row['Ma DD']));\n         return filtered.map((row: any) => ({\n            stt: row['STT'] || row['stt'],\n            loaiXl: row['Loại XL'] || row['Loai XL'] || row['loaiXl'],\n            nguoiXl: row['Người XL'] || row['Nguoi XL'] || row['nguoiXl'],\n            thoiGianXl: row['Thời gian XL'] || row['Thoi gian XL'] || row['thoiGianXl'],\n            maDd: row['Mã DD'] || row['Ma DD'] || row['maDd'],\n            cachXl: row['Cách XL'] || row['Cach XL'] || row['cachXl'],\n            ketQua: row['Kết quả'] || row['Ket qua'] || row['KetQua'] || row['ketQua'],\n            ghiChu: row['Ghi chú'] || row['Ghi chu'] || row['ghiChu']\n         }));"
);

fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
