const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

code = code.replace(
  "const currentUserStr = localStorage.getItem('CURRENT_USER');",
  "const currentUserStr = sessionStorage.getItem('workload_user_session');"
);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
