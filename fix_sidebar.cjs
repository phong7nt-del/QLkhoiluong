const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(/const \[isSidebarOpen, setIsSidebarOpen\] = useState\(true\);/, 'const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);');

const oldLogin = `  const handleLogin = (user: SheetMember) => {
     sessionStorage.setItem('workload_user_session', JSON.stringify(user));
     setSessionUser(user);
     const _roleStr = user?.role ? user.role.toLowerCase() : '';
     const _isManagement = ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'].some(r => _roleStr.includes(r));
     if (_isManagement) {
         showTaskAlert();
         sessionStorage.setItem('task_stats_shown', 'true');
     }
     setRefreshToggle(prev => prev + 1);
  };`;

const newLogin = `  const handleLogin = (user: SheetMember) => {
     sessionStorage.setItem('workload_user_session', JSON.stringify(user));
     setSessionUser(user);
     if (window.innerWidth < 768) setIsSidebarOpen(false);
     const _roleStr = user?.role ? user.role.toLowerCase() : '';
     const _isManagement = ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'].some(r => _roleStr.includes(r));
     if (_isManagement) {
         showTaskAlert();
         sessionStorage.setItem('task_stats_shown', 'true');
     }
     setRefreshToggle(prev => prev + 1);
  };`;

if (app.includes(oldLogin)) {
    app = app.replace(oldLogin, newLogin);
    console.log("Updated handleLogin");
}

app = app.replace(/onClick=\{\(\) => setActiveTab\(tab\.id as any\)\}/g, "onClick={() => { setActiveTab(tab.id as any); if (window.innerWidth < 768) setIsSidebarOpen(false); }}");

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log("Finished patching App.tsx");
