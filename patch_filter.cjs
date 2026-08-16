const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

const oldFilterBlock = `    const targetDate = formData.thoiGianXl || defaultThoiGian;
    const dateParts = targetDate.split('-');
    let targetFormats = [targetDate];
    if (dateParts.length === 3) {
        const [tY, tM, tD] = dateParts;
        targetFormats.push(\`\${tD}/\${tM}/\${tY}\`);
        targetFormats.push(\`\${parseInt(tD, 10)}/\${parseInt(tM, 10)}/\${tY}\`);
    }

    result = result.filter(item => {
        const itemDate = String(item.thoiGianXl).trim();
        return targetFormats.some(f => itemDate.includes(f));
    });`;

if (code.includes(oldFilterBlock)) {
    code = code.replace(oldFilterBlock, "");
    
    // Also let's add thoiGianXl to the text filter
    const oldTextFilter = `(item.ketQua?.toLowerCase().includes(lower))`;
    const newTextFilter = `(item.ketQua?.toLowerCase().includes(lower)) ||\n           (item.thoiGianXl?.toLowerCase().includes(lower))`;
    code = code.replace(oldTextFilter, newTextFilter);
    
    fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
    console.log("Filter removed successfully.");
} else {
    console.log("Could not find the filter block.");
}
