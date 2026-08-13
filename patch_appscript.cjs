const fs = require('fs');
let code = fs.readFileSync('full-apps-script.js', 'utf8');

code = code.replace(
  "var nameIdx = -1;\n    var teamIdx = -1;\n    var startRow = 1;",
  "var nameIdx = -1;\n    var teamIdx = -1;\n    var msnvIdx = -1;\n    var roleIdx = -1;\n    var startRow = 1;"
);

code = code.replace(
  "if (val.includes('họ và tên') || val === 'họ tên') nameIdx = c;\n        if (val.includes('khu vực') || val === 'khu vuc' || val.includes('tổ công tác') || val.includes('bộ phận công tác')) teamIdx = c;",
  "if (val.includes('họ và tên') || val === 'họ tên') nameIdx = c;\n        if (val.includes('khu vực') || val === 'khu vuc' || val.includes('tổ công tác') || val.includes('bộ phận công tác')) teamIdx = c;\n        if (val.includes('mã nhân viên') || val.includes('msnv') || val.includes('mật khẩu') || val.includes('password')) msnvIdx = c;\n        if (val.includes('chức danh') || val.includes('công việc')) roleIdx = c;"
);

code = code.replace(
  "members.push({ team: assignTeam, name: name });",
  "var msnv = msnvIdx !== -1 ? String(data[i][msnvIdx]).trim() : '';\n        var role = roleIdx !== -1 ? String(data[i][roleIdx]).trim() : '';\n        members.push({ team: assignTeam, name: name, msnv: msnv, role: role });"
);

fs.writeFileSync('full-apps-script.js', code, 'utf8');

let config = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');
const scriptTemplateMatch = config.match(/const SCRIPT_TEMPLATE = \`([\s\S]*?)\`;/);
if (scriptTemplateMatch) {
   config = config.replace(scriptTemplateMatch[1], '// XÓA TẤT CẢ MÃ CŨ (XÓA function myFunction() { ... })\n// CHỈ DÁN ĐOẠN MÃ DƯỚI ĐÂY VÀO:\n' + code.replace(/\\\$/g, '$$').replace(/\`/g, '\\\`'));
   fs.writeFileSync('src/components/ConfigModal.tsx', config, 'utf8');
}
