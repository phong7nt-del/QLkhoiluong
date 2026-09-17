const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const targetStr = `             sinhNhat = String(sinhNhat).trim();
             var p = sinhNhat.split('/');
             if (p.length === 3) {
                 sinhNhat = (p[0].length === 1 ? '0' + p[0] : p[0]) + '/' + (p[1].length === 1 ? '0' + p[1] : p[1]) + '/' + p[2];
             }`;

const replaceStr = `             sinhNhat = String(sinhNhat).trim().replace(/[\\-\\.]/g, '/');
             var p = sinhNhat.split('/');
             if (p.length >= 2) {
                 var day = p[0].length === 1 ? '0' + p[0] : p[0];
                 var month = p[1].length === 1 ? '0' + p[1] : p[1];
                 sinhNhat = day + '/' + month + (p.length === 3 ? '/' + p[2] : '');
             }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/ConfigModal.tsx', code);
