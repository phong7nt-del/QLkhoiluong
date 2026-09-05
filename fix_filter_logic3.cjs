const fs = require('fs');
let code = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

const oldStart = "const filteredData = useMemo(() => {";
const oldEnd = "}, [data, listType, search, sortCol, sortDir]);";

const startIndex = code.indexOf(oldStart);
const endIndex = code.indexOf(oldEnd) + oldEnd.length;

if (startIndex > -1 && endIndex > startIndex) {
    const oldBlock = code.substring(startIndex, endIndex);
    
    // We need to keep the sorting logic!
    const newFilter = `const { userSpecificData, filteredData } = useMemo(() => {
      const sessionUser = JSON.parse(localStorage.getItem('sessionUser') || '{}');
      const roleStr = String(sessionUser.role || '').toLowerCase();
      const isManagement = ['tổ trưởng', 'tổ phó', 'đội trưởng', 'đội phó', 'phó giám đốc', 'giám đốc', 'admin', 'quản trị'].some(role => roleStr.includes(role));

      const normalizeStr = (s) => {
          return String(s || '')
              .normalize('NFD')
              .replace(/[\\u0300-\\u036f]/g, '')
              .replace(/đ/g, 'd').replace(/Đ/g, 'D')
              .toLowerCase()
              .replace(/\\s+/g, '');
      };
      
      let currentUserName = normalizeStr(sessionUser.name || '');
      if (!currentUserName) {
          const emailPrefix = (sessionUser.email || '').split('@')[0];
          currentUserName = normalizeStr(emailPrefix);
      }

      const userSpecificData = data.filter(d => {
          if (!isManagement && currentUserName) {
              const assigneeName = normalizeStr(d.user || '');
              if (!assigneeName) return false;
              if (assigneeName !== currentUserName && !assigneeName.includes(currentUserName) && !currentUserName.includes(assigneeName)) {
                  return false;
              }
          }
          return true;
      });

      let filtered = userSpecificData.filter(d => {
          const hasCoords = !!d.toadoX && !!d.toadoY;
          if (listType === 'chua_phan_cong') {
              return !hasCoords;
          }
          return hasCoords;
      });

      if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(item => 
              (item.id || '').toLowerCase().includes(s) || 
              (item.ten || '').toLowerCase().includes(s) ||
              (item.ghiChu || '').toLowerCase().includes(s)
          );
      }
      
      const sorted = filtered.sort((a, b) => {
          let valA = a[sortCol] || '';
          let valB = b[sortCol] || '';
          
          if (sortCol === 'stt') {
              return sortDir === 'asc' ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
          }
          
          if (typeof valA === 'string') valA = valA.toLowerCase();
          if (typeof valB === 'string') valB = valB.toLowerCase();
          
          if (valA < valB) return sortDir === 'asc' ? -1 : 1;
          if (valA > valB) return sortDir === 'asc' ? 1 : -1;
          return 0;
      });

      return { userSpecificData, filteredData: sorted };
  }, [data, listType, search, sortCol, sortDir]);`;

    code = code.substring(0, startIndex) + newFilter + code.substring(endIndex);
    fs.writeFileSync('src/components/DcuTab.tsx', code, 'utf8');
    console.log("Replaced block successfully");
} else {
    console.log("Could not find block.");
}

