const fs = require('fs');
let code = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

// 1. Add state for selectedIds and isDeleting
code = code.replace(
    `const [imageFile, setImageFile] = useState<File | null>(null);`,
    `const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);`
);

// 2. Add canDelete inside the component but using sessionUser logic
code = code.replace(
    `const { userSpecificData, filteredData } = useMemo(() => {`,
    `const sessionUserObj = JSON.parse(sessionStorage.getItem('workload_user_session') || '{}');
  const roleString = String(sessionUserObj.role || '').toLowerCase();
  const canDelete = roleString.includes('tổ trưởng tổ đo xa') || roleString.includes('đội trưởng');
  
  const handleDeleteSelected = async () => {
      if (!canDelete || selectedIds.length === 0) return;
      if (!confirm(\`Bạn có chắc chắn muốn xóa \${selectedIds.length} dòng đang chọn?\`)) return;
      
      setIsDeletingBulk(true);
      const success = await DataStore.deleteDcuBulk(selectedIds);
      if (success) {
          setMessage({ type: 'success', text: \`Đã xóa thành công \${selectedIds.length} dòng.\` });
          setSelectedIds([]);
          loadData();
      } else {
          setMessage({ type: 'error', text: 'Lỗi khi xóa dữ liệu.' });
      }
      setIsDeletingBulk(false);
  };

  const { userSpecificData, filteredData } = useMemo(() => {`
);

// 3. Render checkboxes in table when listType === 'chua_phan_cong'
const headRowTarget = `<th className="px-4 py-3 border-b border-slate-200 w-16">STT</th>`;
const headRowReplacement = `<th className="px-4 py-3 border-b border-slate-200 w-16">
                                    {listType === 'chua_phan_cong' && canDelete ? (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                checked={paginatedData.length > 0 && selectedIds.length === paginatedData.length}
                                                onChange={() => {
                                                    if (selectedIds.length === paginatedData.length) {
                                                        setSelectedIds([]);
                                                    } else {
                                                        setSelectedIds(paginatedData.map(r => r.id));
                                                    }
                                                }}
                                            />
                                            STT
                                        </div>
                                    ) : 'STT'}
                                </th>`;
code = code.replace(headRowTarget, headRowReplacement);

const bodyRowTarget = `<td className="px-4 py-3 font-medium text-slate-700 border-b border-slate-100">{row.stt || ((currentPage - 1) * rowsPerPage + idx + 1)}</td>`;
const bodyRowReplacement = `<td className="px-4 py-3 font-medium text-slate-700 border-b border-slate-100" onClick={(e) => e.stopPropagation()}>
                                    {listType === 'chua_phan_cong' && canDelete ? (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                checked={selectedIds.includes(row.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedIds([...selectedIds, row.id]);
                                                    else setSelectedIds(selectedIds.filter(id => id !== row.id));
                                                }}
                                            />
                                            {row.stt || ((currentPage - 1) * rowsPerPage + idx + 1)}
                                        </div>
                                    ) : (row.stt || ((currentPage - 1) * rowsPerPage + idx + 1))}
                                </td>`;
code = code.replace(bodyRowTarget, bodyRowReplacement);

// 4. Add delete button if any selected
const filterTarget = `<input type="text" placeholder="Tìm kiếm mã, tên, địa chỉ..." `;
const filterReplacement = `{listType === 'chua_phan_cong' && canDelete && selectedIds.length > 0 && (
                            <button 
                                onClick={handleDeleteSelected}
                                disabled={isDeletingBulk}
                                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors"
                            >
                                <X className="w-4 h-4" /> {isDeletingBulk ? 'Đang xóa...' : \`Xóa \${selectedIds.length} dòng\`}
                            </button>
                        )}
                        <input type="text" placeholder="Tìm kiếm mã, tên, địa chỉ..." `;
code = code.replace(filterTarget, filterReplacement);

// 5. Reset selectedIds when listType changes
code = code.replace(
    `<button onClick={() => setListType('chua_phan_cong')}`,
    `<button onClick={() => { setListType('chua_phan_cong'); setSelectedIds([]); }}`
);
code = code.replace(
    `<button onClick={() => setListType('da_xu_ly')}`,
    `<button onClick={() => { setListType('da_xu_ly'); setSelectedIds([]); }}`
);

fs.writeFileSync('src/components/DcuTab.tsx', code);
