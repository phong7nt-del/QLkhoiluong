const fs = require('fs');
let content = fs.readFileSync('src/components/AnalysisTab.tsx', 'utf8');

// 1. Add excludeNghi to useMemo
content = content.replace(
    "const excludeSun = useMemo(() => DataStore.getExcludeSunday(), [refreshToggle]);",
    "const excludeSun = useMemo(() => DataStore.getExcludeSunday(), [refreshToggle]);\n  const excludeNghi = useMemo(() => DataStore.getExcludeNghi(), [refreshToggle]);"
);

// 2. Add isNghi check in calculateMemberStats (first block)
const nghiCheck1 = `
                let shouldCount = true;
                if (day === 0 && excludeSun) shouldCount = false;
                if (day === 6 && excludeSat) shouldCount = false;
                
                if (excludeNghi && e.content) {
                    const cleanContent = e.content.toLowerCase().trim();
                    const isNghi = cleanContent.length < 30 && /(^|\\s)(nghỉ|nghi|ốm|phép)($|\\s)/i.test(cleanContent);
                    if (isNghi) shouldCount = false;
                }
`;
content = content.replace(
    /let shouldCount = true;\s*if \(day === 0 && excludeSun\) shouldCount = false;\s*if \(day === 6 && excludeSat\) shouldCount = false;/,
    nghiCheck1
);

// 3. (Optional) Check if there's a second block (yes, teamMemberStats)
// We already replaced globally if we use string replace? No, string replace only replaces first occurrence if not regex.
// Let's just use regex with global flag to replace all.
content = content.replace(
    /let shouldCount = true;\s*if \(day === 0 && excludeSun\) shouldCount = false;\s*if \(day === 6 && excludeSat\) shouldCount = false;/g,
    nghiCheck1
);

fs.writeFileSync('src/components/AnalysisTab.tsx', content, 'utf8');
console.log("Patched AnalysisTab.tsx");
