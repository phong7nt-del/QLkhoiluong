const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

// Add state for bulk delete
code = code.replace(
    `const [saveError, setSaveError] = useState<string | null>(null);`,
    `const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);`
);

// Add permission check and handler
code = code.replace(
    `const handleSort = (field: string) => {`,
    `const sessionUserObj = JSON.parse(sessionStorage.getItem('workload_user_session') || '{}');
    const roleString = String(sessionUserObj.role || '').toLowerCase();
    const canDelete = roleString.includes('tổ trưởng tổ đo xa') || roleString.includes('đội trưởng');
    
    const handleDeleteSelected = async () => {
        if (!canDelete || selectedIds.length === 0) return;
        if (!confirm(\`Bạn có chắc chắn muốn xóa \${selectedIds.length} dòng đang chọn?\`)) return;
        
        setIsDeletingBulk(true);
        const success = await DataStore.deleteXuLyDoXaBulk(selectedIds);
        if (success) {
            setSelectedIds([]);
            refreshData(); // reload
        } else {
            alert('Lỗi khi xóa dữ liệu.');
        }
        setIsDeletingBulk(false);
    };

    const handleSort = (field: string) => {`
);

// Render checkbox in header when pending & canDelete
const thStt = `<th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('stt')}>STT {sortField === 'stt' && (sortDir === 'asc' ? '↑' : '↓')}</th>`;
const newThStt = `<th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('stt')}>
                              {listMode === 'pending' && canDelete ? (
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                      <input 
                                          type="checkbox" 
                                          className="w-4 h-4 rounded border-slate-600 text-blue-500 bg-slate-700"
                                          checked={paginatedData.length > 0 && selectedIds.length === paginatedData.length}
                                          onChange={() => {
                                              if (selectedIds.length === paginatedData.length) {
                                                  setSelectedIds([]);
                                              } else {
                                                  setSelectedIds(paginatedData.map(r => r.maDd));
                                              }
                                          }}
                                      />
                                      STT {sortField === 'stt' && (sortDir === 'asc' ? '↑' : '↓')}
                                  </div>
                              ) : <>STT {sortField === 'stt' && (sortDir === 'asc' ? '↑' : '↓')}</>}
                          </th>`;
code = code.replace(thStt, newThStt);

// Render checkbox in body
const tdStt = `<td className="px-4 py-2 font-medium">{(currentPage - 1) * pageSize + idx + 1}</td>`;
const newTdStt = `<td className="px-4 py-2 font-medium" onClick={e => e.stopPropagation()}>
                                  {listMode === 'pending' && canDelete ? (
                                      <div className="flex items-center gap-2">
                                          <input 
                                              type="checkbox" 
                                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                              checked={selectedIds.includes(row.maDd)}
                                              onChange={(e) => {
                                                  if (e.target.checked) setSelectedIds([...selectedIds, row.maDd]);
                                                  else setSelectedIds(selectedIds.filter(id => id !== row.maDd));
                                              }}
                                          />
                                          {(currentPage - 1) * pageSize + idx + 1}
                                      </div>
                                  ) : ((currentPage - 1) * pageSize + idx + 1)}
                              </td>`;
code = code.replace(tdStt, newTdStt);

// Add delete button next to import
const importBtn = `<input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />`;
const newImportBtn = `{listMode === 'pending' && canDelete && selectedIds.length > 0 && (
                     <button 
                         onClick={handleDeleteSelected}
                         disabled={isDeletingBulk}
                         className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 font-bold text-sm shadow-[2px_2px_0_#A0A0A0] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50"
                     >
                         {isDeletingBulk ? 'Đang xóa...' : \`Xóa \${selectedIds.length} dòng\`}
                     </button>
                 )}
                 <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />`;
code = code.replace(importBtn, newImportBtn);

// Reset selection on list mode change
code = code.replace(
    `<button onClick={() => setListMode('pending')}`,
    `<button onClick={() => { setListMode('pending'); setSelectedIds([]); }}`
);
code = code.replace(
    `<button onClick={() => setListMode('processed')}`,
    `<button onClick={() => { setListMode('processed'); setSelectedIds([]); }}`
);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code);
