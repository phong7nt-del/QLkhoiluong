const fs = require('fs');
let code = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

const oldFilterRegex = /const filteredData = useMemo\(\(\) => \{.*?(return filtered;\n\s*\};\n\s*\}, \[data, listType, search\]\);)/s;

const newFilter = `const { userSpecificData, filteredData } = useMemo(() => {
      const sessionUser = JSON.parse(localStorage.getItem('sessionUser') || '{}');
      const roleStr = String(sessionUser.role || '').toLowerCase();
      const isManagement = ['tổ trưởng', 'tổ phó', 'đội trưởng', 'đội phó', 'phó giám đốc', 'giám đốc', 'admin', 'quản trị'].some(role => roleStr.includes(role));

      const normalizeStr = (s: string) => {
          return String(s || '')
              .normalize('NFD')
              .replace(/[\\u0300-\\u036f]/g, '')
              .replace(/đ/g, 'd').replace(/Đ/g, 'D')
              .toLowerCase()
              .replace(/\\s+/g, '');
      };
      
      // Fallback email prefix if name is empty
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
      return { userSpecificData, filteredData: filtered };
  }, [data, listType, search]);`;

code = code.replace(oldFilterRegex, newFilter);

code = code.replace(/data\.filter\(d => \!d\.toadoX \|\| \!d\.toadoY\)\.length/g, "userSpecificData.filter(d => !d.toadoX || !d.toadoY).length");
code = code.replace(/data\.filter\(d => \!\!d\.toadoX && \!\!d\.toadoY\)\.length/g, "userSpecificData.filter(d => !!d.toadoX && !!d.toadoY).length");

fs.writeFileSync('src/components/DcuTab.tsx', code, 'utf8');
