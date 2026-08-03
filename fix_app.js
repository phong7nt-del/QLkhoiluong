import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Move { id: "warehouse", icon: Package, label: "Kho VTTB", color: "amber" } 
// from initial tabs array to conditionally inside if (isDoiTruong)

// Remove from initial array
code = code.replace('{ id: "warehouse", icon: Package, label: "Kho VTTB", color: "amber" },\n', '');
code = code.replace('{ id: "warehouse", icon: Package, label: "Kho VTTB", color: "amber" }\n', '');
code = code.replace('{ id: "warehouse", icon: Package, label: "Kho VTTB", color: "amber" }', '');

// Add to isDoiTruong block
const blockToAdd = `
  if (isDoiTruong) {
    tabs.push({ id: "warehouse", icon: Package, label: "Kho VTTB", color: "amber" });
  }
`;

code = code.replace('tabs.push({ id: "sangtai", icon: Database, label: "KT sang tải", color: "amber" });', 
'tabs.push({ id: "sangtai", icon: Database, label: "KT sang tải", color: "amber" });' + blockToAdd);

// Don't need to change rendering because activeTab === "warehouse" will just never match if the button is hidden, 
// but it's safe if it stays in the switch.

fs.writeFileSync('src/App.tsx', code);
