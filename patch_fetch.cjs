const fs = require('fs');
let code = fs.readFileSync('src/components/DisconnectRateTab.tsx', 'utf8');

code = code.replace(
  "      const stations = DataStore.getStations();",
  "      const stations = DataStore.getStations();\n      const xuLyData = await DataStore.getXuLyDoXa();\n      setXuLyList(xuLyData);"
);

fs.writeFileSync('src/components/DisconnectRateTab.tsx', code, 'utf8');
