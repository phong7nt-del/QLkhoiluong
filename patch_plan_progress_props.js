import fs from 'fs';
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf-8');

code = code.replace(
  "export default function PlanProgressTab() {",
  "export default function PlanProgressTab({ refreshToggle }: { refreshToggle?: number }) {"
);

code = code.replace(
  "const dinhMucList = useMemo(() => DataStore.getDinhMuc(), []);",
  "const dinhMucList = useMemo(() => DataStore.getDinhMuc(), [refreshToggle]);"
);

code = code.replace(
  "const entries = useMemo(() => DataStore.getEntries(), []);",
  "const entries = useMemo(() => DataStore.getEntries(), [refreshToggle]);"
);

fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
