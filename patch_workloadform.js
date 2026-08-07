import fs from 'fs';
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf-8');

// 1. Add isManagement prop
code = code.replace("export default function WorkloadForm({ onSaved, refreshToggle }: { onSaved: () => void, refreshToggle: number }) {", 
"export default function WorkloadForm({ onSaved, refreshToggle, isManagement }: { onSaved: () => void, refreshToggle: number, isManagement?: boolean }) {");

// 2. Add handlePlanSubmit function
const planSubmitCode = `
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);
  const handlePlanSubmit = async () => {
    const entries = Object.entries(selectedTasks) as [string, {selected: boolean, quantity: number | string}][];
    const selectedList = entries.filter(([_, data]) => data.selected && typeof data.quantity === 'number' && data.quantity > 0).map(([name, data]) => ({name, quantity: data.quantity as number}));
    
    if (selectedList.length === 0) {
      setMessage({ type: 'error', text: "Vui lòng chọn ít nhất 1 nội dung để lập kế hoạch" });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    if (!date) {
      setMessage({ type: 'error', text: "Vui lòng chọn ngày để lấy thông tin Tháng/Năm" });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    const d = new Date(date);
    const monthYear = \`Tháng \${d.getMonth() + 1}/\${d.getFullYear()}\`;
    
    if (!window.confirm(\`Bạn có chắc muốn lưu Kế hoạch cho \${monthYear} không?\`)) return;

    setIsSubmittingPlan(true);
    const success = await DataStore.syncPlanToSheet(monthYear, selectedList);
    setIsSubmittingPlan(false);

    if (success) {
       setMessage({ type: 'success', text: "Đã lưu kế hoạch tháng thành công!" });
       setTimeout(() => setMessage(null), 5000);
    } else {
       setMessage({ type: 'error', text: "Có lỗi xảy ra khi lưu kế hoạch." });
       setTimeout(() => setMessage(null), 5000);
    }
  };
`;
code = code.replace("const [isSubmitting, setIsSubmitting] = useState(false);", planSubmitCode + "\n  const [isSubmitting, setIsSubmitting] = useState(false);");

// 3. Add button in UI
const buttonsUI = `
        <div className="pt-6 flex gap-3 flex-col sm:flex-row">
          <button 
            type="submit"
            disabled={isSubmitting || members.length === 0}
            className={\`flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 \${isSubmitting ? 'opacity-50 cursor-not-allowed text-white/50' : 'hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0'}\`}
          >
            {isSubmitting ? 'ĐANG ĐỒNG BỘ...' : 'Cập Nhật Lên Hệ Thống [Enter]'}
          </button>
          
          {isManagement && (
              <button 
                type="button"
                onClick={handlePlanSubmit}
                disabled={isSubmittingPlan}
                className={\`sm:w-1/3 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 \${isSubmittingPlan ? 'opacity-50 cursor-not-allowed text-white/50' : 'hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0'}\`}
              >
                {isSubmittingPlan ? 'ĐANG LƯU...' : 'Lưu Kế hoạch Tháng'}
              </button>
          )}
        </div>
`;

code = code.replace(/<div className="pt-6">[\s\S]*?<\/button>[\s\S]*?<\/p>\n        <\/div>/, buttonsUI);

fs.writeFileSync('src/components/WorkloadForm.tsx', code);
