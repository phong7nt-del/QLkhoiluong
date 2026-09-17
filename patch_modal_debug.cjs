const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

code = code.replace(/var sinhNhat = sinhNhatIdx !== -1 \? data\[i\]\[sinhNhatIdx\] : '';/, `var sinhNhat = sinhNhatIdx !== -1 ? data[i][sinhNhatIdx] : '';
        var originalSinhNhat = sinhNhat; // DEBUG`);

code = code.replace(/members\.push\(\{ team: assignTeam, name: name, msnv: msnv, role: role, sinhNhat: sinhNhat \}\);/, `members.push({ team: assignTeam, name: name, msnv: msnv, role: role, sinhNhat: sinhNhat, _rawSinhNhat: String(originalSinhNhat) });`);

fs.writeFileSync('src/components/ConfigModal.tsx', code);
