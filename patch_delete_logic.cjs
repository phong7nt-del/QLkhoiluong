const fs = require('fs');
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

const oldTrigger = `  const triggerDeleteConfirm = () => {
      if (members.length === 0) {
          setMessage({ type: 'error', text: "Bạn phải nhập tên của ít nhất 1 thành viên nhóm để xóa báo cáo."});
          return;
      }
      if (members.length >= 2) {
          setMessage({ type: 'error', text: "Chỉ được xóa báo cáo cá nhân. Không được phép xóa báo cáo nhóm từ 2 người trở lên." });
          return;
      }
      setShowDeleteConfirm(true);
  };`;

const newTrigger = `  const [membersToDelete, setMembersToDelete] = useState<string[]>([]);
  const triggerDeleteConfirm = () => {
      if (members.length === 0) {
          setMessage({ type: 'error', text: "Bạn phải chọn 1 thành viên để xóa báo cáo."});
          return;
      }
      if (members.length >= 2) {
          setMessage({ type: 'error', text: "Vui lòng chỉ chọn 1 thành viên để xóa. Hệ thống sẽ tự động tìm và xóa cả nhóm nếu làm chung." });
          return;
      }
      
      const targetMember = members[0];
      const existingEntries = DataStore.getEntries();
      const dateEntries = existingEntries.filter(e => e.date === date);
      
      const memberEntry = dateEntries.find(e => e.members.includes(targetMember));
      let groupToDelete = [targetMember];
      
      if (memberEntry && memberEntry.content) {
          const lines = memberEntry.content.split('\\n');
          const lastLine = lines[lines.length - 1].trim();
          if (/^\\d+$/.test(lastLine)) {
              // This is a group report, find everyone with the same group ID
              const groupId = lastLine;
              groupToDelete = [];
              dateEntries.forEach(e => {
                  const elines = e.content.split('\\n');
                  if (elines[elines.length - 1].trim() === groupId) {
                      groupToDelete.push(...e.members);
                  }
              });
              // remove duplicates
              groupToDelete = [...new Set(groupToDelete)];
          }
      }
      
      setMembersToDelete(groupToDelete);
      setShowDeleteConfirm(true);
  };`;

const oldExecute = `  const executeDeleteGroup = async () => {
      setShowDeleteConfirm(false);
      setIsSubmitting(true);
      setMessage(null);
      try {
          const res = await DataStore.deleteWorkloadGroup({ date, members });`;

const newExecute = `  const executeDeleteGroup = async () => {
      setShowDeleteConfirm(false);
      setIsSubmitting(true);
      setMessage(null);
      try {
          const res = await DataStore.deleteWorkloadGroup({ date, members: membersToDelete });`;

if (code.includes(oldTrigger) && code.includes(oldExecute)) {
    code = code.replace(oldTrigger, newTrigger);
    code = code.replace(oldExecute, newExecute);
    
    // Also update the UI prompt
    const oldPrompt = `Bạn có chắc chắn muốn xóa báo cáo của nhóm gồm <strong className="text-red-600">{members.length}</strong> thành viên trong ngày <strong className="text-blue-600">{date.split('-').reverse().join('/')}</strong> không?`;
    const newPrompt = `Bạn có chắc chắn muốn xóa báo cáo của {membersToDelete.length > 1 ? 'nhóm' : 'cá nhân'} gồm <strong className="text-red-600">{membersToDelete.length}</strong> thành viên ({membersToDelete.join(', ')}) trong ngày <strong className="text-blue-600">{date.split('-').reverse().join('/')}</strong> không?`;
    
    code = code.replace(oldPrompt, newPrompt);
    
    fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
    console.log("Patched WorkloadForm delete logic successfully");
} else {
    console.log("Could not find triggerDeleteConfirm or executeDeleteGroup");
}
