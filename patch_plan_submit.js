import fs from 'fs';
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf-8');
const searchCode = `
    const monthYear = \`\${prefix} \${d.getMonth() + 1}/\${d.getFullYear()}\`;
`;
const replaceCode = `
    const monthYear = \`\${prefix} \${d.getMonth() + 1}/\${d.getFullYear()}\`;
    
    // Check if plan already exists for this team and month
    const existingPlan = dinhMucList.some(dm => dm.history && dm.history[monthYear] !== undefined && dm.history[monthYear] > 0);
    if (existingPlan) {
      setMessage({ type: 'error', text: \`Kế hoạch cho \${team} trong tháng \${d.getMonth() + 1}/\${d.getFullYear()} đã tồn tại.\` });
      setTimeout(() => setMessage(null), 5000);
      return;
    }
`;
code = code.replace(searchCode, replaceCode);
fs.writeFileSync('src/components/WorkloadForm.tsx', code);
