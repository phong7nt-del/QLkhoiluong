const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

code = code.replace(/let teamColIdx = 5;/, `let teamColIdx = 5;
                   let sinhNhatColIdx = -1;`);

code = code.replace(/if\(val\.includes\('khu vực'\) \|\| val\.includes\('khu vuc'\) \|\| val === 'tổ công tác'\) \{\n\s*teamColIdx = c;\n\s*\}/, `if(val.includes('khu vực') || val.includes('khu vuc') || val === 'tổ công tác') {
                                   teamColIdx = c;
                               }
                               if(val.includes('sinh') || val.includes('ngàysinh')) {
                                   sinhNhatColIdx = c;
                               }`);

const targetPush = `                          newMembers.push({
                              name: rawName,
                              team: finalTeam,
                              msnv: memberMsnv,
                              role: cbcnvInfo.role
                          });`;

const replacePush = `                          let sinhNhat = '';
                          const existingMember = (json.members || []).find((m: any) => m.name === rawName);
                          if (existingMember && existingMember.sinhNhat) {
                              sinhNhat = existingMember.sinhNhat;
                          } else if (sinhNhatColIdx !== -1 && row[sinhNhatColIdx]) {
                              sinhNhat = String(row[sinhNhatColIdx]).trim().replace(/[\\-\\.]/g, '/');
                              var p = sinhNhat.split('/');
                              if (p.length >= 2) {
                                  var day = p[0].length === 1 ? '0' + p[0] : p[0];
                                  var month = p[1].length === 1 ? '0' + p[1] : p[1];
                                  sinhNhat = day + '/' + month + (p.length === 3 ? '/' + p[2] : '');
                              }
                          }

                          newMembers.push({
                              name: rawName,
                              team: finalTeam,
                              msnv: memberMsnv,
                              role: cbcnvInfo.role,
                              sinhNhat: sinhNhat
                          });`;

code = code.replace(targetPush, replacePush);
fs.writeFileSync('src/store/DataStore.ts', code);
