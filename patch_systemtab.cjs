const fs = require('fs');
let content = fs.readFileSync('src/components/SystemTab.tsx', 'utf8');

// 1. Add state for excludeNghi
content = content.replace(
    "const [excludeSun, setExcludeSun] = useState(DataStore.getExcludeSunday());",
    "const [excludeSun, setExcludeSun] = useState(DataStore.getExcludeSunday());\n    const [excludeNghi, setExcludeNghi] = useState(DataStore.getExcludeNghi());"
);

// 2. Add checkbox for excludeNghi
const nghiCheckbox = `
                        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors -ml-2">
                            <input 
                                type="checkbox" 
                                checked={!excludeNghi} 
                                onChange={(e) => {
                                    const newVal = !e.target.checked;
                                    setExcludeNghi(newVal);
                                    DataStore.setExcludeNghi(newVal);
                                }} 
                                className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
                            />
                            <span className="font-medium text-slate-700">Tính năng suất cho các ngày nghỉ (Báo cáo nội dung: Nghỉ)</span>
                        </label>
`;

content = content.replace(
    /(<label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors -ml-2">[\s\S]*?Tính năng suất cho ngày Chủ Nhật<\/span>[\s\S]*?<\/label>)/,
    `$1\n${nghiCheckbox}`
);

fs.writeFileSync('src/components/SystemTab.tsx', content, 'utf8');
console.log("Patched SystemTab.tsx");
