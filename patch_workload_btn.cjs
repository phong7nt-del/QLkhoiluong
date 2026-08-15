const fs = require('fs');
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

// 1. Add sessionUser state
const oldState = `  const [filteredMembers, setFilteredMembers] = useState<string[]>([]);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);`;

const newState = `  const [filteredMembers, setFilteredMembers] = useState<string[]>([]);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [sessionUser, setSessionUser] = useState<SheetMember | null>(null);
  
  useEffect(() => {
    const stored = sessionStorage.getItem('workload_user_session');
    if (stored) {
       try { setSessionUser(JSON.parse(stored)); } catch(e){}
    }
  }, []);
  
  const isDeleteAllowed = () => {
      if (!sessionUser) return false;
      const roleStr = sessionUser.role ? sessionUser.role.toLowerCase() : '';
      const isTeamLeader = roleStr.includes('tổ trưởng') || roleStr.includes('tổ phó');
      const isDeptLeader = roleStr.includes('đội trưởng') || roleStr.includes('đội phó') || roleStr.includes('giám đốc');
      
      if (isDeptLeader) return true;
      if (isTeamLeader) {
          const allM = DataStore.getMembers();
          for (const m of members) {
              const memberInfo = allM.find(x => x.name === m);
              if (memberInfo && memberInfo.team === sessionUser.team) {
                  return true;
              }
          }
      }
      return false;
  };
  
  const handleDeleteGroup = async () => {
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
code = code.replace(oldState, newState);

// 2. Add Delete Button next to "Cập nhật"
const oldBtns = `        <div className="flex flex-col gap-3">
          <button 
            type="submit"
            disabled={isSubmitting || members.length === 0}
            className={\`flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 \${isSubmitting ? 'opacity-50 cursor-not-allowed text-white/50' : 'hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0'}\`}
          >
            {isSubmitting ? 'ĐANG ĐỒNG BỘ...' : 'Cập Nhật Lên Hệ Thống [Enter]'}
          </button>
          
          {isManagement && (
              <button 
                type="button"`;

const newBtns = `        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
              <button 
                type="submit"
                disabled={isSubmitting || members.length === 0}
                className={\`flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 \${isSubmitting ? 'opacity-50 cursor-not-allowed text-white/50' : 'hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0'}\`}
              >
                {isSubmitting ? 'ĐANG ĐỒNG BỘ...' : 'Cập Nhật Lên Hệ Thống [Enter]'}
              </button>
              
              {isDeleteAllowed() && (
                  <button
                     type="button"
                     disabled={isSubmitting}
                     onClick={handleDeleteGroup}
                     className={\`px-6 py-4 bg-red-100 text-red-600 font-bold text-base rounded-xl transition-all shadow-sm border border-red-200 flex items-center justify-center gap-2 \${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-200 hover:text-red-700 hover:-translate-y-0.5'}\`}
                  >
                     Xóa báo cáo
                  </button>
              )}
          </div>
          
          {isManagement && (
              <button 
                type="button"`;
code = code.replace(oldBtns, newBtns);

fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
