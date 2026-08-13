const fs = require('fs');
let code = fs.readFileSync('src/components/DisconnectRateTab.tsx', 'utf8');

code = code.replace(
  "  useEffect(() => {\n     fetchData();\n  }, [refreshToggle]);",
  "  useEffect(() => {\n    if (subTab === 'xuly') {\n        fetchXuLyData();\n    } else {\n        fetchData();\n    }\n  }, [refreshToggle]);\n\n  useEffect(() => {\n      if (subTab !== 'xuly') {\n          fetchData();\n      }\n  }, [subTab]);"
);

fs.writeFileSync('src/components/DisconnectRateTab.tsx', code, 'utf8');
