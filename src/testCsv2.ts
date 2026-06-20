import Papa from 'papaparse';

async function test() {
    const tutiRes = await fetch(`https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("TUTI")}`);
    const tutiText = await tutiRes.text();
    const { data: tutiData } = Papa.parse(tutiText, { header: true });
    
    if (tutiData.length > 0) {
        console.log("Keys:");
        for(const k of Object.keys(tutiData[0])) {
            const normalizedK = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
            console.log(`Original: '${k}' => Normalized: '${normalizedK}'`);
            
            console.log(`Matched 'thong so tu'?`, normalizedK === 'thong so tu');
        }
        
        console.log("Row 0 original:");
        console.log(tutiData[0]);
    }
}
test();
