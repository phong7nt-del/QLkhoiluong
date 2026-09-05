const fs = require('fs');

let content = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

// 1. Add pagination states
content = content.replace(
    /const \[search, setSearch\] = useState\(''\);/,
    `const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;`
);

// 2. Add formatCoord helper
content = content.replace(
    /const filteredData = useMemo/,
    `const formatCoord = (val: any) => {
      if (!val) return '';
      let s = String(val).replace(/,/g, '.').replace(/\\s/g, '');
      let parts = s.split('.');
      if (parts.length > 2) {
          return parts[0] + '.' + parts.slice(1).join('');
      }
      return s;
  };

  const filteredData = useMemo`
);

// 3. Reset pagination on search
content = content.replace(
    /onChange=\{e => setSearch\(e\.target\.value\)\}/,
    `onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}`
);

// 4. Calculate pagination
content = content.replace(
    /return \(\s*<div className="space-y-6">/,
    `
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="space-y-6">`
);

// 5. Update mapped data to paginatedData
content = content.replace(
    /filteredData\.map\(\(row, idx\)/,
    `paginatedData.map((row, idx)`
);

// 6. Fix row stt calculation
content = content.replace(
    /row\.stt || \(idx \+ 1\)/,
    `row.stt || ((currentPage - 1) * rowsPerPage + idx + 1)`
);

// 7. Add pagination UI at the end of the table
const tableEndStr = `                </tbody>
            </table>
        </div>`;
const paginationStr = `                </tbody>
            </table>
        </div>
        
        {totalPages > 1 && (
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                    Hiển thị {((currentPage - 1) * rowsPerPage) + 1} - {Math.min(currentPage * rowsPerPage, filteredData.length)} / {filteredData.length}
                </span>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded border border-slate-200 bg-white text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Trước
                    </button>
                    <span className="px-3 py-1 text-sm font-medium text-slate-700">
                        {currentPage} / {totalPages}
                    </span>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded border border-slate-200 bg-white text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Sau
                    </button>
                </div>
            </div>
        )}`;
content = content.replace(tableEndStr, paginationStr);

// 8. Update coordinates link and address directions
content = content.replace(
    /<td className="px-4 py-3 text-slate-700 border-b border-slate-100">\{row\.diaChi\}<\/td>\s*<td className="px-4 py-3 text-slate-600 text-xs border-b border-slate-100">\s*\{row\.toadoX && row\.toadoY \? \(\s*<a href=\{`https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=\$\{row\.toadoX\},\$\{row\.toadoY\}`\} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">\s*<MapPin className="w-3 h-3" \/> \{row\.toadoX\}, \{row\.toadoY\}\s*<\/a>\s*\) : ''\}\s*<\/td>/,
    `<td className="px-4 py-3 text-slate-700 border-b border-slate-100">
        <div className="flex flex-col gap-1">
            <span>{row.diaChi}</span>
            {row.toadoX && row.toadoY ? (
                <a href={\`https://www.google.com/maps/dir/?api=1&destination=\${formatCoord(row.toadoX)},\${formatCoord(row.toadoY)}\`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 font-medium text-xs hover:underline flex items-center gap-1 inline-flex w-fit bg-blue-50 px-2 py-0.5 rounded">
                    <MapPin className="w-3 h-3" /> Chỉ đường
                </a>
            ) : null}
        </div>
    </td>
    <td className="px-4 py-3 text-slate-600 text-xs border-b border-slate-100">
        {row.toadoX && row.toadoY ? (
            <a href={\`https://www.google.com/maps/search/?api=1&query=\${formatCoord(row.toadoX)},\${formatCoord(row.toadoY)}\`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {formatCoord(row.toadoX)}, {formatCoord(row.toadoY)}
            </a>
        ) : ''}
    </td>`
);

fs.writeFileSync('src/components/DcuTab.tsx', content, 'utf8');
console.log('Fixed DcuTab.tsx');
