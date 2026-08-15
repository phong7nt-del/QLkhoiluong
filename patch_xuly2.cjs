const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

// 1. Add pagination state
code = code.replace(
    `const [listMode, setListMode] = useState<'processed' | 'pending'>('pending');`,
    `const [listMode, setListMode] = useState<'processed' | 'pending'>('pending');\n  const [currentPage, setCurrentPage] = useState(1);\n  const pageSize = 50;`
);

// Reset pagination when dependencies change
code = code.replace(
    `const sortedAndFiltered = useMemo(() => {`,
    `React.useEffect(() => { setCurrentPage(1); }, [listMode, filterText, sortField, sortDir, formData.thoiGianXl]);\n\n  const sortedAndFiltered = useMemo(() => {`
);

// 2. Add pagination slice
code = code.replace(
    `const exportExcel = () => {`,
    `const totalPages = Math.ceil(sortedAndFiltered.length / pageSize);\n  const paginatedData = sortedAndFiltered.slice((currentPage - 1) * pageSize, currentPage * pageSize);\n\n  const exportExcel = () => {`
);

// 3. Update table mapping to use paginatedData instead of sortedAndFiltered
code = code.replace(
    `{sortedAndFiltered.map((row, idx) => (`,
    `{paginatedData.map((row, idx) => (`
);

// Wait, the index should be (currentPage - 1) * pageSize + idx + 1
code = code.replace(
    `<td className="px-4 py-2 font-medium">{idx + 1}</td>`,
    `<td className="px-4 py-2 font-medium">{(currentPage - 1) * pageSize + idx + 1}</td>`
);

// Add Pagination Controls
const oldTbodyEnd = `{sortedAndFiltered.length === 0 && (
                          <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-medium">Không có dữ liệu</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
}`;

const newTbodyEnd = `{sortedAndFiltered.length === 0 && (
                          <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-medium">Không có dữ liệu</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
          {totalPages > 1 && (
             <div className="p-4 border-t border-[#141414] flex justify-between items-center bg-white">
                 <span className="text-sm font-medium text-slate-600">Trang {currentPage} / {totalPages}</span>
                 <div className="flex gap-2">
                     <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-100 border border-slate-300 rounded text-sm font-bold disabled:opacity-50">Trước</button>
                     <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-100 border border-slate-300 rounded text-sm font-bold disabled:opacity-50">Sau</button>
                 </div>
             </div>
          )}
      </div>
    </div>
  );
}`;

code = code.replace(oldTbodyEnd, newTbodyEnd);

// 4. Update the tooltip
const oldImportButton = `<input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
                 <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 bg-[#141414] text-white px-3 py-1.5 font-bold text-sm shadow-[2px_2px_0_#A0A0A0] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50">
                     <Upload className="w-4 h-4" /> {isImporting ? 'Đang Import...' : 'Import Excel'}
                 </button>`;

const newImportButton = `<input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
                 <div className="relative group">
                     <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 bg-[#141414] text-white px-3 py-1.5 font-bold text-sm shadow-[2px_2px_0_#A0A0A0] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50">
                         <Upload className="w-4 h-4" /> {isImporting ? 'Đang Import...' : 'Import Excel'}
                     </button>
                     <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 whitespace-pre-wrap shadow-xl border border-slate-700">
Cấu trúc file Excel mẫu:
• Mã điểm đo (bắt buộc)
• Loại xử lý
• Người thực hiện
• Thời gian thực hiện
• Ghi chú
                     </div>
                 </div>`;

code = code.replace(oldImportButton, newImportButton);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
