import fetch from 'node-fetch';

const getTutiVal = (obj, keys) => {
    const cleanVal = (v) => v;
    for (const k of keys) {
        if (obj[k] !== undefined) {
            let v = String(obj[k]);
            if (v.startsWith("\'")) v = v.substring(1);
            return cleanVal(v);
        }
    }
    const allKeys = Object.keys(obj);
    for (const k of allKeys) {
        const normK = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '').replace(/đ/g, 'd');
        for (const pk of keys) {
            const normPk = pk.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '').replace(/đ/g, 'd');
            if (normK === normPk || normK.includes(normPk)) {
                let v = String(obj[k]);
                if (v.startsWith("\'")) v = v.substring(1);
                return cleanVal(v);
            }
        }
    }
    return '';
};

async function test() {
    const url = 'https://script.google.com/macros/s/AKfycbyDCcu4I8yfT1g2KOHCRoaDtMMb1gLvfxhP4HJkzFYbqNIg1TSXCyi2HS3D7hDYpInVxQ/exec';
    const res = await fetch(`${url}?action=getData&_t=${new Date().getTime()}`);
    const json = await res.json();
    
    const formattedTuti = json.tuti.map((item, index) => ({
        id: `${getTutiVal(item, ['maTram', 'mã trạm']).trim()}-${getTutiVal(item, ['tenDiemDo', 'tên điểm đo']).trim()}-${index}`.replace(/\s+/g, '-').toLowerCase(),
        thongSoTU: getTutiVal(item, ['thongSoTU', 'thông số tu', 'tu', 't.u', 'thong_so_tu', 'thong so tu', 'tỷ số tu', 'tỷ số biến tu', 'ty so tu', 'Thông số TU', 'Thông số Tu', 'Thong so Tu', 'Thông số TU/TI', 'Thông số Tu/TI']),
        thongSoTI: getTutiVal(item, ['thongSoTI', 'thông số ti', 'ti', 't.i', 'thong_so_ti', 'thong so ti', 'tỷ số ti', 'tỷ số biến ti', 'ty so ti', 'Thông số TI', 'Thông số Ti', 'Thong so Ti', 'Thông số TU/TI', 'Thông số Tu/TI']),
    }));
    
    console.log(formattedTuti.slice(0, 4));
}
test();
