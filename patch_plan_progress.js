import fs from 'fs';
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf-8');

// Add sort state
code = code.replace(
  "const [search, setSearch] = useState('');",
  "const [search, setSearch] = useState('');\n  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(null);"
);

// Improve planQty fallback
code = code.replace(
  "if (dm.history[planColumnKey] !== undefined) {",
  "if (dm.history[planColumnKey] !== undefined) {\n                  planQty = dm.history[planColumnKey];\n              } else if (selectedTeam.includes('Đội') && dm.history[`D - ${selectedMonth}`] !== undefined) {\n                  planQty = dm.history[`D - ${selectedMonth}`];\n              } else if (dm.history[planColumnKey] !== undefined) {"
);

// Filter and Sort logic
const filterLogic = `
  const filteredData = planData.filter(d => 
       (d.planQty > 0 || d.actualQty > 0) && 
       d.name.toLowerCase().includes(search.toLowerCase())
  );
`;
const newFilterLogic = `
  const filteredData = useMemo(() => {
    let result = planData.filter(d => 
         (d.planQty > 0 || d.actualQty > 0) && 
         d.name.toLowerCase().includes(search.toLowerCase())
    );
    if (sortConfig !== null) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [planData, search, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
`;
code = code.replace(filterLogic, newFilterLogic);

// Add Sort Indicators to Table headers
code = code.replace(
  '<th className="py-3 px-4 text-left font-semibold text-gray-700 dark:text-gray-200">Công việc</th>',
  '<th className="py-3 px-4 text-left font-semibold text-gray-700 dark:text-gray-200 cursor-pointer" onClick={() => requestSort(\'name\')}>Công việc {sortConfig?.key === \'name\' ? (sortConfig.direction === \'asc\' ? \'↑\' : \'↓\') : \'\'}</th>'
);
code = code.replace(
  '<th className="py-3 px-4 text-center font-semibold text-gray-700 dark:text-gray-200">Kế hoạch</th>',
  '<th className="py-3 px-4 text-center font-semibold text-gray-700 dark:text-gray-200 cursor-pointer" onClick={() => requestSort(\'planQty\')}>Kế hoạch {sortConfig?.key === \'planQty\' ? (sortConfig.direction === \'asc\' ? \'↑\' : \'↓\') : \'\'}</th>'
);
code = code.replace(
  '<th className="py-3 px-4 text-center font-semibold text-gray-700 dark:text-gray-200">Thực hiện</th>',
  '<th className="py-3 px-4 text-center font-semibold text-gray-700 dark:text-gray-200 cursor-pointer" onClick={() => requestSort(\'actualQty\')}>Thực hiện {sortConfig?.key === \'actualQty\' ? (sortConfig.direction === \'asc\' ? \'↑\' : \'↓\') : \'\'}</th>'
);
code = code.replace(
  '<th className="py-3 px-4 text-center font-semibold text-gray-700 dark:text-gray-200">Tiến độ</th>',
  '<th className="py-3 px-4 text-center font-semibold text-gray-700 dark:text-gray-200 cursor-pointer" onClick={() => requestSort(\'progress\')}>Tiến độ {sortConfig?.key === \'progress\' ? (sortConfig.direction === \'asc\' ? \'↑\' : \'↓\') : \'\'}</th>'
);

fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
