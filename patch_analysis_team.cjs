const fs = require('fs');
let code = fs.readFileSync('src/components/AnalysisTab.tsx', 'utf8');

const target2_start = `const teamOverview = useMemo(() => {
      const allMembersData = DataStore.getMembers();
      
      // Calculate member stats with division for group tasks
      const teamMemberStats: Record<string, { member: string; daysWorked: Set<string>; totalStandardDays: number }> = {};
      
      entries.forEach(e => {`;

const repl2_start = `const teamOverview = useMemo(() => {
      const allMembersData = DataStore.getMembers();
      
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
      
      // Calculate member stats with division for group tasks
      const teamMemberStats: Record<string, { member: string; daysWorked: Set<string>; totalStandardDays: number }> = {};
      
      entries.forEach(e => {`;

if (code.includes(target2_start)) {
    code = code.replace(target2_start, repl2_start);
    console.log("Successfully replaced target2_start (teamOverview)");
} else {
    console.log("Could not find target2_start");
}

const target2_usage = `           const isGroupReport = /^\\d+$/.test(lastLine) && parseInt(lastLine, 10) > 0;

           // Năng suất Tổ: Áp dụng cùng công thức năng suất cá nhân
           // - Nếu đi riêng (ID = 0): Không chia
           // - Nếu làm nhóm >= 3 người: khối lượng * 2 / số người
           let qtyPerMember = qty;
           if (isGroupReport && members.length >= 3) {
               qtyPerMember = (qty * 2) / members.length;
           }`;

const repl2_usage = `           const isGroupReport = /^\\d+$/.test(lastLine) && parseInt(lastLine, 10) > 0;
           const groupId = isGroupReport ? parseInt(lastLine, 10) : 0;
           const trueMembersCount = isGroupReport && groupSizes[e.date] && groupSizes[e.date][groupId] 
                                    ? groupSizes[e.date][groupId].size 
                                    : members.length;

           // Năng suất Tổ: Áp dụng cùng công thức năng suất cá nhân
           // - Nếu đi riêng (ID = 0): Không chia
           // - Nếu làm nhóm >= 3 người: khối lượng * 2 / số người
           let qtyPerMember = qty;
           if (isGroupReport && trueMembersCount >= 3) {
               qtyPerMember = (qty * 2) / trueMembersCount;
           }`;

if (code.includes(target2_usage)) {
    code = code.replace(target2_usage, repl2_usage);
    console.log("Successfully replaced target2_usage (teamOverview)");
} else {
    console.log("Could not find target2_usage");
}

fs.writeFileSync('src/components/AnalysisTab.tsx', code, 'utf8');
