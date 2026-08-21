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

// Let's find where renderContentWithQuota is called.
