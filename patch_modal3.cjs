const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

code = code.replace(/if \(val\.includes\('họ và tên'\) \|\| val === 'họ tên'\) nameIdx = c;\n\s*if \(val\.includes\('khu vực'\) \|\| val === 'khu vuc' \|\| val\.includes\('tổ công tác'\) \|\| val\.includes\('bộ phận công tác'\)\) teamIdx = c;\n\s*if \(val === 'msnv' \|\| val\.includes\('mã nhân viên'\)\) msnvIdx = c;\n\s*if \(val === 'chức danh' \|\| val === 'chuc danh'\) roleIdx = c;\n\s*if \(val === 'sinh nhật' \|\| val === 'sinh nhat' \|\| val === 'ngày sinh' \|\| val === 'ngay sinh'\) sinhNhatIdx = c;/, `
          var cleanVal = val.replace(/\\s+/g, '');
          if (cleanVal.includes('họvàtên') || cleanVal === 'họtên') nameIdx = c;
          if (cleanVal.includes('khuvực') || cleanVal === 'khuvuc' || cleanVal.includes('tổcôngtác') || cleanVal.includes('bộphậncôngtác')) teamIdx = c;
          if (cleanVal === 'msnv' || cleanVal.includes('mãnhânviên')) msnvIdx = c;
          if (cleanVal === 'chứcdanh' || cleanVal === 'chucdanh') roleIdx = c;
          if (cleanVal.includes('sinh') || cleanVal.includes('ngàysinh')) sinhNhatIdx = c;
`);

fs.writeFileSync('src/components/ConfigModal.tsx', code);
