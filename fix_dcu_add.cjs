const fs = require('fs');
let code = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

const sessionInsert = `
      const sessionUser = JSON.parse(localStorage.getItem('sessionUser') || '{}');
      const currentName = sessionUser.name || sessionUser.email || '';
      const newDcu = { id, ten, diaChi, toadoX,
          toadoY,
          hinhAnh: imageUrl,
          ghiChu,
          user: currentName
      };`;

code = code.replace(/const newDcu = \{\s*id,\s*ten,\s*diaChi,\s*toadoX,\s*toadoY,\s*hinhAnh:\s*imageUrl,\s*ghiChu\s*\};/, sessionInsert);
fs.writeFileSync('src/components/DcuTab.tsx', code, 'utf8');
