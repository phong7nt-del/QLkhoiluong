import fs from 'fs';
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf-8');

const calcStr = `  const hasSelectedTasks = Object.values(selectedTasks).some(data => data.selected && typeof data.quantity === 'number' && data.quantity > 0);`;

code = code.replace(
  "const [isSubmitting, setIsSubmitting] = useState(false);",
  "const [isSubmitting, setIsSubmitting] = useState(false);\n" + calcStr
);

code = code.replace(
  "disabled={isSubmittingPlan}",
  "disabled={isSubmittingPlan || !hasSelectedTasks}"
);

fs.writeFileSync('src/components/WorkloadForm.tsx', code);
