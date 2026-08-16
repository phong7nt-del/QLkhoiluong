const sheetData = [
    ["STT","Mã nhân viên","Họ và tên","Bộ phận công tác","Chức danh, công việc","Khu vực","07/05/2026","08/05/2026","06/05/2026","11/05/2026","12/05/2026","13/05/2026","14/08/2026","15/08/2026","16/05/2026"],
    ["6","012123","Trương Thanh Thuận","Tổ Tổng hợp","Nhân viên - Tổ Tổng hợp","Tổng hợp","- khác: 1","- khác: 1","","- khác: 1", "", "", "abc", "", ""]
];
const data = { date: "2026-08-14", members: ["Trương Thanh Thuận"] };
var nameIdx = -1;
var headerRowIndex = -1;
for (var r = 0; r < Math.min(5, sheetData.length); r++) {
  for (var c = 0; c < sheetData[r].length; c++) {
     var h = String(sheetData[r][c]).toLowerCase();
     if (h.includes('họ và tên') || h.includes('ho va ten')) {
        nameIdx = c; headerRowIndex = r; break;
     }
  }
  if (nameIdx !== -1) break;
}
console.log('nameIdx:', nameIdx, 'headerRowIndex:', headerRowIndex);

var headers = sheetData[headerRowIndex] || [];
var dateParts = data.date.split('-');
var targetDateStr = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
var targetDateStrAlt = dateParts[2] + '/' + dateParts[1];
console.log('targetDateStr:', targetDateStr);
console.log('targetDateStrAlt:', targetDateStrAlt);

var dateColIndex = -1;
for (var i = 0; i < headers.length; i++) {
   var h = headers[i];
   var cellDateStr = String(h).trim();
   
   if (cellDateStr === targetDateStr || cellDateStr === targetDateStrAlt || cellDateStr === data.date) {
      dateColIndex = i;
      break;
   }
}
console.log('dateColIndex:', dateColIndex);

if (dateColIndex !== -1) {
    for (var m = 0; m < data.members.length; m++) {
        var memberName = data.members[m];
        var rowIndex = -1;
        for(var r = headerRowIndex + 1; r < sheetData.length; r++) {
           if(String(sheetData[r][nameIdx]).trim() === memberName.trim()) {
              rowIndex = r; break;
           }
        }
        console.log('rowIndex for', memberName, ':', rowIndex);
    }
}
