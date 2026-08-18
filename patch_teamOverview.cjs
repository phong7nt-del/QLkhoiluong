const fs = require('fs');
let code = fs.readFileSync('src/components/AnalysisTab.tsx', 'utf8');

const oldCalcTeam = `           // Năng suất Tổ: Chia đều khối lượng nhóm cho số người
           let qtyPerMember = qty;
           if (isGroup && members.length > 0) {
               qtyPerMember = qty / members.length;
           }`;

const newCalcTeam = `           // Năng suất Tổ: Áp dụng cùng công thức năng suất cá nhân
           // - Nhóm 1 hoặc 2 người: giữ nguyên khối lượng
           // - Nhóm >= 3 người: khối lượng * 2 / số người
           let qtyPerMember = qty;
           if (members.length >= 3) {
               qtyPerMember = (qty * 2) / members.length;
           }`;

if (code.includes(oldCalcTeam)) {
    code = code.replace(oldCalcTeam, newCalcTeam);
    fs.writeFileSync('src/components/AnalysisTab.tsx', code, 'utf8');
    console.log("Patched teamOverview successfully");
} else {
    console.log("Could not find oldCalcTeam in AnalysisTab");
}
