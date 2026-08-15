const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

const oldUpdateLogic = `              var rMaDd = String(sheetData[r][maDdCol]).trim();
              var rThoiGian = String(sheetData[r][thoiGianXlCol]).trim();
              
              if (rMaDd === String(data.maDd).trim() && rThoiGian === String(data.thoiGianXl).trim()) {`;

const newUpdateLogic = `              var rMaDd = String(sheetData[r][maDdCol]).trim();
              
              var rThoiGianRaw = sheetData[r][thoiGianXlCol];
              var rThoiGianStr = "";
              if (Object.prototype.toString.call(rThoiGianRaw) === "[object Date]") {
                  var d = rThoiGianRaw.getDate();
                  var m = rThoiGianRaw.getMonth() + 1;
                  var y = rThoiGianRaw.getFullYear();
                  rThoiGianStr = (d < 10 ? '0'+d : d) + '/' + (m < 10 ? '0'+m : m) + '/' + y;
              } else {
                  rThoiGianStr = String(rThoiGianRaw).trim();
              }
              
              var inputThoiGian = String(data.thoiGianXl).trim();
              if (inputThoiGian.indexOf('-') !== -1) {
                  var parts = inputThoiGian.split('-');
                  if (parts.length === 3) inputThoiGian = parts[2] + '/' + parts[1] + '/' + parts[0];
              }

              if (rMaDd === String(data.maDd).trim() && rThoiGianStr === inputThoiGian) {`;

code = code.replace(oldUpdateLogic, newUpdateLogic);
fs.writeFileSync('src/components/ConfigModal.tsx', code, 'utf8');
