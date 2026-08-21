const fs = require('fs');
let code = fs.readFileSync('src/components/AnalysisTab.tsx', 'utf8');

const regex = /const memberOverview = useMemo\(\(\) => \{\n\s*const stats: Record<string, \{ member: string; daysWorked: Set<string>; totalStandardDays: number \}> = \{\};\n\s*entries\.forEach\(e => \{/;
const replacement = `const memberOverview = useMemo(() => {
     const stats: Record<string, { member: string; daysWorked: Set<string>; totalStandardDays: number }> = {};
     
     // Build true group sizes across all entries for the same date and group ID
     const groupSizes: Record<string, Record<number, Set<string>>> = {};
     entries.forEach(e => {
        let mbrTokens = e.members || (e as any).workGroup || [];
        if (typeof mbrTokens === 'string') mbrTokens = [mbrTokens];
        const members = (Array.isArray(mbrTokens) && mbrTokens.length > 0) ? mbrTokens : ['Khuyết danh'];
        const linesAll = (e.content || '').split(/\\n/);
        const lastLine = linesAll[linesAll.length - 1].trim();
        if (/^\\d+$/.test(lastLine)) {
            const groupId = parseInt(lastLine, 10);
            if (groupId > 0) {
                const date = e.date;
                if (!groupSizes[date]) groupSizes[date] = {};
                if (!groupSizes[date][groupId]) groupSizes[date][groupId] = new Set();
                members.forEach(m => groupSizes[date][groupId].add(m));
            }
        }
     });

     entries.forEach(e => {`;

if(code.match(regex)) {
    code = code.replace(regex, replacement);
    console.log("Successfully replaced start of memberOverview");
} else {
    console.log("Could not find memberOverview start");
}

fs.writeFileSync('src/components/AnalysisTab.tsx', code, 'utf8');
