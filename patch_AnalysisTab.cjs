const fs = require('fs');
let code = fs.readFileSync('src/components/AnalysisTab.tsx', 'utf8');

const oldCalc = `           // Năng suất cá nhân: Giữ nguyên khối lượng nhóm cho mỗi người
           let qtyPerMember = qty;
           
           members.forEach(m => {`;

const newCalc = `           // Năng suất cá nhân:
           // - Nhóm 1 hoặc 2 người: giữ nguyên khối lượng
           // - Nhóm >= 3 người: khối lượng * 2 / số người
           let qtyPerMember = qty;
           if (members.length >= 3) {
               qtyPerMember = (qty * 2) / members.length;
           }
           
           members.forEach(m => {`;

if (code.includes(oldCalc)) {
    code = code.replace(oldCalc, newCalc);
    fs.writeFileSync('src/components/AnalysisTab.tsx', code, 'utf8');
    console.log("Patched AnalysisTab successfully");
} else {
    console.log("Could not find oldCalc in AnalysisTab");
}
