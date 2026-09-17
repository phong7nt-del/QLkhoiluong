const fs = require('fs');
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf8');

code = code.replace(/import \{ DataStore, getTeamPrefix \} from '\.\.\/store\/DataStore';/, `import { DataStore, getTeamPrefix, SheetMember } from '../store/DataStore';`);

code = code.replace(/const \[message, setMessage\] = useState<\{type: 'success'\|'error', text: string\}\|null>\(null\);/, `const [message, setMessage] = useState<{type: 'success'|'error', text: string}|null>(null);
  const [sessionUser, setSessionUser] = useState<SheetMember | null>(null);
  const allowAllLock = DataStore.getAllowAllLockPlan();
  
  useEffect(() => {
    const stored = sessionStorage.getItem('workload_user_session');
    if (stored) {
       try { setSessionUser(JSON.parse(stored)); } catch(e){}
    }
  }, []);`);

code = code.replace(/const handleLockInit = \(\) => \{/, `const handleLockInit = () => {
     if (!allowAllLock) {
         let canLock = false;
         if (sessionUser) {
             const role = (sessionUser.role || '').toLowerCase();
             const team = (sessionUser.team || '').toLowerCase();
             if ((role === 'đội trưởng' || role === 'tổ trưởng') && (team === 'tổ tổng hợp' || team === 'tổng hợp')) {
                 canLock = true;
             }
         }
         if (!canLock) {
             setMessage({ type: 'error', text: 'Chỉ Đội trưởng hoặc Tổ trưởng Tổ Tổng hợp mới có quyền chốt số liệu. Bạn có thể thay đổi cấu hình này trong tab Hệ thống.' });
             setTimeout(() => setMessage(null), 5000);
             return;
         }
     }
`);

fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
