const targetDateStr = "14/08/2026";
const targetDateStrAlt = "14/08";
const cellDateStrs = ["14/8/2026", "14/08/2026", "14/8", "14/08", "14/8/2026 "];

for (const cellDateStr of cellDateStrs) {
    let match = false;
    const cleanCell = cellDateStr.trim();
    if (cleanCell === targetDateStr || cleanCell === targetDateStrAlt) match = true;
    
    // Check if cell "14/8/2026" matches target "14/08/2026"
    // Remove all '0' before '/'
    const stripZero = s => s.replace(/0(\d)/g, '$1');
    if (stripZero(cleanCell) === stripZero(targetDateStr) || stripZero(cleanCell) === stripZero(targetDateStrAlt)) match = true;
    console.log(cellDateStr, '->', match);
}
