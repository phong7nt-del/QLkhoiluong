const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const calcStr = `  const tabs = allTabs.filter(tab => PermissionStore.hasTabAccess(tab.id, roleStr));

  const members = DataStore.getMembers();
  const today = new Date();
  const currDay = today.getDate();
  const currMonth = today.getMonth() + 1;
  const todayBirthdaysCount = members.filter(m => {
     if (!m.sinhNhat) return false;
     const parts = String(m.sinhNhat).split('/');
     if (parts.length >= 2) {
         return parseInt(parts[0], 10) === currDay && parseInt(parts[1], 10) === currMonth;
     }
     return false;
  }).length;`;

code = code.replace(/const tabs = allTabs\.filter\(tab => PermissionStore\.hasTabAccess\(tab\.id, roleStr\)\);/, calcStr);

const iconInject = `                      >
                         {tab.id === 'birthday' && todayBirthdaysCount > 0 && (
                            <span className="absolute top-1 right-2 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-bounce shadow-md z-30 pointer-events-none">
                                {todayBirthdaysCount}
                            </span>
                         )}`;

code = code.replace(/                      >\n\s*\{\/\* Tech\/Digital Indicator for Active Tab \*\/\}/, iconInject + '\n                         {/* Tech/Digital Indicator for Active Tab */}');

fs.writeFileSync('src/App.tsx', code);
