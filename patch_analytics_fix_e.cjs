const fs = require('fs');
let code = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

const target1 = `    const processContentLines = (content: string, membersCount: number) => {`;
const repl1 = `    const processContentLines = (content: string, membersCount: number, date: string) => {`;

const target2 = `                // Note: e is available because we are inside map over filteredEntries
                const trueMembersCount = isGroupReport && groupSizes[e.date] && groupSizes[e.date][groupId] 
                                         ? groupSizes[e.date][groupId].size 
                                         : membersCount;`;
const repl2 = `                const trueMembersCount = isGroupReport && groupSizes[date] && groupSizes[date][groupId] 
                                         ? groupSizes[date][groupId].size 
                                         : membersCount;`;

const target3 = `            const parsedLines = processContentLines(e.content, membersCount);`;
const repl3 = `            const parsedLines = processContentLines(e.content, membersCount, e.date);`;

if (code.includes(target1) && code.includes(target2) && code.includes(target3)) {
    code = code.replace(target1, repl1);
    code = code.replace(target2, repl2);
    code = code.replace(target3, repl3);
    console.log("Successfully fixed processContentLines in Analytics.tsx");
} else {
    console.log("Could not find targets in Analytics.tsx");
}

fs.writeFileSync('src/components/Analytics.tsx', code, 'utf8');
