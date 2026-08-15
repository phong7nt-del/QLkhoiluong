const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

const filterLogic = `
    const targetDate = formData.thoiGianXl || defaultThoiGian;
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
    });
`;

code = code.replace(
    "const targetDate = formData.thoiGianXl || defaultThoiGian;\n    result = result.filter(item => String(item.thoiGianXl).trim() === String(targetDate).trim());",
    filterLogic
);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
