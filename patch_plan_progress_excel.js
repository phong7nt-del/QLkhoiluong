import fs from 'fs';
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf-8');

// Add import
if (!code.includes("import * as XLSX")) {
    code = code.replace("import { Calendar", "import * as XLSX from 'xlsx';\nimport { Calendar, FileSpreadsheet, Eye, EyeOff, ");
}

// Add showAll state
if (!code.includes("showAllTasks")) {
    code = code.replace("const [sortConfig", "const [showAllTasks, setShowAllTasks] = useState(false);\n  const [sortConfig");
}

// Modify filteredData
code = code.replace(
    "let result = planData.filter(d => \n         (d.planQty > 0 || d.actualQty > 0) && \n         d.name.toLowerCase().includes(search.toLowerCase())\n    );",
    "let result = planData.filter(d => \n         (showAllTasks || d.planQty > 0 || d.actualQty > 0) && \n         d.name.toLowerCase().includes(search.toLowerCase())\n    );"
);

fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
