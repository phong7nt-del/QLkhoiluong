const fs = require('fs');

// 1. Fix DataStore.ts
let ds = fs.readFileSync('src/store/DataStore.ts', 'utf8');
ds = ds.replace(
  /user: findKey\(\['User', 'Người cập nhật'\]\)/g,
  "user: findKey(['User', 'Người cập nhật', 'user', 'Người thực hiện', 'Nhân viên', 'Người được giao'])"
);
fs.writeFileSync('src/store/DataStore.ts', ds, 'utf8');

// 2. Fix ConfigModal.tsx
let cm = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');
cm = cm.replace(
  /else if \(h === 'địa chỉ' \|\| h === 'dia chi'\) newRow\[i\] = data\.diaChi \|\| '';/g,
  "else if (h === 'địa chỉ' || h === 'dia chi') newRow[i] = data.diaChi || '';\n               else if (h === 'user' || h === 'người cập nhật' || h === 'nguoi cap nhat' || h === 'người thực hiện' || h === 'nguoi thuc hien' || h === 'nhân viên' || h === 'nhan vien') newRow[i] = data.user || '';"
);
fs.writeFileSync('src/components/ConfigModal.tsx', cm, 'utf8');

// 3. Fix DcuTab.tsx for handleImport and filteredData
let dt = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');
dt = dt.replace(
  /diaChi: getVal\(\['địa chỉ', 'dia chi', 'diachi'\]\)\n\s*\};/,
  "diaChi: getVal(['địa chỉ', 'dia chi', 'diachi']),\n                      user: getVal(['user', 'người thực hiện', 'người cập nhật', 'nhân viên', 'người được giao', 'nguoi thuc hien', 'nguoi cap nhat'])\n                  };"
);

const newFilterLogic = `const filteredData = useMemo(() => {
      const sessionUser = JSON.parse(localStorage.getItem('sessionUser') || '{}');
      const roleStr = String(sessionUser.role || '').toLowerCase();
      const isManagement = roleStr.includes('tổ trưởng') || roleStr.includes('tổ phó') || roleStr.includes('admin') || roleStr.includes('quản trị');
      const normalizeStr = (s: string) => String(s || '').toLowerCase().replace(/\\s/g, '');
      const currentUserName = normalizeStr(sessionUser.name || sessionUser.email || '');

      let filtered = data.filter(d => {
          const hasCoords = !!d.toadoX && !!d.toadoY;
          if (listType === 'chua_phan_cong') {
              if (hasCoords) return false;
              if (!isManagement && currentUserName) {
                  const assigneeName = normalizeStr(d.user || '');
                  if (assigneeName && assigneeName !== currentUserName) {
                      return false;
                  }
              }
              return true;
          }
          return hasCoords;
      });`;

dt = dt.replace(
  /const filteredData = useMemo\(\(\) => \{\n\s*let filtered = data\.filter\(d => \{\n\s*const hasCoords = !!d\.toadoX && !!d\.toadoY;\n\s*if \(listType === 'chua_phan_cong'\) return !hasCoords;\n\s*return hasCoords;\n\s*\}\);/,
  newFilterLogic
);
fs.writeFileSync('src/components/DcuTab.tsx', dt, 'utf8');

console.log('All files patched.');
