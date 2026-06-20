const obj = {
  STT: '1',
  'Mã trạm': '',
  'Tên điểm đo': 'KH hoặc trạm',
  'Thông số TU': '22000/1200',
  'Thông số TI': '150/5',
  'Kiểm tra TU': 'đúng',
  'Kiểm tra TI': 'đúng',
  'Khác': 'Cosf, P,Q đúng',
  'Kết luận': 'Đúng',
  'Ngày đưa lên': '',
  'Ngày kiểm tra': '',
  'Người đưa lên': '',
  'Người kiểm tra': 'Nguyễn Đình Thái'
};

const getTutiVal = (obj, keys) => {
    const cleanVal = (v) => v;
    for (const k of keys) {
        if (obj[k] !== undefined) {
            return cleanVal(obj[k]);
        }
    }
    const allKeys = Object.keys(obj);
    for (const k of allKeys) {
        const normK = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '').replace(/đ/g, 'd');
        for (const pk of keys) {
            const normPk = pk.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '').replace(/đ/g, 'd');
            if (normK === normPk || normK.includes(normPk)) {
                return cleanVal(obj[k]);
            }
        }
    }
    return '';
};

console.log("TU:", getTutiVal(obj, ['thongSoTU', 'thông số tu', 'tu', 't.u', 'thong_so_tu', 'thong so tu', 'tỷ số tu', 'tỷ số biến tu', 'ty so tu', 'Thông số TU', 'Thông số Tu', 'Thong so Tu', 'Thông số TU/TI', 'Thông số Tu/TI']));
