const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/{ id: "plan_progress", icon: TrendingUp, label: "Tiến độ kế hoạch", color: "blue" },/, `{ id: "plan_progress", icon: TrendingUp, label: "Tiến độ kế hoạch", color: "blue" },
    { id: "birthday", icon: Gift, label: "Chúc mừng Sinh nhật", color: "rose" },`);

code = code.replace(/{activeTab === "warehouse" && \(\n\s*<WarehouseTab \/>\n\s*\)}/, `{activeTab === "warehouse" && (
                  <WarehouseTab />
                )}
                {activeTab === "birthday" && (
                  <BirthdayTab />
                )}`);

fs.writeFileSync('src/App.tsx', code);
