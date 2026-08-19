const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add PermissionStore import
code = code.replace(`import DataStore from './store/DataStore';`, `import DataStore from './store/DataStore';\nimport { PermissionStore } from './store/PermissionStore';`);

// Add SystemTab import
code = code.replace(`import ConfigModal from './components/ConfigModal';`, `import ConfigModal from './components/ConfigModal';\nimport SystemTab from './components/SystemTab';`);

// Update role checks
code = code.replace(
    `const roleStr = sessionUser?.role ? sessionUser.role.toLowerCase() : '';
  const isManagement = ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'].some(r => roleStr.includes(r));
  const isDoiTruong = ['đội trưởng', 'giám đốc'].some(r => roleStr.includes(r));`,
    `const roleStr = sessionUser?.role ? sessionUser.role.toLowerCase() : '';
  // Fallback vars (deprecated by PermissionStore but kept for backwards compatibility in other parts)
  const isManagement = ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'].some(r => roleStr.includes(r));
  const isDoiTruong = ['đội trưởng', 'giám đốc'].some(r => roleStr.includes(r));`
);

// Update tabs array using PermissionStore
const oldTabsLogic = `  const tabs: any[] = [
    { id: "input", icon: ClipboardList, label: "Cập nhật", color: "blue" },
    { id: "report", icon: BarChart3, label: "Báo cáo", color: "blue" },
    { id: "stations", icon: Database, label: "Link báo cáo", color: "blue" },
    { id: "analysis", icon: TrendingUp, label: "Phân tích", color: "blue" },
    { id: "disconnect", icon: WifiOff, label: "Đo xa", color: "red" },
    { id: "search", icon: Search, label: "Tìm kiếm", color: "green" },
      ];

  if (isManagement) {
    tabs.push({ id: "progress", icon: CheckSquare, label: "Tiến độ CV", color: "amber" });
    tabs.push({ id: "tuti", icon: Activity, label: "KT TU - TI", color: "indigo" });
    tabs.push({ id: "plan_progress", icon: TrendingUp, label: "Tiến độ kế hoạch", color: "blue" });
  }
  tabs.push({ id: "sangtai", icon: Database, label: "KT sang tải", color: "amber" });
  if (isDoiTruong) {
    tabs.push({ id: "warehouse", icon: Package, label: "Kho VTTB", color: "amber" });
  }`;

const newTabsLogic = `  const allTabs = [
    { id: "input", icon: ClipboardList, label: "Cập nhật", color: "blue" },
    { id: "report", icon: BarChart3, label: "Báo cáo", color: "blue" },
    { id: "stations", icon: Database, label: "Link báo cáo", color: "blue" },
    { id: "analysis", icon: TrendingUp, label: "Phân tích", color: "blue" },
    { id: "disconnect", icon: WifiOff, label: "Đo xa", color: "red" },
    { id: "search", icon: Search, label: "Tìm kiếm", color: "green" },
    { id: "progress", icon: CheckSquare, label: "Tiến độ CV", color: "amber" },
    { id: "tuti", icon: Activity, label: "KT TU - TI", color: "indigo" },
    { id: "plan_progress", icon: TrendingUp, label: "Tiến độ kế hoạch", color: "blue" },
    { id: "sangtai", icon: Database, label: "KT sang tải", color: "amber" },
    { id: "warehouse", icon: Package, label: "Kho VTTB", color: "amber" },
    { id: "system", icon: Settings, label: "Hệ thống", color: "slate" }
  ];

  const tabs = allTabs.filter(tab => PermissionStore.hasTabAccess(tab.id, roleStr));`;

if (code.includes(oldTabsLogic)) {
    code = code.replace(oldTabsLogic, newTabsLogic);
    console.log("Patched tabs logic");
} else {
    console.log("Could not find oldTabsLogic");
}

// Update Active Tab logic
const oldActiveTabContent = `{activeTab === "warehouse" && (
                  <WarehouseTab />
                )}`;
const newActiveTabContent = `{activeTab === "warehouse" && (
                  <WarehouseTab />
                )}
                {activeTab === "system" && (
                  <SystemTab />
                )}`;

if (code.includes(oldActiveTabContent)) {
    code = code.replace(oldActiveTabContent, newActiveTabContent);
    console.log("Patched active tab content");
} else {
    console.log("Could not find oldActiveTabContent");
}

// Update Config Gear visibility
const oldGear = `<button 
              onClick={() => setShowConfig(true)}
              className="text-white hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors border border-transparent hover:border-white/30 backdrop-blur-md"
              title="Cấu hình hệ thống"
            >
              <Settings className="w-5 h-5" />
            </button>`;
const newGear = `{PermissionStore.hasActionAccess('config_system', roleStr) && (
            <button 
              onClick={() => setShowConfig(true)}
              className="text-white hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors border border-transparent hover:border-white/30 backdrop-blur-md"
              title="Cấu hình hệ thống"
            >
              <Settings className="w-5 h-5" />
            </button>
            )}`;

if (code.includes(oldGear)) {
    code = code.replace(oldGear, newGear);
    console.log("Patched config gear");
} else {
    console.log("Could not find oldGear");
}


// Fix progress checking
code = code.replace(`{activeTab === "progress" && isManagement && (`, `{activeTab === "progress" && (`);
code = code.replace(`{activeTab === "plan_progress" && isManagement && (`, `{activeTab === "plan_progress" && (`);
code = code.replace(`{activeTab === "tuti" && isManagement && (`, `{activeTab === "tuti" && (`);


fs.writeFileSync('src/App.tsx', code, 'utf8');
