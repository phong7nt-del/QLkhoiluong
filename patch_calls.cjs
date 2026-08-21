const fs = require('fs');
let code = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

// Update signature
const target1 = `  const renderContentWithQuota = (content: string, membersCount: number) => {`;
const repl1 = `  const renderContentWithQuota = (content: string, membersCount: number, date: string) => {`;

// Update internal reference
const target2 = `          const trueMembersCount = isGroupReport && groupSizes[e.date] && groupSizes[e.date][groupId] 
                                   ? groupSizes[e.date][groupId].size 
                                   : membersCount;`;
const repl2 = `          const trueMembersCount = isGroupReport && groupSizes[date] && groupSizes[date][groupId] 
                                   ? groupSizes[date][groupId].size 
                                   : membersCount;`;

const target3 = `{renderContentWithQuota(row.content, row.entry.members?.length || 1)}`;
const repl3 = `{renderContentWithQuota(row.content, row.entry.members?.length || 1, row.entry.date)}`;

const target4 = `{renderContentWithQuota(e.content, e.members?.length || 1)}`;
const repl4 = `{renderContentWithQuota(e.content, e.members?.length || 1, e.date)}`;

if (code.includes(target1)) code = code.replace(target1, repl1);
if (code.includes(target2)) code = code.replace(target2, repl2);
if (code.includes(target3)) code = code.replace(target3, repl3);
if (code.includes(target4)) code = code.replace(target4, repl4);

fs.writeFileSync('src/components/Analytics.tsx', code, 'utf8');
