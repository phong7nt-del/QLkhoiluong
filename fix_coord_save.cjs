const fs = require('fs');
let code = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

const oldNewDcu = `const newDcu = { id, ten, diaChi, toadoX,
          toadoY,
          hinhAnh: imageUrl,
          ghiChu,
          user: currentName
      };`;

const newNewDcu = `const newDcu = { id, ten, diaChi, 
          toadoX: formatCoord(toadoX),
          toadoY: formatCoord(toadoY),
          hinhAnh: imageUrl,
          ghiChu,
          user: currentName
      };`;

code = code.replace(oldNewDcu, newNewDcu);
fs.writeFileSync('src/components/DcuTab.tsx', code, 'utf8');
