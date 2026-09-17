const fs = require('fs');
let code = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');

code = code.replace(
  'var tz = Session.getScriptTimeZone();\n           var today = Utilities.formatDate(new Date(), tz, "dd/MM/yyyy");',
  `var tz = Session.getScriptTimeZone();\n           var today = Utilities.formatDate(new Date(), tz, "dd/MM/yyyy");\n           var timeNow = Utilities.formatDate(new Date(), tz, "dd/MM/yyyy HH:mm:ss");\n           var loginDetail = username + " - " + timeNow;`
);

code = code.replace(
  'var data = lastRow > 2 ? sheet.getRange(3, 1, lastRow - 2, 2).getValues() : [];',
  'var data = lastRow > 2 ? sheet.getRange(3, 1, lastRow - 2, 3).getValues() : [];'
);

code = code.replace(
  `               if (String(cellDate).trim() === today) {\n                   var count = parseInt(data[i][1]) || 0;\n                   sheet.getRange(i + 3, 2).setValue(count + 1);\n                   found = true;\n                   break;\n               }`,
  `               if (String(cellDate).trim() === today) {
                   var count = parseInt(data[i][1]) || 0;
                   sheet.getRange(i + 3, 2).setValue(count + 1);
                   var currentDetails = data[i][2] || "";
                   if (currentDetails) {
                       sheet.getRange(i + 3, 3).setValue(currentDetails + "; " + loginDetail);
                   } else {
                       sheet.getRange(i + 3, 3).setValue(loginDetail);
                   }
                   found = true;
                   break;
               }`
);

code = code.replace(
  `           if (!found) {\n               sheet.appendRow(["'" + today, 1]);\n           }`,
  `           if (!found) {
               sheet.appendRow(["'" + today, 1, loginDetail]);
           }`
);

code = code.replace(
  `               sheet.getRange("A2").setValue("Ngày");\n               sheet.getRange("B2").setValue("Số lượng");`,
  `               sheet.getRange("A2").setValue("Ngày");\n               sheet.getRange("B2").setValue("Số lượng");\n               sheet.getRange("C2").setValue("Chi tiết đăng nhập");`
);

fs.writeFileSync('src/components/ConfigModal.tsx', code);
