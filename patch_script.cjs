const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

code = code.replace(/var nameIdx = -1;\n\s*var teamIdx = -1;\n\s*var startRow = 1;/, `var nameIdx = -1;
      var teamIdx = -1;
      var msnvIdx = -1;
      var roleIdx = -1;
      var sinhNhatIdx = -1;
      var startRow = 1;`);

code = code.replace(/if \(val\.includes\('khu vực'\) \|\| val === 'khu vuc' \|\| val\.includes\('tổ công tác'\) \|\| val\.includes\('bộ phận công tác'\)\) teamIdx = c;/, `if (val.includes('khu vực') || val === 'khu vuc' || val.includes('tổ công tác') || val.includes('bộ phận công tác')) teamIdx = c;
          if (val === 'msnv' || val.includes('mã nhân viên')) msnvIdx = c;
          if (val === 'chức danh' || val === 'chuc danh') roleIdx = c;
          if (val === 'sinh nhật' || val === 'sinh nhat' || val === 'ngày sinh' || val === 'ngay sinh') sinhNhatIdx = c;`);

code = code.replace(/var msnv = msnvIdx !== -1 \? String\(data\[i\]\[msnvIdx\]\)\.trim\(\) : '';\n\s*var role = roleIdx !== -1 \? String\(data\[i\]\[roleIdx\]\)\.trim\(\) : '';\n\s*members\.push\(\{ team: assignTeam, name: name, msnv: msnv, role: role \}\);/, `var msnv = msnvIdx !== -1 ? String(data[i][msnvIdx]).trim() : '';
        var role = roleIdx !== -1 ? String(data[i][roleIdx]).trim() : '';
        var sinhNhat = sinhNhatIdx !== -1 ? data[i][sinhNhatIdx] : '';
        
        // Format SinhNhat to string dd/MM/yyyy if it's a date object
        if (Object.prototype.toString.call(sinhNhat) === '[object Date]') {
             sinhNhat = Utilities.formatDate(sinhNhat, Session.getScriptTimeZone(), "dd/MM/yyyy");
        } else if (sinhNhat) {
             sinhNhat = String(sinhNhat).trim();
             var p = sinhNhat.split('/');
             if (p.length === 3) {
                 sinhNhat = (p[0].length === 1 ? '0' + p[0] : p[0]) + '/' + (p[1].length === 1 ? '0' + p[1] : p[1]) + '/' + p[2];
             }
        }
        
        members.push({ team: assignTeam, name: name, msnv: msnv, role: role, sinhNhat: sinhNhat });`);

fs.writeFileSync('src/components/ConfigModal.tsx', code);
