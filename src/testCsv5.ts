import Papa from 'papaparse';

const getVal = (row, opts) => {
    const cleanVal = (v) => v;
    for (const k of Object.keys(row)) {
        const normalizedK = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
        if (opts.some(opt => {
            const normalizedOpt = opt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
            return normalizedK === normalizedOpt;
        })) {
            let v = row[k] ? String(row[k]) : '';
            if (v.startsWith("'")) v = v.substring(1);
            return cleanVal(v);
        }
    }
    return '';
};

async function test() {
    const tutiRes = await fetch(`https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("TUTI")}`);
    const tutiText = await tutiRes.text();
    const { data: tutiData } = Papa.parse(tutiText, { header: true });
    
    if (tutiData.length > 0) {
        console.log("TU (row 0):", getVal(tutiData[0], ['thông số tu', 'tu', 't.u', 'thong_so_tu', 'thong so tu', 'tỷ số tu', 'thông số tu/ti', 'thong so tu/ti']));
        console.log("TI (row 0):", getVal(tutiData[0], ['thông số ti', 'ti', 't.i', 'thong_so_ti', 'thong so ti', 'tỷ số ti', 'thông số tu/ti', 'thong so tu/ti']));
    }
}
test();
