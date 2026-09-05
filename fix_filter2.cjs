const fs = require('fs');
let code = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

const oldFilterRegex = /const isManagement = roleStr.*?return hasCoords;\n\s*\}\);/s;
const newFilter = `const isManagement = ['tổ trưởng', 'tổ phó', 'đội trưởng', 'đội phó', 'phó giám đốc', 'giám đốc', 'admin', 'quản trị'].some(role => roleStr.includes(role));

      const normalizeStr = (s: string) => {
          return String(s || '')
              .normalize('NFD')
              .replace(/[\\u0300-\\u036f]/g, '')
              .toLowerCase()
              .replace(/\\s+/g, '');
      };
      const currentUserName = normalizeStr(sessionUser.name || sessionUser.email || '');

      let filtered = data.filter(d => {
          const hasCoords = !!d.toadoX && !!d.toadoY;
          
          if (!isManagement && currentUserName) {
              const assigneeName = normalizeStr(d.user || '');
              if (assigneeName !== currentUserName) return false;
          }

          if (listType === 'chua_phan_cong') {
              return !hasCoords;
          }
          return hasCoords;
      });`;

code = code.replace(oldFilterRegex, newFilter);

code = code.replace(/Cập nhật DCU \(Chưa phân công\)/g, 'Cập nhật DCU (Đã phân công)');
code = code.replace(/Chưa phân công \(\{data\.filter/g, 'Đã phân công ({data.filter');
code = code.replace(/Đã phân công \(\{data\.filter/g, 'Danh sách đã hoàn tất ({data.filter');
code = code.replace(/Đã phân công \(\{data\.filter\(d => !!d.toadoX && !!d.toadoY\)/g, 'Đã hoàn tất ({data.filter(d => !!d.toadoX && !!d.toadoY)');
fs.writeFileSync('src/components/DcuTab.tsx', code, 'utf8');
