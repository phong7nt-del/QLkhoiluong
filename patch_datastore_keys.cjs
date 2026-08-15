const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const parseLogic = `
         const data = Papa.parse(text, { header: true }).data;
         const filtered = data.filter((row: any) => row && Object.keys(row).length > 0);
         return filtered.map((row: any) => {
            const getVal = (possibleKeys) => {
                const rowKey = Object.keys(row).find(k => possibleKeys.includes(k.trim().toLowerCase().replace(/[\\s_]+/g, '')));
                return rowKey ? row[rowKey] : undefined;
            };
            return {
                stt: getVal(['stt']),
                loaiXl: getVal(['loaixl', 'loạixl']),
                nguoiXl: getVal(['nguoixl', 'ngườixl']),
                thoiGianXl: getVal(['thoigianxl', 'thờigianxl']),
                maDd: getVal(['madd', 'mãdd', 'mãđđ']),
                cachXl: getVal(['cachxl', 'cáchxl']),
                ketQua: getVal(['ketqua', 'kếtquả']),
                ghiChu: getVal(['ghichu', 'ghichú'])
            };
         }).filter(item => item.stt || item.maDd || item.nguoiXl);
`;

code = code.replace(/         const data = Papa\.parse[\s\S]*?\}\);/m, parseLogic.trim());

fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
