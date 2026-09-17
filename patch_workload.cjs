const fs = require('fs');
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

code = code.replace(/const handleSubmit = async \(e: React.FormEvent\) => \{/, `const isDateLocked = (dStr: string, teamName: string) => {
    if (!dStr || !teamName) return false;
    const d = new Date(dStr);
    const pChar = getTeamPrefix(teamName);
    const mPrefix = pChar ? \`\${pChar} -\` : "Tháng";
    const yPrefix = pChar ? \`\${pChar} -\` : "Năm";
    const monthKey = \`\${mPrefix} \${d.getMonth() + 1}/\${d.getFullYear()}R\`;
    const yearKey = \`\${yPrefix} \${d.getFullYear()}R\`;
    const lockedMonth = dinhMucList.some(dm => dm.history && dm.history[monthKey] !== undefined);
    const lockedYear = dinhMucList.some(dm => dm.history && dm.history[yearKey] !== undefined);
    if (lockedYear) return { locked: true, type: 'year', year: d.getFullYear() };
    if (lockedMonth) return { locked: true, type: 'month', month: d.getMonth() + 1, year: d.getFullYear() };
    return { locked: false };
  };

  const handleSubmit = async (e: React.FormEvent) => {`);

code = code.replace(/if \(!team \|\| members\.length === 0 \|\| !date \|\| selectedList\.length === 0\) \{/, `const lockCheck = isDateLocked(date, team);
    if (lockCheck.locked) {
      setMessage({ type: 'error', text: \`Không thể cập nhật báo cáo. Dữ liệu của \${team} trong \${lockCheck.type === 'year' ? \`năm \${lockCheck.year}\` : \`tháng \${lockCheck.month}/\${lockCheck.year}\`} đã được chốt!\` });
      setTimeout(() => setMessage(null), 5000);
      return;
    }
    if (!team || members.length === 0 || !date || selectedList.length === 0) {`);
    
code = code.replace(/const triggerDeleteConfirm = \(\) => \{/, `const triggerDeleteConfirm = () => {
      const lockCheck = isDateLocked(date, team);
      if (lockCheck.locked) {
        setMessage({ type: 'error', text: \`Không thể xóa báo cáo. Dữ liệu của \${team} trong \${lockCheck.type === 'year' ? \`năm \${lockCheck.year}\` : \`tháng \${lockCheck.month}/\${lockCheck.year}\`} đã được chốt!\` });
        setTimeout(() => setMessage(null), 5000);
        return;
      }`);

fs.writeFileSync('src/components/WorkloadForm.tsx', code);
