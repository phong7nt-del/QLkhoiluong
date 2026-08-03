import fs from 'fs';

let code = fs.readFileSync('src/components/WarehouseTab.tsx', 'utf-8');

code = code.replace(/const saveKhoToSheetAndLocal = async \((.*?)\) => \{[\s\S]*?DataStore\.syncKhoToSheet\(khoRows\);\n  \};/, 
`const saveKhoToLocal = (newZones: Zone[], w: number, h: number) => {
    setZones(newZones);
    setWarehouseWidth(w);
    setWarehouseHeight(h);
    localStorage.setItem('warehouse_zones_v1', JSON.stringify(newZones));
    localStorage.setItem('warehouse_size_v1', JSON.stringify({ w, h }));
  };`);

// Replace all calls
code = code.replace(/saveKhoToSheetAndLocal/g, "saveKhoToLocal");

fs.writeFileSync('src/components/WarehouseTab.tsx', code);
