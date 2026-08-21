const fs = require('fs');
let code = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

const target_start = `    const calculateDetailedStats = (entries: WorkloadEntry[]) => {`;
const repl_start = `    const calculateDetailedStats = (entries: WorkloadEntry[]) => {
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
`;

if (code.includes(target_start)) {
    code = code.replace(target_start, repl_start);
    console.log("Successfully replaced target_start in Analytics");
} else {
    console.log("Could not find target_start in Analytics");
}

const target_usage1 = `          const lastLine = linesAll[linesAll.length - 1].trim();
          const isGroupReport = /^\\d+$/.test(lastLine) && parseInt(lastLine, 10) > 0;

          let qtyPerMember = qty;
          if (isGroupReport && membersCount >= 3) {
              qtyPerMember = (qty * 2) / membersCount;
          }`;

const repl_usage1 = `          const lastLine = linesAll[linesAll.length - 1].trim();
          const isGroupReport = /^\\d+$/.test(lastLine) && parseInt(lastLine, 10) > 0;
          const groupId = isGroupReport ? parseInt(lastLine, 10) : 0;
          const trueMembersCount = isGroupReport && groupSizes[e.date] && groupSizes[e.date][groupId] 
                                   ? groupSizes[e.date][groupId].size 
                                   : membersCount;

          let qtyPerMember = qty;
          if (isGroupReport && trueMembersCount >= 3) {
              qtyPerMember = (qty * 2) / trueMembersCount;
          }`;

if (code.includes(target_usage1)) {
    code = code.replace(target_usage1, repl_usage1);
    console.log("Successfully replaced target_usage1 in Analytics");
} else {
    console.log("Could not find target_usage1 in Analytics");
}

const target_usage2 = `                const linesAll = content.split('\\n');
                const lastLine = linesAll[linesAll.length - 1].trim();
                const isGroupReport = /^\\d+$/.test(lastLine) && parseInt(lastLine, 10) > 0;

                let qtyPerMember = totalQty;
                if (isGroupReport && membersCount >= 3) {
                    qtyPerMember = (totalQty * 2) / membersCount;
                }`;

const repl_usage2 = `                const linesAll = content.split('\\n');
                const lastLine = linesAll[linesAll.length - 1].trim();
                const isGroupReport = /^\\d+$/.test(lastLine) && parseInt(lastLine, 10) > 0;
                const groupId = isGroupReport ? parseInt(lastLine, 10) : 0;
                // Note: e is available because we are inside map over filteredEntries
                const trueMembersCount = isGroupReport && groupSizes[e.date] && groupSizes[e.date][groupId] 
                                         ? groupSizes[e.date][groupId].size 
                                         : membersCount;

                let qtyPerMember = totalQty;
                if (isGroupReport && trueMembersCount >= 3) {
                    qtyPerMember = (totalQty * 2) / trueMembersCount;
                }`;

if (code.includes(target_usage2)) {
    code = code.replace(target_usage2, repl_usage2);
    console.log("Successfully replaced target_usage2 in Analytics");
} else {
    console.log("Could not find target_usage2 in Analytics");
}

fs.writeFileSync('src/components/Analytics.tsx', code, 'utf8');
