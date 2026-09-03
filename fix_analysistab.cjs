const fs = require('fs');
let content = fs.readFileSync('src/components/AnalysisTab.tsx', 'utf8');

const regex = /if \(excludeNghi && e\.content\) \{\s*const cleanContent = e\.content\.toLowerCase\(\)\.trim\(\);\s*const isNghi = cleanContent\.length < 30 && \/\(\^\\\|\\\\s\)\(nghỉ\\\|nghi\\\|ốm\\\|phép\)\(\$\\\|\\\\s\)\/i\.test\(cleanContent\);\s*if \(isNghi\) shouldCount = false;\s*\}/g;

content = content.replace(
    /if \(excludeNghi && e\.content\) \{\s*const cleanContent = e\.content\.toLowerCase\(\)\.trim\(\);\s*const isNghi = cleanContent\.length < 30 && \/\(\^\\\|\\\\s\)\(nghỉ\\\|nghi\\\|ốm\\\|phép\)\(\$\\\|\\\\s\)\/i\.test\(cleanContent\);\s*if \(isNghi\) shouldCount = false;\s*\}\s*if \(excludeNghi && e\.content\) \{\s*const cleanContent = e\.content\.toLowerCase\(\)\.trim\(\);\s*const isNghi = cleanContent\.length < 30 && \/\(\^\\\|\\\\s\)\(nghỉ\\\|nghi\\\|ốm\\\|phép\)\(\$\\\|\\\\s\)\/i\.test\(cleanContent\);\s*if \(isNghi\) shouldCount = false;\s*\}/g,
    `if (excludeNghi && e.content) {
                    const cleanContent = e.content.toLowerCase().trim();
                    const isNghi = cleanContent.length < 30 && /(^|\\s)(nghỉ|nghi|ốm|phép)($|\\s)/i.test(cleanContent);
                    if (isNghi) shouldCount = false;
                }`
);

fs.writeFileSync('src/components/AnalysisTab.tsx', content, 'utf8');
console.log("Fixed AnalysisTab.tsx");
