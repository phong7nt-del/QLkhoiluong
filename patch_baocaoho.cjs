const fs = require('fs');

let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

// Add state
if (!code.includes('const [isBaoCaoHo, setIsBaoCaoHo] = useState(false);')) {
    code = code.replace(
        'const [isSubmitting, setIsSubmitting] = useState(false);',
        'const [isSubmitting, setIsSubmitting] = useState(false);\n  const [isBaoCaoHo, setIsBaoCaoHo] = useState(false);'
    );
}

// Update check
const oldCheck = 'if (sessionUser && sessionUser.name && !members.includes(sessionUser.name)) {';
const newCheck = 'if (!isBaoCaoHo && sessionUser && sessionUser.name && !members.includes(sessionUser.name)) {';
if (code.includes(oldCheck)) {
    code = code.replace(oldCheck, newCheck);
}

// Add UI checkbox right before the submit button container (around line 842 pt-6)
const oldUI = '<div className="pt-6 flex gap-3 flex-col sm:flex-row">';
const newUI = `<div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="baocaoho"
            checked={isBaoCaoHo}
            onChange={(e) => setIsBaoCaoHo(e.target.checked)}
            className="w-5 h-5 text-blue-600 bg-slate-50 border-slate-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
          />
          <label htmlFor="baocaoho" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
             Cập nhật báo cáo hộ (nhập công việc thay người khác)
          </label>
        </div>
        
        <div className="pt-6 flex gap-3 flex-col sm:flex-row">`;
if (code.includes(oldUI)) {
    code = code.replace(oldUI, newUI);
}

// Ensure isBaoCaoHo is reset when form completes
const oldReset = `setMembers([]);
    setMemberInput('');
    setPhatHien('không có');`;
const newReset = `setMembers([]);
    setMemberInput('');
    setPhatHien('không có');
    setIsBaoCaoHo(false);`;
if (code.includes(oldReset)) {
    code = code.replace(oldReset, newReset);
}

fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
console.log("Patched WorkloadForm for bao cao ho");
