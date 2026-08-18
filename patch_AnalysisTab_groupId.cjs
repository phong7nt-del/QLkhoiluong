const fs = require('fs');
let code = fs.readFileSync('src/components/AnalysisTab.tsx', 'utf8');

// For memberOverview:
const oldCalc1 = `           // Năng suất cá nhân:
           // - Nhóm 1 hoặc 2 người: giữ nguyên khối lượng
           // - Nhóm >= 3 người: khối lượng * 2 / số người
           let qtyPerMember = qty;
           if (members.length >= 3) {
               qtyPerMember = (qty * 2) / members.length;
           }`;

const newCalc1 = `           // Kiểm tra xem báo cáo này là làm chung (nhóm) hay đi riêng (cá nhân)
           const linesAll = (e.content || '').split(/\\n/);
           const lastLine = linesAll[linesAll.length - 1].trim();
           const isGroupReport = /^\\d+$/.test(lastLine) && parseInt(lastLine, 10) > 0;

           // Năng suất cá nhân:
           // - Nếu đi riêng (ID = 0): Không chia (giữ nguyên khối lượng cho mỗi người)
           // - Nếu làm nhóm:
           //    - Nhóm 1 hoặc 2 người: giữ nguyên khối lượng
           //    - Nhóm >= 3 người: khối lượng * 2 / số người
           let qtyPerMember = qty;
           if (isGroupReport && members.length >= 3) {
               qtyPerMember = (qty * 2) / members.length;
           }`;

if (code.includes(oldCalc1)) {
    code = code.replace(oldCalc1, newCalc1);
    console.log("Patched AnalysisTab memberOverview");
} else {
    console.log("Could not find oldCalc1 in AnalysisTab");
}

// For teamOverview:
const oldCalc2 = `           // Năng suất Tổ: Áp dụng cùng công thức năng suất cá nhân
           // - Nhóm 1 hoặc 2 người: giữ nguyên khối lượng
           // - Nhóm >= 3 người: khối lượng * 2 / số người
           let qtyPerMember = qty;
           if (members.length >= 3) {
               qtyPerMember = (qty * 2) / members.length;
           }`;

const newCalc2 = `           // Kiểm tra xem báo cáo này là làm chung (nhóm) hay đi riêng (cá nhân)
           const linesAll = (e.content || '').split(/\\n/);
           const lastLine = linesAll[linesAll.length - 1].trim();
           const isGroupReport = /^\\d+$/.test(lastLine) && parseInt(lastLine, 10) > 0;

           // Năng suất Tổ: Áp dụng cùng công thức năng suất cá nhân
           // - Nếu đi riêng (ID = 0): Không chia
           // - Nếu làm nhóm >= 3 người: khối lượng * 2 / số người
           let qtyPerMember = qty;
           if (isGroupReport && members.length >= 3) {
               qtyPerMember = (qty * 2) / members.length;
           }`;

if (code.includes(oldCalc2)) {
    code = code.replace(oldCalc2, newCalc2);
    console.log("Patched AnalysisTab teamOverview");
} else {
    console.log("Could not find oldCalc2 in AnalysisTab");
}

fs.writeFileSync('src/components/AnalysisTab.tsx', code, 'utf8');
