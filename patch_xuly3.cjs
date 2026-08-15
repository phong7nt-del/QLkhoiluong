const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

// Change page size to 20
code = code.replace(
    `const pageSize = 50;`,
    `const pageSize = 20;`
);

// Fix useMemo dependencies
code = code.replace(
    `  }, [xuLyList, filterText, sortField, sortDir]);`,
    `  }, [xuLyList, filterText, sortField, sortDir, listMode, formData.thoiGianXl, defaultThoiGian]);`
);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
