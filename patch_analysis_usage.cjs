const fs = require('fs');
let code = fs.readFileSync('src/components/AnalysisTab.tsx', 'utf8');

const target1 = `           const isGroupReport = /^\\d+$/.test(lastLine) && parseInt(lastLine, 10) > 0;

           // Năng suất cá nhân:
           // - Nếu đi riêng (ID = 0): Không chia (giữ nguyên khối lượng cho mỗi người)
           // - Nếu làm nhóm:
           //    - Nhóm 1 hoặc 2 người: giữ nguyên khối lượng
           //    - Nhóm >= 3 người: khối lượng * 2 / số người
           let qtyPerMember = qty;
           if (isGroupReport && members.length >= 3) {
               qtyPerMember = (qty * 2) / members.length;
           }`;

const repl1 = `           const isGroupReport = /^\\d+$/.test(lastLine) && parseInt(lastLine, 10) > 0;
           const groupId = isGroupReport ? parseInt(lastLine, 10) : 0;
           const trueMembersCount = isGroupReport && groupSizes[e.date] && groupSizes[e.date][groupId] 
                                    ? groupSizes[e.date][groupId].size 
                                    : members.length;

           // Năng suất cá nhân:
           // - Nếu đi riêng (ID = 0): Không chia (giữ nguyên khối lượng cho mỗi người)
           // - Nếu làm nhóm:
           //    - Nhóm 1 hoặc 2 người: giữ nguyên khối lượng
           //    - Nhóm >= 3 người: khối lượng * 2 / số người
           let qtyPerMember = qty;
           if (isGroupReport && trueMembersCount >= 3) {
               qtyPerMember = (qty * 2) / trueMembersCount;
           }`;

if (code.includes(target1)) {
    code = code.replace(target1, repl1);
    console.log("Successfully replaced target1 (memberOverview)");
} else {
    console.log("Could not find target1");
}

fs.writeFileSync('src/components/AnalysisTab.tsx', code, 'utf8');
