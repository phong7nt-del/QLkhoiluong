import fs from 'fs';
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf-8');

code = code.replace(
  "className={`sm:w-1/3 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 ${isSubmittingPlan ? 'opacity-50 cursor-not-allowed text-white/50' : 'hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0'}`}",
  "className={`sm:w-1/3 py-4 bg-gradient-to-r text-white font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-2 ${(isSubmittingPlan || !hasSelectedTasks) ? 'from-slate-400 to-slate-500 opacity-50 cursor-not-allowed shadow-none' : 'from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0'}`}"
);

fs.writeFileSync('src/components/WorkloadForm.tsx', code);
