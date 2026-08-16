const fs = require('fs');
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

// Add state
code = code.replace(
    `const [isSubmitting, setIsSubmitting] = useState(false);`,
    `const [isSubmitting, setIsSubmitting] = useState(false);\n  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);`
);

// Modify handleDeleteGroup
const oldHandleDelete = `  const handleDeleteGroup = async () => {
      if (members.length === 0) {
          setMessage({ type: 'error', text: "Bạn phải nhập tên của ít nhất 1 thành viên nhóm để xóa báo cáo."});
          return;
      }
      
      const dateParts = date.split('-');
      const formattedDate = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
      
      if (!window.confirm(\`Bạn có muốn xóa nhóm gồm \${members.length} thành viên trong ngày \${formattedDate} không?\`)) {
          return;
      }
      
      setIsSubmitting(true);
      setMessage(null);
      try {
          const ok = await DataStore.deleteWorkloadGroup({ date, members });
          if (ok) {
              setMessage({ type: 'success', text: "Đã xóa báo cáo nhóm thành công!" });
              setMembers([]); // reset
              onSaved();
          } else {
              setMessage({ type: 'error', text: "Có lỗi xảy ra khi xóa báo cáo nhóm." });
          }
      } catch (e) {
          setMessage({ type: 'error', text: "Lỗi hệ thống khi xóa báo cáo." });
      } finally {
          setIsSubmitting(false);
      }
  };`;

const newHandleDelete = `  const triggerDeleteConfirm = () => {
      if (members.length === 0) {
          setMessage({ type: 'error', text: "Bạn phải nhập tên của ít nhất 1 thành viên nhóm để xóa báo cáo."});
          return;
      }
      setShowDeleteConfirm(true);
  };

  const executeDeleteGroup = async () => {
      setShowDeleteConfirm(false);
      setIsSubmitting(true);
      setMessage(null);
      try {
          const ok = await DataStore.deleteWorkloadGroup({ date, members });
          if (ok) {
              setMessage({ type: 'success', text: "Đã xóa báo cáo nhóm thành công!" });
              setMembers([]); // reset
              onSaved();
          } else {
              setMessage({ type: 'error', text: "Có lỗi xảy ra khi xóa báo cáo nhóm." });
          }
      } catch (e) {
          setMessage({ type: 'error', text: "Lỗi hệ thống khi xóa báo cáo." });
      } finally {
          setIsSubmitting(false);
      }
  };`;

code = code.replace(oldHandleDelete, newHandleDelete);

// Update button onClick
code = code.replace(
    `onClick={handleDeleteGroup}`,
    `onClick={triggerDeleteConfirm}`
);

// Add modal UI at the end of the return statement
const oldReturnEnd = `      </form>
    </div>
  );
}`;

const newReturnEnd = `      </form>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xóa báo cáo</h3>
              <p className="text-slate-600 text-sm mb-6">
                Bạn có chắc chắn muốn xóa báo cáo của nhóm gồm <strong className="text-red-600">{members.length}</strong> thành viên trong ngày <strong className="text-blue-600">{date.split('-').reverse().join('/')}</strong> không?
                Hành động này sẽ xóa dữ liệu trên Google Sheets và không thể hoàn tác.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={executeDeleteGroup}
                  className="px-4 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm shadow-red-600/20"
                >
                  Đồng ý xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

code = code.replace(oldReturnEnd, newReturnEnd);

fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
