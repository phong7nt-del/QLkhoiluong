const fs = require('fs');
let code = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

const regex = /const allDates = useMemo\(\(\) => \{/;
const replacement = `  const groupSizes = useMemo(() => {
    const sizes: Record<string, Record<number, Set<string>>> = {};
    filteredEntries.forEach(e => {
        let mbrTokens = e.members || (e as any).workGroup || [];
        if (typeof mbrTokens === 'string') mbrTokens = [mbrTokens];
        const members = (Array.isArray(mbrTokens) && mbrTokens.length > 0) ? mbrTokens : ['Khuyết danh'];
        const linesAll = (e.content || '').split(/\\n/);
        const lastLine = linesAll[linesAll.length - 1].trim();
        if (/^\\d+$/.test(lastLine)) {
            const groupId = parseInt(lastLine, 10);
            if (groupId > 0) {
                const date = e.date;
                if (!sizes[date]) sizes[date] = {};
                if (!sizes[date][groupId]) sizes[date][groupId] = new Set();
                members.forEach(m => sizes[date][groupId].add(m));
            }
        }
    });
    return sizes;
  }, [filteredEntries]);

  const allDates = useMemo(() => {`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    console.log("Successfully inserted groupSizes in Analytics.tsx");
} else {
    console.log("Could not find insertion point in Analytics.tsx");
}

fs.writeFileSync('src/components/Analytics.tsx', code, 'utf8');
