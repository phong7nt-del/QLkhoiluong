// VERSION: 2026.10.02
// XÓA TẤT CẢ MÃ CŨ (XÓA function myFunction() { ... })
// CHỈ DÁN ĐOẠN MÃ DƯỚI ĐÂY VÀO:
var SPREADSHEET_ID = '1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ';


function capQuyen() {
  // Chạy hàm này một lần duy nhất trong trình chỉnh sửa Apps Script
  // để cấp quyền truy cập Google Drive cho script.
  var folder = DriveApp.getRootFolder();
  Logger.log("Đã cấp quyền thành công!");
}

function getSheetFlexibly(ss, possibleNames) {
  if (!ss || !possibleNames || !possibleNames.length) return null;
  for (var i=0; i<possibleNames.length; i++) {
    var sheet = ss.getSheetByName(possibleNames[i]);
    if (sheet) return sheet;
  }
  var sheets = ss.getSheets();
  if (!sheets) return null;
  for (var s=0; s<sheets.length; s++) {
    var sn = sheets[s].getName().toLowerCase().trim();
    for (var p=0; p<possibleNames.length; p++) {
       if (sn === possibleNames[p].toLowerCase().trim()) return sheets[s];
    }
  }
  return null;
}

function doGet(e) {
  try {
    if (e.parameter.action === 'getData') {
      var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
      var sheet = getSheetFlexibly(ss, ['CongTac', 'Cong Tac', 'Công tác', 'Công Tác', 'Con Tác']);
      if (!sheet) return ContentService.createTextOutput(JSON.stringify({ spreadsheetId: SPREADSHEET_ID, error: "Not found sheet CongTac"})).setMimeType(ContentService.MimeType.JSON);
      var data = sheet.getDataRange().getValues();
      
      var nameIdx = -1;
      var teamIdx = -1;
      var msnvIdx = -1;
      var roleIdx = -1;
      var sinhNhatIdx = -1;
      var startRow = 1;

      for (var r = 0; r < 5 && r < data.length; r++) {
        for (var c = 0; c < data[r].length; c++) {
          var val = String(data[r][c]).toLowerCase().trim();
          
          var cleanVal = val.replace(/\s+/g, '');
          if (cleanVal.includes('họvàtên') || cleanVal === 'họtên') nameIdx = c;
          if (cleanVal.includes('khuvực') || cleanVal === 'khuvuc' || cleanVal.includes('tổcôngtác') || cleanVal.includes('bộphậncôngtác')) teamIdx = c;
          if (cleanVal === 'msnv' || cleanVal.includes('mãnhânviên')) msnvIdx = c;
          if (cleanVal.includes('chứcdanh') || cleanVal.includes('chucdanh') || cleanVal.includes('côngviệc') || cleanVal.includes('congviec') || cleanVal.includes('chứcvụ') || cleanVal.includes('chucvu') || val.includes('chức danh') || val.includes('công việc')) roleIdx = c;
          if (cleanVal.includes('sinh') || cleanVal.includes('ngàysinh')) sinhNhatIdx = c;

        }
        if (nameIdx !== -1 && teamIdx !== -1) {
          startRow = r + 1;
          break;
        }
      }
      
      if (nameIdx === -1) { nameIdx = 1; startRow = 2; }
            if (teamIdx === -1) { teamIdx = 2; }
      
      var headerRowDebug = data[startRow > 1 ? startRow - 2 : 0] || [];
      var debugPayload = { headerDebug: headerRowDebug, idxDebug: { nameIdx: nameIdx, teamIdx: teamIdx, msnvIdx: msnvIdx, roleIdx: roleIdx, sinhNhatIdx: sinhNhatIdx } };

      var teams = [];
      var members = [];
      var memberTeamMap = {};
      var currentTeam = '';
      
      for (var i = startRow; i < data.length; i++) {
        var name = String(data[i][nameIdx] || '').trim();
        var teamVal = String(data[i][teamIdx] || '').trim();
        
        if (teamVal && teamVal.toLowerCase() !== 'khu vực' && teamVal.toLowerCase() !== 'tổ công tác' && teamVal.toLowerCase() !== 'bộ phận công tác') {
            currentTeam = teamVal;
        }
        
        if (!name || name.toLowerCase().includes('họ và tên') || name.toLowerCase() === 'họ tên') continue;
        
        var assignTeam = currentTeam || 'Không xác định';
        
        if (assignTeam && assignTeam.toLowerCase() !== 'khu vực' && assignTeam.toLowerCase() !== 'tổ công tác' && assignTeam.toLowerCase() !== 'bộ phận công tác') {
          if (teams.indexOf(assignTeam) === -1) {
             teams.push(assignTeam);
          }
          var msnv = msnvIdx !== -1 ? String(data[i][msnvIdx]).trim() : '';
        var role = roleIdx !== -1 ? String(data[i][roleIdx]).trim() : '';
        var sinhNhat = sinhNhatIdx !== -1 ? data[i][sinhNhatIdx] : '';
        var originalSinhNhat = sinhNhat; // DEBUG
        
        // Format SinhNhat to string dd/MM/yyyy if it's a date object
        if (Object.prototype.toString.call(sinhNhat) === '[object Date]') {
             sinhNhat = Utilities.formatDate(sinhNhat, Session.getScriptTimeZone(), "dd/MM/yyyy");
        } else if (sinhNhat) {
             sinhNhat = String(sinhNhat).trim().replace(/[\-\.]/g, '/');
             var p = sinhNhat.split('/');
             if (p.length >= 2) {
                 var day = p[0].length === 1 ? '0' + p[0] : p[0];
                 var month = p[1].length === 1 ? '0' + p[1] : p[1];
                 sinhNhat = day + '/' + month + (p.length === 3 ? '/' + p[2] : '');
             }
        }
        
        members.push({ team: assignTeam, name: name, msnv: msnv, role: role, sinhNhat: sinhNhat, _rawSinhNhat: String(originalSinhNhat) });
          memberTeamMap[name] = assignTeam;
        }
      }
      
      var workloads = [];
      var headerRowDebug = data[startRow > 1 ? startRow - 2 : 0] || [];
      var dateCols = [];
      var headerRowIndex = startRow - 1;
      if (headerRowIndex >= 0) {
         var headers = data[headerRowIndex] || [];
         for (var c = nameIdx + 1; c < headers.length; c++) {
            if (c === teamIdx) continue;
            var h = headers[c];
            var dateStr = '';
            if (Object.prototype.toString.call(h) === '[object Date]') {
               dateStr = Utilities.formatDate(h, Session.getScriptTimeZone(), "yyyy-MM-dd");
            } else {
               var s = String(h).replace(/'/g, '').trim();
               var p1 = s.split('/');
               if (p1.length === 3) {
                  dateStr = p1[2] + '-' + (p1[1].length===1?'0'+p1[1]:p1[1]) + '-' + (p1[0].length===1?'0'+p1[0]:p1[0]);
               } else if (p1.length === 2) {
                  var year = new Date().getFullYear();
                  dateStr = year + '-' + (p1[1].length===1?'0'+p1[1]:p1[1]) + '-' + (p1[0].length===1?'0'+p1[0]:p1[0]);
               } else if (s.indexOf('-') > -1) {
                  dateStr = s; 
               }
            }
            if (dateStr && dateStr.length >= 8 && dateStr.indexOf('-') > -1) {
               dateCols.push({ colIdx: c, date: dateStr });
            }
         }
         
         for (var i = startRow; i < data.length; i++) {
           var name = String(data[i][nameIdx] || '').trim();
           if (!name || name.toLowerCase().includes('họ và tên') || name.toLowerCase() === 'họ tên') continue;
           var foundTeam = memberTeamMap[name] || '';
           for (var d = 0; d < dateCols.length; d++) {
              var val = String(data[i][dateCols[d].colIdx] || '').trim();
              if (val) {
                 workloads.push({
                    id: 'sheet_' + i + '_' + dateCols[d].colIdx,
                    team: foundTeam,
                    members: [name],
                    content: val,
                    date: dateCols[d].date,
                    timestamp: new Date().getTime()
                 });
              }
           }
         }
      }
      
      // Đọc sheet Tram
      var stations = [];
      var sheetTram = getSheetFlexibly(ss, ['Tram', 'Trạm']);
      if (sheetTram) {
        var tramDataRange = sheetTram.getDataRange();
        var tramData = tramDataRange.getValues();
        var tramBackgrounds = tramDataRange.getBackgrounds();
        
        var tramHeaderRow = 0;
        var idIdx = -1;
        var nameTIdx = -1;
        var typeIdx = -1;
        var areaIdx = -1;
        
        for (var r = 0; r < Math.min(10, tramData.length); r++) {
          for (var c = 0; c < tramData[r].length; c++) {
            var h = String(tramData[r][c]).toLowerCase().trim();
            if (h.includes('id cũ') || h.includes('id cu') || h === 'mã trạm' || h === 'ma tram') idIdx = c;
            if (h.includes('tên tba đặt lại') || h.includes('tên trạm') || h === 'ten tram' || h === 'tên tba') nameTIdx = c;
            if (h.includes('mã loại trạm chi tiết') || h.includes('loại trạm') || h === 'loai tram') typeIdx = c;
            if (h.includes('khu vực') || h === 'khu vuc' || h.includes('tổ')) areaIdx = c;
          }
          if (idIdx !== -1 || nameTIdx !== -1) {
            tramHeaderRow = r;
            break;
          }
        }
        
        if (idIdx === -1) idIdx = 0;
        if (nameTIdx === -1) nameTIdx = 1;
        if (typeIdx === -1) typeIdx = 2;
        
        var tramHeaders = tramData[tramHeaderRow] || [];
        var currentFeeder = "Khác";
        
        for (var i = tramHeaderRow + 1; i < tramData.length; i++) {
           var row = tramData[i];
           var bgRow = tramBackgrounds[i];
           var idVal = String(row[idIdx] || '').trim();
           var nameVal = String(row[nameTIdx] || '').trim();
           
           var isFeederRow = false;
           for (var bc = 0; bc < bgRow.length && bc < 5; bc++) {
              var color = bgRow[bc] ? bgRow[bc].toLowerCase() : '#ffffff';
              if (color !== '#ffffff' && color !== '#000000' && color.startsWith('#')) {
                 isFeederRow = true;
                 break;
              }
           }
           
           if (!idVal && nameVal && (nameVal.toLowerCase().indexOf('tuyến') > -1 || nameVal.toLowerCase().indexOf('trục') > -1 || nameVal.toLowerCase().indexOf('nhánh') > -1)) {
               isFeederRow = true;
           }
           
           if (isFeederRow) {
               if (nameVal) currentFeeder = nameVal;
               else if (idVal) currentFeeder = idVal;
               else if (String(row[0]).trim()) currentFeeder = String(row[0]).trim();
               continue;
           }
           
           if (!idVal && !nameVal) continue;
           
           var details = {};
           for (var c = 0; c < tramHeaders.length; c++) {
              if (tramHeaders[c]) {
                 var headerName = String(tramHeaders[c]);
                 var cellValue = String(row[c] || '');
                 if (headerName.trim() !== '') {
                    details[headerName] = cellValue;
                 }
              }
           }
           
           stations.push({
             id: idVal,
             name: nameVal,
             type: String(row[typeIdx] || '').trim(),
             area: areaIdx !== -1 && String(row[areaIdx]).trim() ? String(row[areaIdx]).trim() : currentFeeder,
             details: details
           });
        }
      }
      
      // Đọc sheet DinhMuc
      var dinhMucList = [];
      var sheetDinhMuc = getSheetFlexibly(ss, ['DinhMuc', 'Định Mức', 'Dinh muc', 'Định mức']);
      if (sheetDinhMuc) {
        var dmData = sheetDinhMuc.getDataRange().getValues();
        var nameCol = -1;
        var quotaCol = -1;
        var groupCol = -1;
        var relationCol = -1;
        var startRow = 1;
        var historyCols = {};
        
        for (var r = 0; r < 5 && r < dmData.length; r++) {
            var row = dmData[r] || [];
            for (var j = 0; j < row.length; j++) {
               var rawVal = String(row[j]).trim();
               var h = rawVal.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/đ/g, 'd');
               
               if (h.indexOf('noi dung') > -1 || h.indexOf('danh muc') > -1 || h.indexOf('ten') > -1) {
                   if (nameCol === -1) nameCol = j;
               }
               if (h.indexOf('dinh muc') > -1 || h.indexOf('khoi luong') > -1 || h.indexOf('chi tieu') > -1 || h.indexOf('quota') > -1 || h.indexOf('diem') > -1) {
                   if (quotaCol === -1) quotaCol = j;
               }
               if (h.indexOf('chung nhom') > -1) groupCol = j;
               if (h.indexOf('quan he') > -1) relationCol = j;
               if (h.indexOf('thang') > -1 || /\\d+\\/\\d{4}/.test(h)) {
                   historyCols[rawVal] = j;
               }
            }
            if (nameCol !== -1) {
                startRow = r + 1;
                break;
            }
        }
        if (nameCol === -1) nameCol = 0;
        if (quotaCol === -1 && dmData[0] && dmData[0].length > 1) quotaCol = 1;
        
        for (var d = startRow; d < dmData.length; d++) {
           var val1 = String(dmData[d][nameCol] || '').trim();
           var val2 = quotaCol > -1 ? Number(String(dmData[d][quotaCol]).replace(/,/g, '.')) : 0;
           if (isNaN(val2)) val2 = 0;
           
           var isGroupStr = groupCol !== -1 ? String(dmData[d][groupCol] || '').toLowerCase().trim() : '';
           var isGroup = isGroupStr === 'x';
           var relation = relationCol !== -1 ? String(dmData[d][relationCol] || '').trim() : '';
           
           var history = {};
           for (var k in historyCols) {
               var colIdx = historyCols[k];
               var hVal = parseFloat(String(dmData[d][colIdx] || '0').replace(/,/g, '.'));
               if (!isNaN(hVal)) history[k] = hVal;
           }
           
           if (val1 && val1.toLowerCase() !== 'stt' && val1.toLowerCase() !== 'tổng' && val1.toLowerCase() !== 'tong') {
              dinhMucList.push({ name: val1, quota: val2, isGroup: isGroup, relation: relation, history: history });
           }
        }
      }
      
      // Đọc sheet TUTI
      var tutiList = [];
      var sheetTuti = getSheetFlexibly(ss, ['TUTI', 'Tuti', 'TuTi', 'tu ti']);
      if (sheetTuti) {
         var tData = sheetTuti.getDataRange().getValues();
         var tHeaders = tData[0] || [];
         var thm = {};
         for (var c = 0; c < tHeaders.length; c++) {
            var rawH = String(tHeaders[c]).toLowerCase().trim();
            var h = rawH.normalize('NFD').replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/\\s+/g, ' ');
            if (h === 'ma tram') thm.maTramCol = c;
            if (h === 'ten diem do' || h === 'ten tram') thm.tenDiemDoCol = c;
            if (h.indexOf('thong so tu') > -1 || h === 'tu') thm.tuCol = c;
            if (h.indexOf('thong so ti') > -1 || h === 'ti') thm.tiCol = c;
            if (h.indexOf('kiem tra tu') > -1) thm.ktTuCol = c;
            if (h.indexOf('kiem tra ti') > -1) thm.ktTiCol = c;
            if (h === 'khac') thm.khacCol = c;
            if (h === 'ket luan') thm.ketLuanCol = c;
            if (h.indexOf('ngay cap nhat') > -1 || h.indexOf('ngay kiem tra') > -1) thm.ngayKiemTraCol = c;
            if (h.indexOf('ngay dua len') > -1) thm.ngayDuaLenCol = c;
            if (h.indexOf('nguoi dua len') > -1) thm.nguoiDuaLenCol = c;
            if (h.indexOf('nguoi kiem tra') > -1) thm.nguoiKiemTraCol = c;
         }
         
         for (var t = 1; t < tData.length; t++) {
             var mTram = thm.maTramCol !== undefined ? String(tData[t][thm.maTramCol] || '') : '';
             var tDiem = thm.tenDiemDoCol !== undefined ? String(tData[t][thm.tenDiemDoCol] || '') : '';
             if (mTram || tDiem) {
                 tutiList.push({
                     maTram: mTram,
                     tenDiemDo: tDiem,
                     thongSoTU: thm.tuCol !== undefined ? String(tData[t][thm.tuCol] || '') : '',
                     thongSoTI: thm.tiCol !== undefined ? String(tData[t][thm.tiCol] || '') : '',
                     kiemTraTU: thm.ktTuCol !== undefined ? String(tData[t][thm.ktTuCol] || '') : '',
                     kiemTraTI: thm.ktTiCol !== undefined ? String(tData[t][thm.ktTiCol] || '') : '',
                     khac: thm.khacCol !== undefined ? String(tData[t][thm.khacCol] || '') : '',
                     ketLuan: thm.ketLuanCol !== undefined ? String(tData[t][thm.ketLuanCol] || '') : '',
                     ngayCapNhat: thm.ngayKiemTraCol !== undefined ? String(tData[t][thm.ngayKiemTraCol] || '') : '',
                     ngayDuaLen: thm.ngayDuaLenCol !== undefined ? String(tData[t][thm.ngayDuaLenCol] || '') : '',
                     nguoiDuaLen: thm.nguoiDuaLenCol !== undefined ? String(tData[t][thm.nguoiDuaLenCol] || '') : '',
                     nguoiKiemTra: thm.nguoiKiemTraCol !== undefined ? String(tData[t][thm.nguoiKiemTraCol] || '') : ''
                 });
             }
         }
      }
      
      // Đọc sheet ChiTietMKN/MatKetNoi
      var matKetNoiList = [];
      var sheetMatKetNoi = getSheetFlexibly(ss, ['ChiTietMKN', 'Chi Tiet MKN', 'Chi Tiết MKN', 'MatKetNoi', 'Mat Ket Noi', 'Mất Kết Nối', 'Mất kết nối', 'matketnoi']);
      if (sheetMatKetNoi) {
         var mknData = sheetMatKetNoi.getDataRange().getValues();
         var mknHeaders = mknData[0] || [];
         
         for (var t = 1; t < mknData.length; t++) {
             var rowInfo = {};
             for (var c = 0; c < mknHeaders.length; c++) {
                 var headerStr = String(mknHeaders[c]).trim();
                 if (headerStr) {
                     rowInfo[headerStr] = String(mknData[t][c] || '');
                 }
             }
             if (Object.keys(rowInfo).length > 0) {
                 matKetNoiList.push(rowInfo);
             }
         }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        headerDebug: debugPayload.headerDebug,
        idxDebug: debugPayload.idxDebug,
        teams: teams,
        members: members,
        stations: stations,
        workloads: workloads,
        dinhMuc: dinhMucList,
        tuti: tutiList,
        matKetNoi: matKetNoiList
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput("Valid Endpoint");
}

// --- BƯỚC QUAN TRỌNG ĐỂ LƯU ẢNH: CẤP QUYỀN TRUY CẬP (CHẠY 1 LẦN DUY NHẤT) ---
// 1. Trên thanh công cụ, chọn hàm "setup" (thay vì doPost).
// 2. Bấm "Chạy" (Run). Trình duyệt sẽ hiển thị thông báo "Yêu cầu cấp quyền".
// 3. Chọn "Xem lại quyền" -> Chọn Tài khoản Google của bạn -> Bấm "Nâng cao" (Advanced) -> Chọn "Đi tới dự án (Không an toàn)" -> Bấm "Cho phép" (Allow).
function setup() {
  DriveApp.createFolder("App_Images_Test_Permission").setTrashed(true);
  SpreadsheetApp.getActive();
}

function doPost(e) {
  try {
    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: "Invalid JSON format" })).setMimeType(ContentService.MimeType.JSON);
    }

    var action = payload.action;

    if (action === 'log_in' || action === 'ping_online') {
       var cache = CacheService.getScriptCache();
       var activeStr = cache.get('active_users');
       var active = activeStr ? JSON.parse(activeStr) : {};
       var now = new Date().getTime();
       var username = payload.username || 'unknown';
       active[username] = now;
       
       var onlineCount = 0;
       for (var k in active) {
           if (now - active[k] < 15 * 60 * 1000) { // 15 minutes
               onlineCount++;
           } else {
               delete active[k];
           }
       }
       cache.put('active_users', JSON.stringify(active), 15 * 60);

       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = ss.getSheetByName('LogIn');
       
       if (action === 'log_in') {
           if (!sheet) {
               sheet = ss.insertSheet('LogIn');
               sheet.getRange("A1").setValue("Tổng đăng nhập:");
               sheet.getRange("B1").setValue(0);
               sheet.getRange("A2").setValue("Ngày");
               sheet.getRange("B2").setValue("Số lượng");
               sheet.getRange("C2").setValue("Chi tiết đăng nhập");
           }
           
           var tz = Session.getScriptTimeZone();
           var today = Utilities.formatDate(new Date(), tz, "dd/MM/yyyy");
           var timeNow = Utilities.formatDate(new Date(), tz, "dd/MM/yyyy HH:mm:ss");
           var loginDetail = username + " - " + timeNow;
           
           var totalRange = sheet.getRange("B1");
           var total = parseInt(totalRange.getValue()) || 0;
           totalRange.setValue(total + 1);
           
           var lastRow = sheet.getLastRow();
           var data = lastRow > 2 ? sheet.getRange(3, 1, lastRow - 2, 3).getValues() : [];
           var found = false;
           for (var i = 0; i < data.length; i++) {
               var cellDate = data[i][0];
               if (Object.prototype.toString.call(cellDate) === '[object Date]') {
                   cellDate = Utilities.formatDate(cellDate, tz, "dd/MM/yyyy");
               } else {
                   var s = String(cellDate).trim();
                   var parts = s.split('/');
                   if (parts.length === 3) {
                       cellDate = (parts[0].length === 1 ? '0' + parts[0] : parts[0]) + '/' +
                                  (parts[1].length === 1 ? '0' + parts[1] : parts[1]) + '/' + parts[2];
                   }
               }
               if (String(cellDate).trim() === today) {
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
               }
           }
           
           if (!found) {
               sheet.appendRow(["'" + today, 1, loginDetail]);
           }
           
           return ContentService.createTextOutput(JSON.stringify({ 
               status: 'success', 
               totalLogins: total + 1,
               onlineCount: onlineCount
           })).setMimeType(ContentService.MimeType.JSON);
       } else {
           var total = 0;
           if (sheet) {
               total = parseInt(sheet.getRange("B1").getValue()) || 0;
           }
           return ContentService.createTextOutput(JSON.stringify({ 
               status: 'success', 
               onlineCount: onlineCount,
               totalLogins: total
           })).setMimeType(ContentService.MimeType.JSON);
       }
    }

    if (action === 'savePlan') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['Nhật ký/CongTac', 'Nhat ky/CongTac', 'CongTac', 'Cong Tac', 'Công tác']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Not found'})).setMimeType(ContentService.MimeType.JSON);
       
       var data = sheet.getDataRange().getValues();
       var nameIdx = -1;
       var startRow = 1;
       for (var r = 0; r < 5 && r < data.length; r++) {
         for (var c = 0; c < data[r].length; c++) {
           var val = String(data[r][c]).toLowerCase().trim();
           if (val.includes('họ và tên') || val === 'họ tên') nameIdx = c;
         }
         if (nameIdx !== -1) { startRow = r + 1; break; }
       }
       if (nameIdx === -1) { nameIdx = 1; startRow = 2; }
       
       var dateCols = {};
       var headerRowIndex = startRow - 1;
       if (headerRowIndex >= 0) {
          var headers = data[headerRowIndex] || [];
          for (var c = nameIdx + 1; c < headers.length; c++) {
             var h = headers[c];
             var dateStr = '';
             if (Object.prototype.toString.call(h) === '[object Date]') {
                dateStr = Utilities.formatDate(h, Session.getScriptTimeZone(), "yyyy-MM-dd");
             } else {
                var s = String(h).replace(/'/g, '').trim();
                var p1 = s.split('/');
                if (p1.length === 3) {
                   dateStr = p1[2] + '-' + (p1[1].length===1?'0'+p1[1]:p1[1]) + '-' + (p1[0].length===1?'0'+p1[0]:p1[0]);
                } else if (p1.length === 2) {
                   var year = new Date().getFullYear();
                   dateStr = year + '-' + (p1[1].length===1?'0'+p1[1]:p1[1]) + '-' + (p1[0].length===1?'0'+p1[0]:p1[0]);
                } else if (s.indexOf('-') > -1) {
                   dateStr = s; 
                }
             }
             if (dateStr && dateStr.length >= 8 && dateStr.indexOf('-') > -1) {
                dateCols[dateStr] = c;
             }
          }
       }
       
       var workloads = payload.workloads || [];
       for (var i = 0; i < workloads.length; i++) {
          var wl = workloads[i];
          var dateCol = dateCols[wl.date];
          if (dateCol !== undefined) {
             for (var r = startRow; r < data.length; r++) {
                var rowName = String(data[r][nameIdx] || '').trim();
                if (rowName === wl.members[0]) {
                   sheet.getRange(r + 1, dateCol + 1).setValue(wl.content);
                   break;
                }
             }
          }
       }
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }


    // ======== CẬP NHẬT KẾ HOẠCH THÁNG (ĐỊNH MỨC) ========
    if (action === "update_plan_month") {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Định mức") || SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DinhMuc") || SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Định Mức");
      
      if (!sheet) {
         return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Không tìm thấy sheet Định mức" })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var monthYear = payload.monthYear;
      var items = payload.items;
      
      if (!monthYear || !items) {
         return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Thiếu monthYear hoặc items" })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var dataRange = sheet.getDataRange();
      var dataValues = dataRange.getValues();
      var headers = dataValues.length > 0 ? dataValues[0] : [];
      
      var colIndex = -1;
      if (headers.length > 0) {
          for (var i = 0; i < headers.length; i++) {
             if (String(headers[i]).trim().toLowerCase() === String(monthYear).trim().toLowerCase()) {
                 colIndex = i;
                 break;
             }
          }
      }
      
      if (colIndex === -1) {
          colIndex = sheet.getLastColumn();
          sheet.getRange(1, colIndex + 1).setValue(monthYear);
          sheet.getRange(1, colIndex + 1).setFontWeight("bold");
      }
      
      var nameCol = -1;
      if (headers.length > 0) {
          for (var c = 0; c < headers.length; c++) {
              var hStr = String(headers[c]).toLowerCase();
              if (hStr.indexOf("nội dung") !== -1 || hStr.indexOf("tên") !== -1 || hStr.indexOf("noi dung") !== -1 || hStr.indexOf("ten") !== -1) {
                  nameCol = c;
                  break;
              }
          }
      }
      if (nameCol === -1) nameCol = 0;
      
      // Cập nhật từng item
      for (var k = 0; k < items.length; k++) {
          var item = items[k];
          var rowIndex = -1;
          for (var r = 1; r < dataValues.length; r++) {
             if (dataValues[r] && dataValues[r].length > nameCol && String(dataValues[r][nameCol]).trim().toLowerCase() === String(item.name).trim().toLowerCase()) {
                 rowIndex = r;
                 break;
             }
          }
          if (rowIndex !== -1) {
              sheet.getRange(rowIndex + 1, colIndex + 1).setValue(item.quantity);
          } else {
              var newRow = sheet.getLastRow();
              sheet.getRange(newRow + 1, nameCol + 1).setValue(item.name);
              sheet.getRange(newRow + 1, colIndex + 1).setValue(item.quantity);
              
              var arr = [];
              arr[nameCol] = item.name;
              dataValues.push(arr);
          }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    // ======== XỬ LÝ ĐỒNG BỘ SƠ ĐỒ KHO ========
    if (action === 'update_kho') {
      var data = payload.data;
      var sheetName = "Kho";
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
      }
      sheet.clearContents(); // Xóa dữ liệu cũ
      
      if (data && data.length > 0) {
        var headers = Object.keys(data[0]);
        var rows = [headers];
        for (var i = 0; i < data.length; i++) {
          var row = [];
          for (var j = 0; j < headers.length; j++) {
            row.push(data[i][headers[j]]);
          }
          rows.push(row);
        }
        sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
      }
      
      return ContentService.createTextOutput(JSON.stringify({status: "success", message: "Đã cập nhật Kho"}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ======== XỬ LÝ ĐỒNG BỘ DANH SÁCH VTTB ========
    if (action === 'update_vttb') {
      var data = payload.data;
      var sheetName = "VTTB";
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
      }
      sheet.clearContents(); // Xóa dữ liệu cũ
      
      if (data && data.length > 0) {
        var headers = Object.keys(data[0]);
        var rows = [headers];
        for (var i = 0; i < data.length; i++) {
          var row = [];
          for (var j = 0; j < headers.length; j++) {
            row.push(data[i][headers[j]]);
          }
          rows.push(row);
        }
        sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
      }
      
      return ContentService.createTextOutput(JSON.stringify({status: "success", message: "Đã cập nhật VTTB"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "change_password") {
       var possibleNames = ["CongTac", "Cong Tac", "Công tác", "Công Tác", "Con Tác"];
       var sheetName = payload.sheetName;
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = null;
       if (sheetName) {
          sheet = ss.getSheetByName(sheetName);
       }
       if (!sheet) {
          for (var x = 0; x < possibleNames.length; x++) {
             sheet = ss.getSheetByName(possibleNames[x]);
             if (sheet) break;
          }
       }
       if (!sheet) {
         return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Không tìm thấy sheet liên quan đến Công tác" })).setMimeType(ContentService.MimeType.JSON);
       }
       
       var nameToChange = payload.data.name.toLowerCase().trim();
       var newPass = payload.data.newPass;
       
       var dataValues = sheet.getDataRange().getValues();
       var nameCol = -1;
       var msnvCol = -1;
       var headerRow = -1;
       
       for (var r = 0; r < 5; r++) {
         for (var c = 0; c < dataValues[r].length; c++) {
           var val = String(dataValues[r][c]).toLowerCase().trim();
           if (val.indexOf('họ và tên') !== -1 || val === 'họ tên') nameCol = c;
           if (val.indexOf('mã nhân viên') !== -1 || val.indexOf('msnv') !== -1 || val.indexOf('mật khẩu') !== -1 || val.indexOf('password') !== -1) {
              msnvCol = c;
           }
         }
         if (nameCol !== -1 && msnvCol !== -1) {
           headerRow = r;
           break;
         }
       }
       
       if (nameCol !== -1 && msnvCol !== -1 && headerRow !== -1) {
          var updated = false;
          for (var i = headerRow + 1; i < dataValues.length; i++) {
             var rowName = String(dataValues[i][nameCol]).toLowerCase().trim();
             if (rowName.replace(/\\s+/g, '') === nameToChange.replace(/\\s+/g, '')) {
                sheet.getRange(i + 1, msnvCol + 1).setValue(newPass);
                updated = true;
             }
          }
          if (updated) {
              return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
          }
       }
       return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Không tìm thấy tài khoản để đổi mật khẩu" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'add_workload') {
      var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
      var sheet = getSheetFlexibly(ss, ['CongTac', 'Cong Tac', 'Công tác', 'Công Tác', 'Con Tác']);
      if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
      var data = payload.data;
      var sheetData = sheet.getDataRange().getValues();
      
      var nameIdx = -1;
      var headerRowIndex = 0;
      for (var r = 0; r < 3 && r < sheetData.length; r++) {
        for (var c = 0; c < sheetData[r].length; c++) {
          var val = String(sheetData[r][c]).toLowerCase().trim();
          if (val.includes('họ và tên') || val === 'họ tên') {
             nameIdx = c;
             headerRowIndex = r;
             break;
          }
        }
        if (nameIdx !== -1) break;
      }
      if (nameIdx === -1) { nameIdx = 1; headerRowIndex = 1; }
      
      var headers = sheetData[headerRowIndex] || [];
      var dateParts = data.date.split('-'); // data.date format: YYYY-MM-DD
      var targetDateStr = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0]; // DD/MM/YYYY
      var targetDateStrAlt = dateParts[2] + '/' + dateParts[1]; // DD/MM
      
      var stripZero = function(s) { return String(s).replace(/(^|\\/)0+(\\d)/g, '$1$2'); };
      var cleanTarget = stripZero(targetDateStr);
      var cleanTargetAlt = stripZero(targetDateStrAlt);
      
      var dateColIndex = -1;
      for (var i = 0; i < headers.length; i++) {
         var h = headers[i];
         var cellDateStr = '';
         if (Object.prototype.toString.call(h) === '[object Date]') {
            cellDateStr = Utilities.formatDate(h, Session.getScriptTimeZone(), "dd/MM/yyyy");
         } else {
            cellDateStr = String(h).trim();
         }
         
         var cleanCell = stripZero(cellDateStr);
         if (cleanCell === cleanTarget || cleanCell === cleanTargetAlt || cleanCell === stripZero(data.date) || cellDateStr.includes(targetDateStrAlt) || cleanCell.includes(cleanTargetAlt)) {
            dateColIndex = i;
            break;
         }
      }
      
      if (dateColIndex === -1) {
         dateColIndex = headers.length; 
         sheet.getRange(headerRowIndex + 1, dateColIndex + 1).setValue("'" + targetDateStr);
      }
      
      for (var m = 0; m < data.members.length; m++) {
        var memberName = data.members[m];
        var rowIndex = -1;
        for(var r = headerRowIndex + 1; r < sheetData.length; r++) {
           if(String(sheetData[r][nameIdx]).trim() === memberName.trim()) {
              rowIndex = r; break;
           }
        }
        
        if (rowIndex !== -1) {
           var cell = sheet.getRange(rowIndex + 1, dateColIndex + 1);
           var currentVal = String(cell.getValue() || '');
           var newVal = currentVal ? currentVal + "\\n- " + data.content : "- " + data.content;
           cell.setValue(newVal);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

        if (action === 'delete_workload_group') {
      var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
      var sheet = getSheetFlexibly(ss, ['CongTac', 'Cong Tac', 'Công tác', 'Công Tác']);
      if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
      
      var data = payload.data;
      var sheetData = sheet.getDataRange().getValues();
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
      if (nameIdx === -1) { nameIdx = 1; headerRowIndex = 1; }
      
      var headers = sheetData[headerRowIndex] || [];
      var dateParts = data.date.split('-');
      var targetDateStr = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
      var targetDateStrAlt = dateParts[2] + '/' + dateParts[1];
      
      var stripZero = function(s) { return String(s).replace(/(^|\\/)0+(\\d)/g, '$1$2'); };
      var cleanTarget = stripZero(targetDateStr);
      var cleanTargetAlt = stripZero(targetDateStrAlt);
      
      var dateColIndex = -1;
      for (var i = 0; i < headers.length; i++) {
         var h = headers[i];
         var cellDateStr = '';
         if (Object.prototype.toString.call(h) === '[object Date]') {
            cellDateStr = Utilities.formatDate(h, Session.getScriptTimeZone(), "dd/MM/yyyy");
         } else {
            cellDateStr = String(h).trim();
         }
         
         var cleanCell = stripZero(cellDateStr);
         if (cleanCell === cleanTarget || cleanCell === cleanTargetAlt || cleanCell === stripZero(data.date) || cellDateStr.includes(targetDateStrAlt) || cleanCell.includes(cleanTargetAlt)) {
            dateColIndex = i;
            break;
         }
      }
      
      if (dateColIndex !== -1) {
          var deletedCount = 0;
          for (var m = 0; m < data.members.length; m++) {
              var memberName = String(data.members[m]).trim().toLowerCase();
              var rowIndex = -1;
              for(var r = headerRowIndex + 1; r < sheetData.length; r++) {
                 var cellName = String(sheetData[r][nameIdx]).trim().toLowerCase();
                 if(cellName === memberName || cellName.includes(memberName) || memberName.includes(cellName)) {
                    rowIndex = r; break;
                 }
              }
              if (rowIndex !== -1) {
                  sheet.getRange(rowIndex + 1, dateColIndex + 1).setValue('');
                  deletedCount++;
              }
          }
          return ContentService.createTextOutput(JSON.stringify({ status: 'success', deleted: deletedCount, dateColIndex: dateColIndex })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', reason: 'date_not_found', headers: headers.map(String) })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'update_progress') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['Tiến độ', 'Tien do', 'Tien độ', 'Tiến do']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
       
       var data = payload.data; // expects: { id (TT), content, reference, assignee, deadline, status, explanation }
       var sheetData = sheet.getDataRange().getValues();
       var headers = sheetData[0] || [];
       
       // map headers
       var hm = {};
       for (var c = 0; c < headers.length; c++) {
          var h = String(headers[c]).toLowerCase().trim();
          if (h === 'tt' || h === 'stt') hm.ttCol = c;
          if (h === 'nội dung' || h === 'noi dung') hm.contentCol = c;
          if (h === 'căn cứ' || h === 'can cu') hm.refCol = c;
          if (h === 'phân công' || h === 'phan cong') hm.assignCol = c;
          if (h === 'ngày hoàn tất' || h === 'ngay hoan tat' || h.includes('hạn')) hm.deadlineCol = c;
          if (h === 'hoàn tất' || h === 'hoan tat' || h === 'trạng thái') hm.statusCol = c;
          if (h === 'giải trình' || h === 'giai trinh') hm.expCol = c;
       }
       
       var targetRow = -1;
       if (data.id) {
          for (var r = 1; r < sheetData.length; r++) {
             if (hm.ttCol !== undefined && String(sheetData[r][hm.ttCol]) === String(data.id)) {
                targetRow = r; break;
             } else if (hm.ttCol === undefined && hm.contentCol !== undefined && String(sheetData[r][hm.contentCol]) === String(data.content)) {
                targetRow = r; break;
             }
          }
       }
       
       if (targetRow === -1) {
          // Add new row
          var maxTt = 0;
          if (hm.ttCol !== undefined) {
             for (var r=1; r<sheetData.length; r++) {
               var tNum = parseInt(sheetData[r][hm.ttCol], 10);
               if (!isNaN(tNum) && tNum > maxTt) maxTt = tNum;
             }
          }
          var newTt = maxTt + 1;
          
          var newRowData = new Array(headers.length).fill('');
          if (hm.ttCol !== undefined) newRowData[hm.ttCol] = newTt;
          if (hm.contentCol !== undefined) newRowData[hm.contentCol] = data.content || '';
          if (hm.refCol !== undefined) newRowData[hm.refCol] = data.reference || '';
          if (hm.assignCol !== undefined) newRowData[hm.assignCol] = data.assignee || '';
          if (hm.deadlineCol !== undefined) newRowData[hm.deadlineCol] = data.deadline || '';
          if (hm.statusCol !== undefined) newRowData[hm.statusCol] = data.status || '';
          if (hm.expCol !== undefined) newRowData[hm.expCol] = data.explanation || '';
          
          sheet.appendRow(newRowData);
       } else {
          // Update existing
          if (hm.contentCol !== undefined && data.content !== undefined) sheet.getRange(targetRow + 1, hm.contentCol + 1).setValue(data.content);
          if (hm.refCol !== undefined && data.reference !== undefined) sheet.getRange(targetRow + 1, hm.refCol + 1).setValue(data.reference);
          if (hm.assignCol !== undefined && data.assignee !== undefined) sheet.getRange(targetRow + 1, hm.assignCol + 1).setValue(data.assignee);
          if (hm.deadlineCol !== undefined && data.deadline !== undefined) sheet.getRange(targetRow + 1, hm.deadlineCol + 1).setValue(data.deadline);
          if (hm.statusCol !== undefined && data.status !== undefined) sheet.getRange(targetRow + 1, hm.statusCol + 1).setValue(data.status);
          if (hm.expCol !== undefined && data.explanation !== undefined) sheet.getRange(targetRow + 1, hm.expCol + 1).setValue(data.explanation);
       }
       
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'add_tuti' || action === 'update_tuti') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['TUTI', 'Tuti', 'TuTi', 'tu ti']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
       
       var data = payload.data;
       var sheetData = sheet.getDataRange().getValues();
       var headers = sheetData[0] || [];
       
       var hm = {};
       for (var c = 0; c < headers.length; c++) {
          var rawH = String(headers[c]).toLowerCase().trim();
          var h = rawH.normalize('NFD').replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/\\s+/g, ' ');
          if (h === 'tt' || h === 'stt') hm.ttCol = c;
          if (h === 'ma tram') hm.maTramCol = c;
          if (h === 'ten diem do' || h === 'ten tram') hm.tenDiemDoCol = c;
          if (h.indexOf('thong so tu') > -1 || h === 'tu') hm.tuCol = c;
          if (h.indexOf('thong so ti') > -1 || h === 'ti') hm.tiCol = c;
          if (h.indexOf('kiem tra tu') > -1) hm.ktTuCol = c;
          if (h.indexOf('kiem tra ti') > -1) hm.ktTiCol = c;
          if (h === 'khac') hm.khacCol = c;
          if (h === 'ket luan') hm.ketLuanCol = c;
          if (h.indexOf('ngay cap nhat') > -1 || h.indexOf('ngay kiem tra') > -1) hm.ngayKiemTraCol = c;
          if (h.indexOf('ngay dua len') > -1) hm.ngayDuaLenCol = c;
          if (h.indexOf('nguoi dua len') > -1) hm.nguoiDuaLenCol = c;
          if (h.indexOf('nguoi kiem tra') > -1) hm.nguoiKiemTraCol = c;
       }
       
       var targetRow = -1;
       function normTutiKey(val) {
          return String(val || '').toLowerCase().trim().replace(/\s+/g, ' ');
       }
       if (action === 'update_tuti' && data.maTram && data.tenDiemDo) {
          var targetMa = normTutiKey(data.maTram);
          var targetTen = normTutiKey(data.tenDiemDo);
          for (var r = 1; r < sheetData.length; r++) {
             if (hm.maTramCol !== undefined && hm.tenDiemDoCol !== undefined &&
                 normTutiKey(sheetData[r][hm.maTramCol]) === targetMa &&
                 normTutiKey(sheetData[r][hm.tenDiemDoCol]) === targetTen) {
                 targetRow = r; break;
             }
          }
       }
       
       if (targetRow === -1) {
          var maxTt = 0;
          if (hm.ttCol !== undefined) {
             for (var r=1; r<sheetData.length; r++) {
               var tNum = parseInt(sheetData[r][hm.ttCol], 10);
               if (!isNaN(tNum) && tNum > maxTt) maxTt = tNum;
             }
          }
          var newTt = maxTt + 1;
          
          var newRowData = new Array(headers.length).fill('');
          if (hm.ttCol !== undefined) newRowData[hm.ttCol] = newTt;
          if (hm.maTramCol !== undefined) newRowData[hm.maTramCol] = data.maTram || '';
          if (hm.tenDiemDoCol !== undefined) newRowData[hm.tenDiemDoCol] = data.tenDiemDo || '';
          if (hm.tuCol !== undefined) newRowData[hm.tuCol] = data.thongSoTU || '';
          if (hm.tiCol !== undefined) newRowData[hm.tiCol] = data.thongSoTI || '';
          if (hm.ktTuCol !== undefined) newRowData[hm.ktTuCol] = data.kiemTraTU || '';
          if (hm.ktTiCol !== undefined) newRowData[hm.ktTiCol] = data.kiemTraTI || '';
          if (hm.khacCol !== undefined) newRowData[hm.khacCol] = data.khac || '';
          if (hm.ketLuanCol !== undefined) newRowData[hm.ketLuanCol] = data.ketLuan || '';
          if (hm.ngayKiemTraCol !== undefined) newRowData[hm.ngayKiemTraCol] = data.ngayCapNhat || '';
          if (hm.ngayDuaLenCol !== undefined) newRowData[hm.ngayDuaLenCol] = data.ngayDuaLen || '';
          if (hm.nguoiDuaLenCol !== undefined) newRowData[hm.nguoiDuaLenCol] = data.nguoiDuaLen || '';
          if (hm.nguoiKiemTraCol !== undefined) newRowData[hm.nguoiKiemTraCol] = data.nguoiKiemTra || '';
          
          sheet.appendRow(newRowData);
       } else {
          if (hm.tuCol !== undefined && data.thongSoTU !== undefined) sheet.getRange(targetRow + 1, hm.tuCol + 1).setValue(data.thongSoTU);
          if (hm.tiCol !== undefined && data.thongSoTI !== undefined) sheet.getRange(targetRow + 1, hm.tiCol + 1).setValue(data.thongSoTI);
          if (hm.ktTuCol !== undefined && data.kiemTraTU !== undefined) sheet.getRange(targetRow + 1, hm.ktTuCol + 1).setValue(data.kiemTraTU);
          if (hm.ktTiCol !== undefined && data.kiemTraTI !== undefined) sheet.getRange(targetRow + 1, hm.ktTiCol + 1).setValue(data.kiemTraTI);
          if (hm.khacCol !== undefined && data.khac !== undefined) sheet.getRange(targetRow + 1, hm.khacCol + 1).setValue(data.khac);
          if (hm.ketLuanCol !== undefined && data.ketLuan !== undefined) sheet.getRange(targetRow + 1, hm.ketLuanCol + 1).setValue(data.ketLuan);
          if (hm.ngayKiemTraCol !== undefined && data.ngayCapNhat !== undefined) sheet.getRange(targetRow + 1, hm.ngayKiemTraCol + 1).setValue(data.ngayCapNhat);
          if (hm.ngayDuaLenCol !== undefined && data.ngayDuaLen !== undefined) sheet.getRange(targetRow + 1, hm.ngayDuaLenCol + 1).setValue(data.ngayDuaLen);
          if (hm.nguoiDuaLenCol !== undefined && data.nguoiDuaLen !== undefined) sheet.getRange(targetRow + 1, hm.nguoiDuaLenCol + 1).setValue(data.nguoiDuaLen);
          if (hm.nguoiKiemTraCol !== undefined && data.nguoiKiemTra !== undefined) sheet.getRange(targetRow + 1, hm.nguoiKiemTraCol + 1).setValue(data.nguoiKiemTra);
       }
       
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'delete_tuti') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['TUTI', 'Tuti', 'TuTi', 'tu ti']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
       
       var sheetData = sheet.getDataRange().getValues();
       var headers = sheetData[0] || [];
       var hm = {};
       for (var c = 0; c < headers.length; c++) {
          var rawH = String(headers[c]).toLowerCase().trim();
          var h = rawH.normalize('NFD').replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/\s+/g, ' ');
          if (h === 'ma tram') hm.maTramCol = c;
          if (h === 'ten diem do' || h === 'ten tram') hm.tenDiemDoCol = c;
       }
       
       var targetRow = -1;
       var data = payload.data;
       function normDelKey(val) {
          return String(val || '').toLowerCase().trim().replace(/\s+/g, ' ');
       }
       if (data.maTram && data.tenDiemDo) {
          var delMa = normDelKey(data.maTram);
          var delTen = normDelKey(data.tenDiemDo);
          for (var r = 1; r < sheetData.length; r++) {
             if (hm.maTramCol !== undefined && hm.tenDiemDoCol !== undefined &&
                 normDelKey(sheetData[r][hm.maTramCol]) === delMa &&
                 normDelKey(sheetData[r][hm.tenDiemDoCol]) === delTen) {
                 targetRow = r; break;
             }
          }
       }
       
       if (targetRow !== -1) {
          sheet.deleteRow(targetRow + 1);
       }
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'update_sangtai') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['SangTai', 'Sang Tai', 'Sang Tải', 'sang tải']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
       
       var data = payload.data;
       var sheetData = sheet.getDataRange().getValues();
       var headers = sheetData[0] || [];
       
       var maDiemDoCol = -1;
       var maMoiCol = -1;
       
       for (var c = 0; c < headers.length; c++) {
          var rawH = String(headers[c]).toLowerCase().trim();
          var h = rawH.normalize('NFD').replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[\\s_]+/g, '');
          if (h === 'madiemdo16' || h === 'madiemdo') {
             if (maDiemDoCol === -1) maDiemDoCol = c;
          }
          if (h === 'mamoi' || h === 'matrammoi') {
             maMoiCol = c;
          }
       }
       
       if (maDiemDoCol > -1 && maMoiCol > -1) {
          for (var r = 1; r < sheetData.length; r++) {
              if (String(sheetData[r][maDiemDoCol]).trim() === String(data.maDiemDo).trim()) {
                  sheet.getRange(r + 1, maMoiCol + 1).setValue(data.maMoi);
                  return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
              }
          }
       }
       return ContentService.createTextOutput(JSON.stringify({ status: 'error' })).setMimeType(ContentService.MimeType.JSON);
    }

    
    if (action === 'upload_image') {
       try {
           // Tìm hoặc tạo thư mục "App_Images" ở thư mục gốc của Drive
           var folder = DriveApp.getFolderById("1eze4kVWtdUr0gjKSEAB_BKSfm5CNg3fv");
           var b64 = payload.base64.split(',')[1] || payload.base64;
           var bytes = Utilities.base64Decode(b64);
           var mime = payload.mimeType || 'image/jpeg';
           var fName = payload.fileName || ('IMG_' + new Date().getTime() + '.jpg');
           var blob = Utilities.newBlob(bytes, mime, fName);
           var file = folder.createFile(blob);
           try {
               file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
           } catch(shareErr) {
               console.warn("Could not set public sharing (might be blocked by domain): ", shareErr);
           }
           return ContentService.createTextOutput(JSON.stringify({ 
               status: 'success', 
               url: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1200" 
           })).setMimeType(ContentService.MimeType.JSON);
       } catch(e) {
           return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() })).setMimeType(ContentService.MimeType.JSON);
       }
    }

    
     if (action === 'delete_dcu_bulk') {
        var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
        var sheet = getSheetFlexibly(ss, ['DCU', 'dcu']);
        if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Không tìm thấy sheet DCU' })).setMimeType(ContentService.MimeType.JSON);
        
        var list = payload.data || [];
        if (!Array.isArray(list)) list = [list];
        
        var sheetData = sheet.getDataRange().getValues();
        if (sheetData.length <= 1) {
            return ContentService.createTextOutput(JSON.stringify({ status: 'success', deletedCount: 0 })).setMimeType(ContentService.MimeType.JSON);
        }
        
        var headerRowIdx = 0;
        var headers = sheetData[0] || [];
        var idCol = -1;
        var sttCol = -1;
        
        function normalizeDcuH(str) {
            var s = String(str || '').toLowerCase();
            if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return s.replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
        }
        
        for (var rIdx = 0; rIdx < Math.min(5, sheetData.length); rIdx++) {
            var tempH = sheetData[rIdx] || [];
            var foundId = false;
            for (var c = 0; c < tempH.length; c++) {
                var cleanH = normalizeDcuH(tempH[c]);
                if (cleanH === 'stt' || cleanH === 'tt' || cleanH === 'sott') sttCol = c;
                if (cleanH === 'id' || cleanH === 'madcu') {
                    idCol = c;
                    foundId = true;
                }
            }
            if (foundId) {
                headerRowIdx = rIdx;
                headers = tempH;
                break;
            }
        }
        
        if (sttCol === -1) sttCol = 0;
        if (idCol === -1) idCol = 1;
        
        var deleteIds = {};
        var deleteStts = {};
        for (var i = 0; i < list.length; i++) {
            var it = list[i];
            if (typeof it === 'object' && it !== null) {
                if (it.id !== undefined && it.id !== null && String(it.id).trim() !== '') {
                    deleteIds[String(it.id).trim().toLowerCase()] = true;
                }
                if (it.stt !== undefined && it.stt !== null && String(it.stt).trim() !== '') {
                    deleteStts[String(it.stt).trim()] = true;
                }
            } else {
                var sVal = String(it).trim();
                if (sVal.indexOf('id_') === 0) {
                    deleteIds[sVal.substring(3).toLowerCase()] = true;
                } else if (sVal.indexOf('stt_') === 0) {
                    deleteStts[sVal.substring(4)] = true;
                } else {
                    deleteIds[sVal.toLowerCase()] = true;
                    deleteStts[sVal] = true;
                }
            }
        }
        
        var rowsToDelete = [];
        for (var r = headerRowIdx + 1; r < sheetData.length; r++) {
            var rId = idCol !== -1 ? String(sheetData[r][idCol] != null ? sheetData[r][idCol] : '').trim().toLowerCase() : '';
            var rStt = sttCol !== -1 ? String(sheetData[r][sttCol] != null ? sheetData[r][sttCol] : '').trim() : '';
            
            var match = false;
            if (rId && deleteIds[rId]) match = true;
            else if (rStt && deleteStts[rStt]) match = true;
            
            if (match) {
                rowsToDelete.push(r + 1);
            }
        }
        
        // Xóa từ dòng dưới lên dòng trên để tránh sai lệch chỉ mục
        rowsToDelete.sort(function(a, b) { return b - a; });
        for (var dIdx = 0; dIdx < rowsToDelete.length; dIdx++) {
            sheet.deleteRow(rowsToDelete[dIdx]);
        }
        
        // Dồn dữ liệu và đánh lại STT liên tục từ 1 đến hết cho tất cả các dòng còn lại
        var newLastRow = sheet.getLastRow();
        if (newLastRow > headerRowIdx && sttCol !== -1) {
            var remainingCount = newLastRow - (headerRowIdx + 1);
            if (remainingCount > 0) {
                var sttRange = sheet.getRange(headerRowIdx + 2, sttCol + 1, remainingCount, 1);
                var newSttValues = [];
                for (var s = 1; s <= remainingCount; s++) {
                    newSttValues.push([s]);
                }
                sttRange.setValues(newSttValues);
            }
        }
        
        return ContentService.createTextOutput(JSON.stringify({ 
            status: 'success', 
            deletedCount: rowsToDelete.length, 
            remainingCount: Math.max(0, sheet.getLastRow() - (headerRowIdx + 1)) 
        })).setMimeType(ContentService.MimeType.JSON);
     }

    if (action === 'update_dcu') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['DCU', 'dcu']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Sheet DCU not found' })).setMimeType(ContentService.MimeType.JSON);
       
       var data = payload.data;
       var lastRow = sheet.getLastRow();
       if (lastRow < 2) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No data' })).setMimeType(ContentService.MimeType.JSON);
       
       var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
       var idCol = -1;
       var xCol = -1, yCol = -1, imgCol = -1, noteCol = -1, userCol = -1;
       for (var c = 0; c < headers.length; c++) {
           var h = String(headers[c]).toLowerCase().trim();
           if (h === 'id') idCol = c;
           else if (h === 'tọa độ x' || h === 'toạ độ x' || h === 'vĩ độ' || h === 'tọa độx' || h === 'toạ độx') xCol = c;
           else if (h === 'tọa độ y' || h === 'toạ độ y' || h === 'kinh độ' || h === 'tọa độy' || h === 'toạ độy') yCol = c;
           else if (h === 'hình ảnh' || h === 'hinh anh' || h === 'ảnh' || h === 'hinhảnh') imgCol = c;
           else if (h === 'ghi chú' || h === 'ghi chu') noteCol = c;
           else if (h === 'user' || h === 'người cập nhật' || h === 'nguoi cap nhat' || h === 'người xl' || h === 'nguoi xl') userCol = c;
       }
       
       
       var sheetData = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
       var updated = false;
       for (var r = 0; r < sheetData.length; r++) {
           if (String(sheetData[r][idCol]).trim() === String(data.id).trim()) {
               if (xCol > -1) sheet.getRange(r + 2, xCol + 1).setValue(data.toadoX || '');
               if (yCol > -1) sheet.getRange(r + 2, yCol + 1).setValue(data.toadoY || '');
               if (imgCol > -1) sheet.getRange(r + 2, imgCol + 1).setValue(data.hinhAnh || '');
               if (noteCol > -1) sheet.getRange(r + 2, noteCol + 1).setValue(data.ghiChu || '');
               if (userCol > -1 && data.user) sheet.getRange(r + 2, userCol + 1).setValue(data.user);
               
               updated = true;
               break;
           }
       }
       
       if (updated) {
           return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
       } else {
           return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Not found ID' })).setMimeType(ContentService.MimeType.JSON);
       }
    }

    if (action === 'import_dcu') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['DCU', 'dcu']);
       if (!sheet) {
           sheet = ss.insertSheet('DCU');
           sheet.appendRow(['STT', 'ID', 'Tên', 'Địa chỉ', 'Tọa độ X', 'Tọa độ Y', 'Hình ảnh', 'Ghi chú', 'User']);
       }
       
       var dataList = payload.data;
       if (!dataList || dataList.length === 0) {
           return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No data to import' })).setMimeType(ContentService.MimeType.JSON);
       }
       
       var lastRow = sheet.getLastRow();
       var headers = [];
       if (lastRow > 0) {
           headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
       }
       
       if (headers.length === 0) {
           headers = ['stt', 'id', 'tên', 'địa chỉ', 'tọa độ x', 'tọa độ y', 'hình ảnh', 'ghi chú', 'user'];
           sheet.appendRow(['STT', 'ID', 'Tên', 'Địa chỉ', 'Tọa độ X', 'Tọa độ Y', 'Hình ảnh', 'Ghi chú', 'User']);
           lastRow = 1;
       }
       
       var nextStt = lastRow > 1 ? lastRow : 1;
       var newRows = [];
       
       for (var d = 0; d < dataList.length; d++) {
           var data = dataList[d];
           var newRow = new Array(headers.length).fill('');
           for (var i = 0; i < headers.length; i++) {
               var h = headers[i];
               if (h === 'tt' || h === 'stt' || h === 'số tt' || h === 'sott' || h === 'so tt') newRow[i] = nextStt;
               else if (h === 'id') newRow[i] = data.id || '';
               else if (h === 'tên' || h === 'ten' || h === 'tên dcu') newRow[i] = data.ten || '';
               else if (h === 'địa chỉ' || h === 'dia chi') newRow[i] = data.diaChi || '';
               else if (h === 'user' || h === 'người cập nhật' || h === 'nguoi cap nhat' || h === 'người thực hiện' || h === 'nguoi thuc hien' || h === 'nhân viên' || h === 'nhan vien' || h === 'người được giao' || h === 'nguoi duoc giao') newRow[i] = data.user || '';
           }
           newRows.push(newRow);
           nextStt++;
       }
       
       sheet.getRange(lastRow + 1, 1, newRows.length, headers.length).setValues(newRows);
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'add_dcu') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['DCU', 'dcu']);
       if (!sheet) {
           sheet = ss.insertSheet('DCU');
           sheet.appendRow(['STT', 'ID', 'Tên', 'Địa chỉ', 'Tọa độ X', 'Tọa độ Y', 'Hình ảnh', 'Ghi chú', 'User']);
       }
       var data = payload.data;
       var lastRow = sheet.getLastRow();
       
       if (lastRow > 1) {
           var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
           var idIndex = headers.indexOf('id');
           if (idIndex > -1) {
               var existingIds = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues().map(function(r) { return String(r[0]).trim(); });
               if (data.id && existingIds.indexOf(String(data.id).trim()) > -1) {
                   return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'ID đã tồn tại. Không thể thêm mới.' })).setMimeType(ContentService.MimeType.JSON);
               }
           }
       }
       
       var headers = [];
       if (lastRow > 0) {
           headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
       }
       
       if (headers.length === 0) {
           headers = ['stt', 'id', 'tên', 'địa chỉ', 'tọa độ x', 'tọa độ y', 'hình ảnh', 'ghi chú', 'user'];
           sheet.appendRow(['STT', 'ID', 'Tên', 'Địa chỉ', 'Tọa độ X', 'Tọa độ Y', 'Hình ảnh', 'Ghi chú', 'User']);
       }

       var nextStt = lastRow > 0 ? lastRow : 1;
       var newRow = new Array(headers.length).fill('');
       
       for (var i = 0; i < headers.length; i++) {
           var h = headers[i];
           if (h === 'stt' || h === 'số tt' || h === 'sott' || h === 'so tt' || h === 'tt') newRow[i] = nextStt;
           else if (h === 'id') newRow[i] = data.id || '';
           else if (h === 'tên' || h === 'ten' || h === 'tên dcu') newRow[i] = data.ten || '';
           else if (h === 'địa chỉ' || h === 'dia chi') newRow[i] = data.diaChi || '';
               else if (h === 'user' || h === 'người cập nhật' || h === 'nguoi cap nhat' || h === 'người thực hiện' || h === 'nguoi thuc hien' || h === 'nhân viên' || h === 'nhan vien' || h === 'người được giao' || h === 'nguoi duoc giao' || h === 'người xl' || h === 'nguoi xl') newRow[i] = data.user || '';
           else if (h === 'tọa độ x' || h === 'toạ độ x' || h === 'vĩ độ') newRow[i] = data.toadoX || '';
           else if (h === 'tọa độ y' || h === 'toạ độ y' || h === 'kinh độ') newRow[i] = data.toadoY || '';
           else if (h === 'hình ảnh' || h === 'hinh anh' || h === 'ảnh') newRow[i] = data.hinhAnh || '';
           else if (h === 'ghi chú' || h === 'ghi chu') newRow[i] = data.ghiChu || '';
       }
       
       sheet.appendRow(newRow);
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'add_xulydoxa') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['XuLyDoXa', 'Xu Ly Do Xa', 'Xử lý đo xa']);
       if (!sheet) {
           sheet = ss.insertSheet('XuLyDoXa');
           sheet.appendRow(['STT', 'Loại XL', 'Người XL', 'Thời gian XL', 'Mã DD', 'Tên KH', 'Cách XL', 'Kết quả', 'Ghi chú']);
       }
       var data = payload.data;
       
       var sheetDataDisplay = sheet.getDataRange().getDisplayValues();
       var tempMaDdCol = -1, tempThoiGianCol = -1;
       var headerRowIdx = 0;
       
       function normalizeHeaderAdd(raw) {
           var s = String(raw).toLowerCase();
           if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
           return s.replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");
       }
       
       for (var rIdx = 0; rIdx < Math.min(5, sheetDataDisplay.length); rIdx++) {
           var tempHeaders = sheetDataDisplay[rIdx] || [];
           for (var c = 0; c < tempHeaders.length; c++) {
               var h = normalizeHeaderAdd(tempHeaders[c]);
               if (h === 'madd') tempMaDdCol = c;
               else if (h === 'thoigianxl') tempThoiGianCol = c;
           }
           if (tempMaDdCol > -1) {
               headerRowIdx = rIdx;
               break;
           }
       }
       
       function normalizeDateStrAdd(dStr) {
           if (!dStr) return '';
           var s = String(dStr).trim().split(' ')[0];
           if (s.indexOf('T') !== -1) s = s.split('T')[0];
           var parts = s.indexOf('-') !== -1 ? s.split('-') : s.split('/');
           if (parts.length >= 3) {
               var d = parts[0].length === 4 ? parts[2] : parts[0];
               var m = parts[1];
               var y = parts[0].length === 4 ? parts[0] : parts[2];
               d = parseInt(d, 10); m = parseInt(m, 10);
               if (m > 12 && d <= 12) { var tmp = m; m = d; d = tmp; }
               return (d < 10 ? '0'+d : ''+d) + '/' + (m < 10 ? '0'+m : ''+m) + '/' + y;
           }
           return s;
       }
       
       var inputMaDd = String(data.maDd || '').trim().toLowerCase();
       var inputDateStr = normalizeDateStrAdd(data.thoiGianXl || '');
       
       if (tempMaDdCol > -1 && tempThoiGianCol > -1 && inputMaDd) {
           for (var r = headerRowIdx + 1; r < sheetDataDisplay.length; r++) {
               var rMaDd = String(sheetDataDisplay[r][tempMaDdCol]).trim().toLowerCase();
               var rDateStr = normalizeDateStrAdd(sheetDataDisplay[r][tempThoiGianCol]);
               if (rMaDd === inputMaDd && rDateStr === inputDateStr) {
                   return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Mã ĐĐ ' + data.maDd + ' với ngày ' + (data.thoiGianXl || '') + ' đã tồn tại trên Sheet!' })).setMimeType(ContentService.MimeType.JSON);
               }
           }
       }

       var lastRow = sheet.getLastRow();
       var nextStt = lastRow;
       
       sheet.appendRow([
          nextStt,
          data.loaiXl || '',
          data.nguoiXl || '',
          data.thoiGianXl || '',
          data.maDd || '',
          data.tenKh || '',
          data.cachXl || '',
          data.ketQua || '',
          data.ghiChu || ''
       ]);
       
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'add_xulydoxa_bulk') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['XuLyDoXa', 'Xu Ly Do Xa', 'Xử lý đo xa']);
       if (!sheet) {
           sheet = ss.insertSheet('XuLyDoXa');
           sheet.appendRow(['STT', 'Loại XL', 'Người XL', 'Thời gian XL', 'Mã DD', 'Tên KH', 'Cách XL', 'Kết quả', 'Ghi chú']);
       }
       var dataList = payload.data;
       if (!Array.isArray(dataList)) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
       
       var lastRow = sheet.getLastRow();
       var nextStt = lastRow;
       
       var rows = [];
       for (var i = 0; i < dataList.length; i++) {
          var d = dataList[i];
          rows.push([
             nextStt + i,
             d.loaiXl || '',
             d.nguoiXl || '',
             d.thoiGianXl || '',
             d.maDd || '',
             d.tenKh || '',
             d.cachXl || '',
             d.ketQua || '',
             d.ghiChu || ''
          ]);
       }
       
       if (rows.length > 0) {
          sheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);
       }
       
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

     if (action === 'delete_xulydoxa_bulk') {
        var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
        var sheet = getSheetFlexibly(ss, ['XuLyDoXa', 'Xu Ly Do Xa', 'Xử lý đo xa']);
        if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Không tìm thấy sheet XuLyDoXa' })).setMimeType(ContentService.MimeType.JSON);
        
        var list = payload.data || [];
        if (!Array.isArray(list)) list = [list];
        
        var sheetData = sheet.getDataRange().getValues();
        if (sheetData.length <= 1) {
            return ContentService.createTextOutput(JSON.stringify({ status: 'success', deletedCount: 0 })).setMimeType(ContentService.MimeType.JSON);
        }
        
        var headerRowIdx = 0;
        var headers = sheetData[0] || [];
        var maDdCol = -1;
        var sttCol = -1;
        
        function normalizeXlH(str) {
            var s = String(str || '').toLowerCase();
            if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return s.replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
        }
        
        for (var rIdx = 0; rIdx < Math.min(5, sheetData.length); rIdx++) {
            var tempH = sheetData[rIdx] || [];
            var foundMadd = false;
            for (var c = 0; c < tempH.length; c++) {
                var cleanH = normalizeXlH(tempH[c]);
                if (cleanH === 'stt' || cleanH === 'tt' || cleanH === 'sott') sttCol = c;
                if (cleanH === 'madd' || cleanH === 'madiemdo') {
                    maDdCol = c;
                    foundMadd = true;
                }
            }
            if (foundMadd) {
                headerRowIdx = rIdx;
                headers = tempH;
                break;
            }
        }
        
        if (sttCol === -1) sttCol = 0;
        if (maDdCol === -1) maDdCol = 4;
        
        var deleteStts = {};
        var deleteMaDds = {};
        for (var i = 0; i < list.length; i++) {
            var it = list[i];
            if (typeof it === 'object' && it !== null) {
                if (it.stt !== undefined && it.stt !== null && String(it.stt).trim() !== '') {
                    deleteStts[String(it.stt).trim()] = true;
                }
                if (it.maDd && String(it.maDd).trim() !== '') {
                    deleteMaDds[String(it.maDd).trim().toLowerCase()] = true;
                }
                if (it.id && String(it.id).trim() !== '') {
                    var rawId = String(it.id).trim();
                    if (rawId.indexOf('stt_') === 0) {
                        deleteStts[rawId.substring(4)] = true;
                    } else if (rawId.indexOf('madd_') === 0) {
                        var mParts = rawId.substring(5).split('_');
                        deleteMaDds[mParts[0].toLowerCase()] = true;
                    } else {
                        deleteStts[rawId] = true;
                        deleteMaDds[rawId.toLowerCase()] = true;
                    }
                }
            } else {
                var sVal = String(it).trim();
                if (sVal.indexOf('stt_') === 0) {
                    deleteStts[sVal.substring(4)] = true;
                } else if (sVal.indexOf('madd_') === 0) {
                    var mParts2 = sVal.substring(5).split('_');
                    deleteMaDds[mParts2[0].toLowerCase()] = true;
                } else {
                    deleteStts[sVal] = true;
                    deleteMaDds[sVal.toLowerCase()] = true;
                }
            }
        }
        
        var rowsToDelete = [];
        for (var r = headerRowIdx + 1; r < sheetData.length; r++) {
            var rStt = sttCol !== -1 ? String(sheetData[r][sttCol] != null ? sheetData[r][sttCol] : '').trim() : '';
            var rMaDd = maDdCol !== -1 ? String(sheetData[r][maDdCol] != null ? sheetData[r][maDdCol] : '').trim().toLowerCase() : '';
            
            var match = false;
            if (rStt && deleteStts[rStt]) match = true;
            else if (rMaDd && deleteMaDds[rMaDd]) match = true;
            
            if (match) {
                rowsToDelete.push(r + 1);
            }
        }
        
        // Xóa từ dòng dưới lên dòng trên để tránh làm lệch chỉ mục dòng trong sheet
        rowsToDelete.sort(function(a, b) { return b - a; });
        for (var dIdx = 0; dIdx < rowsToDelete.length; dIdx++) {
            sheet.deleteRow(rowsToDelete[dIdx]);
        }
        
        // Dồn dữ liệu và đánh lại STT liên tục từ 1 đến hết cho tất cả các dòng còn lại
        var newLastRow = sheet.getLastRow();
        if (newLastRow > headerRowIdx && sttCol !== -1) {
            var remainingCount = newLastRow - (headerRowIdx + 1);
            if (remainingCount > 0) {
                var sttRange = sheet.getRange(headerRowIdx + 2, sttCol + 1, remainingCount, 1);
                var newSttValues = [];
                for (var s = 1; s <= remainingCount; s++) {
                    newSttValues.push([s]);
                }
                sttRange.setValues(newSttValues);
            }
        }
        
        return ContentService.createTextOutput(JSON.stringify({ 
            status: 'success', 
            deletedCount: rowsToDelete.length, 
            remainingCount: Math.max(0, sheet.getLastRow() - (headerRowIdx + 1)) 
        })).setMimeType(ContentService.MimeType.JSON);
     }

    if (action === 'update_xulydoxa') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['XuLyDoXa', 'Xu Ly Do Xa', 'Xử lý đo xa']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Sheet not found'})).setMimeType(ContentService.MimeType.JSON);
       
       var data = payload.data;
       var sheetDataDisplay = sheet.getDataRange().getDisplayValues(); // Get as string
       
       var sttCol = -1, loaiXlCol = -1, nguoiXlCol = -1, thoiGianXlCol = -1, maDdCol = -1, tenKhCol = -1, cachXlCol = -1, ketQuaCol = -1, ghiChuCol = -1;
       var headerRowIdx = 0;
       
       function normalizeHeaderUpdate(raw) {
           var s = String(raw).toLowerCase();
           if (s.normalize) {
               s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
           }
           s = s.replace(/đ/g, "d");
           s = s.replace(/[^a-z0-9]/g, "");
           return s;
       }

       // Scan first 5 rows for headers
       for (var rIdx = 0; rIdx < Math.min(5, sheetDataDisplay.length); rIdx++) {
           var tempHeaders = sheetDataDisplay[rIdx] || [];
           var tempMaDdCol = -1;
           for (var c = 0; c < tempHeaders.length; c++) {
               var h = normalizeHeaderUpdate(tempHeaders[c]);
               if (h === 'madd') tempMaDdCol = c;
           }
           if (tempMaDdCol > -1) {
               headerRowIdx = rIdx;
               break;
           }
       }
       
       var headers = sheetDataDisplay[headerRowIdx] || [];
       for (var c = 0; c < headers.length; c++) {
           var h = normalizeHeaderUpdate(headers[c]);
           if (h === 'stt' || h === 'sott') sttCol = c;
           else if (h === 'loaixl') loaiXlCol = c;
           else if (h === 'nguoixl') nguoiXlCol = c;
           else if (h === 'thoigianxl') thoiGianXlCol = c;
           else if (h === 'madd') maDdCol = c;
           else if (h === 'tenkh') tenKhCol = c;
           else if (h === 'cachxl') cachXlCol = c;
           else if (h === 'ketqua') ketQuaCol = c;
           else if (h === 'ghichu') ghiChuCol = c;
       }
       
       if (sttCol > -1 && data.stt !== undefined && data.stt !== null && data.stt !== '') {
          var targetStt = String(data.stt).trim();
          for (var r = headerRowIdx + 1; r < sheetDataDisplay.length; r++) {
              var rStt = String(sheetDataDisplay[r][sttCol]).trim();
              if (rStt === targetStt) {
                  // Found! Update values
                  if (loaiXlCol > -1 && data.loaiXl !== undefined) sheet.getRange(r + 1, loaiXlCol + 1).setValue(data.loaiXl);
                  if (nguoiXlCol > -1 && data.nguoiXl !== undefined) sheet.getRange(r + 1, nguoiXlCol + 1).setValue(data.nguoiXl);
                  if (thoiGianXlCol > -1 && data.thoiGianXl !== undefined) sheet.getRange(r + 1, thoiGianXlCol + 1).setValue(data.thoiGianXl);
                  if (maDdCol > -1 && data.maDd !== undefined) sheet.getRange(r + 1, maDdCol + 1).setValue(data.maDd);
                  if (tenKhCol > -1 && data.tenKh !== undefined) sheet.getRange(r + 1, tenKhCol + 1).setValue(data.tenKh);
                  if (cachXlCol > -1 && data.cachXl !== undefined) sheet.getRange(r + 1, cachXlCol + 1).setValue(data.cachXl);
                  if (ketQuaCol > -1 && data.ketQua !== undefined) sheet.getRange(r + 1, ketQuaCol + 1).setValue(data.ketQua);
                  if (ghiChuCol > -1 && data.ghiChu !== undefined) sheet.getRange(r + 1, ghiChuCol + 1).setValue(data.ghiChu);
                  
                  return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
              }
          }
          return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Không tìm thấy dòng có STT = ' + targetStt })).setMimeType(ContentService.MimeType.JSON);
       }
       
       return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Lỗi: Không tìm thấy STT hoặc cấu trúc Sheet sai.' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'update_sangtai_bulk') {

       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['SangTai', 'Sang Tai', 'Sang Tải', 'sang tải']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
       
       var dataList = payload.data;
       if (!Array.isArray(dataList)) {
           return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Data is not an array'})).setMimeType(ContentService.MimeType.JSON);
       }

       var sheetData = sheet.getDataRange().getValues();
       var headers = sheetData[0] || [];
       var maDiemDoCol = -1;
       var maMoiCol = -1;
       
       for (var c = 0; c < headers.length; c++) {
          var rawH = String(headers[c]).toLowerCase().trim();
          var h = rawH.normalize('NFD').replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[\\s_]+/g, '');
          if (h === 'madiemdo16' || h === 'madiemdo') {
             if (maDiemDoCol === -1) maDiemDoCol = c;
          }
          if (h === 'mamoi' || h === 'matrammoi') {
             maMoiCol = c;
          }
       }
       
       if (maDiemDoCol > -1 && maMoiCol > -1) {
          var updatedCount = 0;
          for (var r = 1; r < sheetData.length; r++) {
              var sheetMaDiemDo = String(sheetData[r][maDiemDoCol]).trim();
              for (var i = 0; i < dataList.length; i++) {
                  if (sheetMaDiemDo === String(dataList[i].maDiemDo).trim()) {
                      sheet.getRange(r + 1, maMoiCol + 1).setValue(dataList[i].maMoi);
                      updatedCount++;
                      break;
                  }
              }
          }
          return ContentService.createTextOutput(JSON.stringify({ status: 'success', updatedCount: updatedCount })).setMimeType(ContentService.MimeType.JSON);
       }
       return ContentService.createTextOutput(JSON.stringify({ status: 'error' })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action: ' + action })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
