import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Import PlanProgressTab
code = code.replace(
  'import WarehouseTab from "./components/WarehouseTab";',
  'import WarehouseTab from "./components/WarehouseTab";\nimport PlanProgressTab from "./components/PlanProgressTab";'
);

// Add to tabs array
code = code.replace(
  'tabs.push({ id: "tuti", icon: Activity, label: "KT TU - TI", color: "indigo" });',
  'tabs.push({ id: "tuti", icon: Activity, label: "KT TU - TI", color: "indigo" });\n    tabs.push({ id: "plan_progress", icon: TrendingUp, label: "Tiến độ kế hoạch", color: "blue" });'
);

// Add to switch
const renderTab = `                {activeTab === "progress" && isManagement && (
                  <ProgressTab refreshToggle={refreshToggle} sessionUser={sessionUser} theme={theme} />
                )}
                {activeTab === "plan_progress" && isManagement && (
                  <PlanProgressTab />
                )}`;
code = code.replace(
`                {activeTab === "progress" && isManagement && (
                  <ProgressTab refreshToggle={refreshToggle} sessionUser={sessionUser} theme={theme} />
                )}`, renderTab);

fs.writeFileSync('src/App.tsx', code);
