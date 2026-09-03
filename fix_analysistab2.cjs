const fs = require('fs');
let content = fs.readFileSync('src/components/AnalysisTab.tsx', 'utf8');

const targetStr = `
                if (excludeNghi && e.content) {
                    const cleanContent = e.content.toLowerCase().trim();
                    const isNghi = cleanContent.length < 30 && /(^|\\s)(nghỉ|nghi|ốm|phép)($|\\s)/i.test(cleanContent);
                    if (isNghi) shouldCount = false;
                }
`;

content = content.split(targetStr).join('');

const newContent = `
                let shouldCount = true;
                if (day === 0 && excludeSun) shouldCount = false;
                if (day === 6 && excludeSat) shouldCount = false;
                
                if (excludeNghi && e.content) {
                    const cleanContent = e.content.toLowerCase().trim();
                    const isNghi = cleanContent.length < 30 && /(^|\\s)(nghỉ|nghi|ốm|phép)($|\\s)/i.test(cleanContent);
                    if (isNghi) shouldCount = false;
                }
`;

content = content.replace(/let shouldCount = true;\s*if \(day === 0 && excludeSun\) shouldCount = false;\s*if \(day === 6 && excludeSat\) shouldCount = false;/g, newContent);

fs.writeFileSync('src/components/AnalysisTab.tsx', content, 'utf8');
console.log("Fixed AnalysisTab.tsx again");
