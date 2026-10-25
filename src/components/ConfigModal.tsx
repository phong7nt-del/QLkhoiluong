import React, { useState } from 'react';
import { DataStore } from '../store/DataStore';
import { Copy, Check, DownloadCloud, AlertTriangle, X } from 'lucide-react';
import { APP_VERSION } from '../version';

export const SCRIPT_TEMPLATE = `// VERSION: ${APP_VERSION}
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
          if (cleanVal.includes('khuvực') || cleanVal === 'khuvuc' || cleanVal.includes('tổcôngtác')) teamIdx = c;
          if (cleanVal === 'msnv' || cleanVal.includes('mãnhânviên')) msnvIdx = c;
          
          var isIgnoredDesc = val.indexOf('nội dung') !== -1 || val.indexOf('nhiệm vụ') !== -1 || val.indexOf('mô tả') !== -1 || val.indexOf('địa bàn') !== -1 || val.indexOf('thực hiện') !== -1;
          if (!isIgnoredDesc) {
            if (cleanVal.indexOf('chứcdanh,côngviệc') !== -1 || cleanVal.indexOf('chucdanh,congviec') !== -1 || (val.indexOf('chức danh') !== -1 && val.indexOf('công việc') !== -1)) {
              roleIdx = c;
            } else if (roleIdx === -1 && (cleanVal.indexOf('chứcdanh') !== -1 || cleanVal.indexOf('chucdanh') !== -1 || cleanVal.indexOf('chứcvụ') !== -1 || cleanVal.indexOf('chucvu') !== -1)) {
              roleIdx = c;
            } else if (roleIdx === -1 && (cleanVal === 'côngviệc' || cleanVal === 'congviec' || val === 'công việc')) {
              roleIdx = c;
            }
          }
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
        
        var normName = name.toLowerCase().replace(/\s+/g, '');
        if (normName.indexOf('nguyenthanhphong') !== -1 || normName.indexOf('thanhphong') !== -1) {
          if (role.toLowerCase().indexOf('đội trưởng') === -1 && role.toLowerCase().indexOf('doi truong') === -1) {
            role = role ? 'Đội trưởng, ' + role : 'Đội trưởng';
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
               if (h.indexOf('thang') > -1 || (/\\d+[/]\\d{4}/).test(h)) {
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
       var onlineUsers = [];
       for (var k in active) {
           if (now - active[k] < 15 * 60 * 1000) { // 15 minutes
               onlineCount++;
               if (k && k !== 'unknown') {
                   onlineUsers.push(k);
               }
           } else {
               delete active[k];
           }
       }
       if (onlineUsers.indexOf(username) === -1 && username && username !== 'unknown') {
           onlineUsers.push(username);
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
               onlineCount: onlineCount,
               onlineUsers: onlineUsers
           })).setMimeType(ContentService.MimeType.JSON);
       } else {
           var total = 0;
           if (sheet) {
               total = parseInt(sheet.getRange("B1").getValue()) || 0;
           }
           return ContentService.createTextOutput(JSON.stringify({ 
               status: 'success', 
               onlineCount: onlineCount,
               onlineUsers: onlineUsers,
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

    // ======== XỬ LÝ ĐỒNG BỘ GHI ĐÈ SHEET DỮ LIỆU (KHUVUC / MATKETNOI / CHITIETMKN / HTDD) ========
    if (action === 'overwrite_sheet' || action === 'update_khuvuc' || action === 'overwrite_khuvuc' || action === 'overwrite_htdd_sheet') {
      var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
      var targetSheetName = payload.sheetName || "KhuVuc";
      var possibleNames = [targetSheetName];
      var lowerName = String(targetSheetName).toLowerCase().trim();
      
      if (lowerName === 'khuvuc' || lowerName === 'khu vuc') {
        possibleNames = ['KhuVuc', 'Khu Vực', 'khuvuc', 'KHUVUC'];
      } else if (lowerName === 'matketnoi' || lowerName === 'mat ket noi') {
        possibleNames = ['MatKetNoi', 'Mat Ket Noi', 'Mất Kết Nối', 'matketnoi'];
      } else if (lowerName === 'chitietmkn' || lowerName === 'chi tiet mkn') {
        possibleNames = ['ChiTietMKN', 'Chi Tiet MKN', 'Chi Tiết MKN', 'chitietmkn'];
      }
      
      var sheet = getSheetFlexibly(ss, possibleNames);
      if (!sheet) {
        sheet = ss.insertSheet(targetSheetName);
      }
      
      var chunkIndex = payload.chunkIndex || 0;
      var totalChunks = payload.totalChunks || 1;
      var headers = payload.headers || [];
      var rows = payload.rows || []; // Array of arrays [[val1, val2, ...], ...]
      
      // Nếu là payload dạng data objects ({ data: [...] })
      if ((!rows || rows.length === 0) && payload.data && Array.isArray(payload.data) && payload.data.length > 0) {
        if (!headers || headers.length === 0) {
          headers = Object.keys(payload.data[0]);
        }
        rows = [];
        for (var d = 0; d < payload.data.length; d++) {
          var itemObj = payload.data[d];
          var rowArr = [];
          for (var h = 0; h < headers.length; h++) {
            var val = itemObj[headers[h]];
            rowArr.push(val !== undefined && val !== null ? String(val) : '');
          }
          rows.push(rowArr);
        }
      }
      
      // Nếu là chunk đầu tiên (hoặc không chia chunk), xóa sạch dữ liệu cũ và ghi headers
      if (chunkIndex === 0) {
        sheet.clearContents();
        if (headers && headers.length > 0) {
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
          sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
        }
      }
      
      // Ghi các dòng dữ liệu mới
      if (rows && rows.length > 0) {
        var startRow = sheet.getLastRow() + 1;
        var numCols = rows[0].length;
        sheet.getRange(startRow, 1, rows.length, numCols).setValues(rows);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success", 
        sheetName: sheet.getName(),
        chunkIndex: chunkIndex,
        totalChunks: totalChunks,
        totalRows: sheet.getLastRow()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ======== XỬ LÝ LƯU & HIỆU CHỈNH DANH MỤC CÔNG VIỆC VÀ ĐỊNH MỨC (CỘT A, B, C, Đ, E) ========
    if (action === 'save_dinhmuc' || action === 'update_dinhmuc') {
      var data = payload.items || payload.data;
      var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
      var sheet = getSheetFlexibly(ss, ['Định mức', 'Định Mức', 'DinhMuc', 'Dinh muc']);
      if (!sheet) {
        sheet = ss.insertSheet('Định mức');
      }
      
      // Lấy tiêu đề cột hiện tại để bảo toàn các cột kế hoạch tháng (D - 8/2026, B - 8/2026,...)
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      var existingHeaders = [];
      if (lastRow > 0 && lastCol >= 5) {
        existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      }
      
      var defaultHeaders = ["STT", "Nội dung", "đinh mức ngày", "Chung nhóm", "Quan hệ"];
      var finalHeaders = defaultHeaders.slice();
      
      // Giữ lại các cột kế hoạch tháng nếu có
      if (existingHeaders && existingHeaders.length > 5) {
        for (var h = 5; h < existingHeaders.length; h++) {
          var hName = String(existingHeaders[h] || '').trim();
          if (hName && finalHeaders.indexOf(hName) === -1) {
            finalHeaders.push(hName);
          }
        }
      }
      
      if (data && data.length > 0) {
        var rows = [finalHeaders];
        for (var i = 0; i < data.length; i++) {
          var item = data[i];
          var stt = item.stt !== undefined && String(item.stt).trim() !== '' ? item.stt : (i + 1);
          var name = item.name ? String(item.name).trim() : '';
          var quota = typeof item.quota === 'number' ? item.quota : (parseFloat(item.quota) || 0);
          var isGroup = (item.isGroup === true || item.isGroup === 'x' || item.isGroup === 'true') ? 'x' : '';
          var relation = item.relation ? String(item.relation).trim() : '';
          
          var row = [stt, name, quota, isGroup, relation];
          
          // Điền các cột kế hoạch tháng (nếu có)
          for (var colIdx = 5; colIdx < finalHeaders.length; colIdx++) {
            var colKey = finalHeaders[colIdx];
            var histVal = (item.history && item.history[colKey] !== undefined) ? item.history[colKey] : '';
            row.push(histVal);
          }
          
          rows.push(row);
        }
        
        sheet.clearContents();
        sheet.getRange(1, 1, rows.length, finalHeaders.length).setValues(rows);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success", 
        message: "Đã cập nhật thành công danh mục Định mức lên Google Sheets",
        count: data ? data.length : 0
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ======== XỬ LÝ ĐỒNG BỘ DỮ LIỆU DVKH ========
    if (action === 'save_dvkh' || action === 'update_dvkh') {
      var data = payload.items || payload.data;
      if (!data) data = [];
      if (!Array.isArray(data)) data = [data];
      var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
      var sheet = getSheetFlexibly(ss, ['DVKH', 'dvkh', 'Dịch vụ khách hàng']);
      if (!sheet) {
        sheet = ss.insertSheet('DVKH');
      }
      var defaultHeaders = ["STT", "Mã KH", "Tên KH", "Địa chỉ", "Loại", "Ngày nhận", "Người nhận", "Ngày giao", "Người giao", "Người thực hiện", "Ngày hoàn tất", "Kết quả", "Trạng thái", "Ghi chú", "Ảnh chứng minh"];
      var lastCol = sheet.getLastColumn();
      var lastRow = sheet.getLastRow();
      var headerRowIdx = 1;
      var actualHeaders = [];

      // Quét thông minh 5 dòng đầu để tìm đúng dòng tiêu đề bảng (tránh trường hợp dòng 1 là tiêu đề gộp ô)
      if (lastCol > 0 && lastRow > 0) {
        for (var rScan = 1; rScan <= Math.min(5, lastRow); rScan++) {
          var rVals = sheet.getRange(rScan, 1, 1, lastCol).getValues()[0];
          var matchCount = 0;
          for (var cs = 0; cs < rVals.length; cs++) {
            var nVal = String(rVals[cs] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[\s_]+/g, '');
            if (nVal.includes('makh') || nVal.includes('tenkh') || nVal.includes('diachi') || nVal.includes('ngaynhan') || nVal === 'loai' || nVal.includes('trangthai')) {
              matchCount++;
            }
          }
          if (matchCount >= 2) {
            headerRowIdx = rScan;
            actualHeaders = rVals;
            break;
          }
        }
        if (actualHeaders.length === 0) {
          actualHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        }
      }

      if (actualHeaders.length === 0 || !actualHeaders.some(function(h) { return String(h || '').trim().length > 0; })) {
        actualHeaders = defaultHeaders;
        sheet.getRange(1, 1, 1, actualHeaders.length).setValues([actualHeaders]);
        headerRowIdx = 1;
      }
      
      var normH = function(h) {
        return String(h || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[\s_]+/g, '');
      };
      
      // Ánh xạ cột động theo header thực tế trong sheet của người dùng
      var colIndices = {};
      for (var c = 0; c < actualHeaders.length; c++) {
        var nh = normH(actualHeaders[c]);
        if (!nh) continue;
        if (nh === 'stt' || nh === 'sothutu' || nh === 'stths') colIndices.stt = c;
        else if (nh === 'makh' || nh === 'makhachhang' || nh === 'ma_kh' || nh === 'ma') colIndices.maKh = c;
        else if (nh === 'tenkh' || nh === 'tenkhachhang' || nh === 'hoten' || nh === 'ten') colIndices.tenKh = c;
        else if (nh === 'diachi' || nh === 'diachikhachhang') colIndices.diaChi = c;
        else if (nh === 'loai' || nh === 'loaiyeucau' || nh === 'yeucau' || nh === 'loaihs') colIndices.loai = c;
        else if (nh === 'ngaynhan' || nh === 'ngaytao') colIndices.ngayNhan = c;
        else if (nh === 'nguoinhan') colIndices.nguoiNhan = c;
        else if (nh === 'ngaygiao') colIndices.ngayGiao = c;
        else if (nh === 'nguoigiao') colIndices.nguoiGiao = c;
        else if (nh === 'nguoithuchien' || nh === 'nhanvien') colIndices.nguoiThucHien = c;
        else if (nh === 'ngayhoantat' || nh === 'ngayxong') colIndices.ngayHoanTat = c;
        else if (nh === 'ketqua') colIndices.ketQua = c;
        else if (nh === 'trangthai') colIndices.trangThai = c;
        else if (nh === 'ghichu' || nh === 'trongai' || nh === 'noidungghichu') colIndices.ghiChu = c;
        else if (nh === 'pic' || nh === 'hinhanh' || nh === 'anh' || nh === 'linkanh' || nh === 'anhchungminh') colIndices.pic = c;
        else if (nh === 'sdt' || nh === 'dienthoai' || nh === 'sodienthoai') colIndices.sdt = c;
        else if (nh === 'nguoitao') colIndices.nguoiTao = c;
      }
      
      var makhCol = colIndices.maKh !== undefined ? colIndices.maKh : 1;
      var dataStartRow = headerRowIdx + 1;
      var rowCount = lastRow - headerRowIdx;
      var existingData = rowCount > 0 ? sheet.getRange(dataStartRow, 1, rowCount, actualHeaders.length).getValues() : [];
      var maKhMap = {};
      var maxStt = 0;
      for (var r = 0; r < existingData.length; r++) {
        var mkh = String(existingData[r][makhCol] || '').trim().toLowerCase();
        if (mkh) maKhMap[mkh] = dataStartRow + r;
        if (colIndices.stt !== undefined) {
          var valStt = parseInt(String(existingData[r][colIndices.stt] || 0), 10);
          if (!isNaN(valStt) && valStt > maxStt) maxStt = valStt;
        }
      }
      if (maxStt === 0) maxStt = existingData.length;
      
      for (var i = 0; i < data.length; i++) {
        var item = data[i];
        var itemMaKh = String(item.maKh || item['Mã KH'] || item['makh'] || '').trim().toLowerCase();
        var isNewRow = !itemMaKh || !maKhMap[itemMaKh];
        var rowNum = isNewRow ? -1 : maKhMap[itemMaKh];
        var rowArr = isNewRow ? new Array(actualHeaders.length).fill('') : existingData[rowNum - dataStartRow].slice();
        
        var curStt = item.stt;
        if (!curStt) {
          if (isNewRow) {
            maxStt++;
            curStt = maxStt;
          } else if (colIndices.stt !== undefined) {
            curStt = rowArr[colIndices.stt] || (rowNum - headerRowIdx);
          }
        }
        
        if (colIndices.stt !== undefined) rowArr[colIndices.stt] = curStt;
        if (colIndices.maKh !== undefined) rowArr[colIndices.maKh] = item.maKh || item['Mã KH'] || rowArr[colIndices.maKh] || '';
        if (colIndices.tenKh !== undefined) rowArr[colIndices.tenKh] = item.tenKh || item['Tên KH'] || rowArr[colIndices.tenKh] || '';
        if (colIndices.diaChi !== undefined) rowArr[colIndices.diaChi] = item.diaChi || item['Địa chỉ'] || rowArr[colIndices.diaChi] || '';
        if (colIndices.loai !== undefined) rowArr[colIndices.loai] = item.loaiYeuCau || item.loai || item['Loại'] || rowArr[colIndices.loai] || 'Gắn mới';
        if (colIndices.ngayNhan !== undefined) rowArr[colIndices.ngayNhan] = item.ngayNhan || item.ngayTao || item['Ngày nhận'] || rowArr[colIndices.ngayNhan] || '';
        if (colIndices.nguoiNhan !== undefined && (item.nguoiNhan !== undefined || isNewRow)) rowArr[colIndices.nguoiNhan] = item.nguoiNhan || '';
        if (colIndices.ngayGiao !== undefined && (item.ngayGiao !== undefined || isNewRow)) rowArr[colIndices.ngayGiao] = item.ngayGiao || '';
        if (colIndices.nguoiGiao !== undefined) rowArr[colIndices.nguoiGiao] = ''; // Người giao luôn là DVKH nên không cần thiết phải lưu!
        if (colIndices.nguoiThucHien !== undefined && (item.nguoiThucHien !== undefined || isNewRow)) rowArr[colIndices.nguoiThucHien] = item.nguoiThucHien || '';
        if (colIndices.ngayHoanTat !== undefined && (item.ngayHoanTat !== undefined || isNewRow)) rowArr[colIndices.ngayHoanTat] = item.ngayHoanTat || '';
        if (colIndices.ketQua !== undefined && (item.ketQua !== undefined || isNewRow)) rowArr[colIndices.ketQua] = item.ketQua || '';
        if (colIndices.trangThai !== undefined) rowArr[colIndices.trangThai] = item.trangThai || (isNewRow ? 'Chưa giao' : (rowArr[colIndices.trangThai] || 'Chưa giao'));
        if (colIndices.ghiChu !== undefined) rowArr[colIndices.ghiChu] = item.ghiChu !== undefined ? item.ghiChu : (rowArr[colIndices.ghiChu] || '');
        if (colIndices.pic !== undefined && (item.pic !== undefined || isNewRow)) rowArr[colIndices.pic] = item.pic || '';
        if (colIndices.sdt !== undefined && item.sdt) rowArr[colIndices.sdt] = item.sdt;
        if (colIndices.nguoiTao !== undefined) rowArr[colIndices.nguoiTao] = item.nguoiTao || '';
        
        if (isNewRow) {
          sheet.appendRow(rowArr);
          maKhMap[itemMaKh] = sheet.getLastRow();
        } else {
          sheet.getRange(rowNum, 1, 1, actualHeaders.length).setValues([rowArr]);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Đã cập nhật DVKH", count: data.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ======== CẬP NHẬT KẾT QUẢ KIỂM TRA KIỆN TOÀN HTDD (TỐI ƯU SIÊU TỐC CHO 200K DÒNG) ========
    if (action === 'update_kthtdd') {
      var data = payload.data || payload;
      var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
      var sheet = getSheetFlexibly(ss, ['KTHTDD', 'KT_HTDD', 'Kiện toàn HTDD', 'KienToanHTDD']);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Không tìm thấy sheet KTHTDD" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      var maKh = String(data.maKh || '').trim();
      if (!maKh) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Thiếu Mã KH" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow < 2) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Sheet rỗng hoặc chưa có dữ liệu" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Đọc các dòng đầu tiên để tìm đúng dòng tiêu đề bảng (tránh lỗi nếu dòng 1 là tiêu đề gộp ô)
      var headerRowIdx = 1;
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      for (var rScan = 1; rScan <= Math.min(5, lastRow); rScan++) {
        var rVals = sheet.getRange(rScan, 1, 1, lastCol).getValues()[0];
        var matchCount = 0;
        for (var cs = 0; cs < rVals.length; cs++) {
          var nH = String(rVals[cs] || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
          if (nH.includes('makh') || nH.includes('matram') || nH.includes('ketqua') || nH.includes('nguoith') || nH.includes('danhso') || nH.includes('sono')) matchCount++;
        }
        if (matchCount >= 2) {
          headerRowIdx = rScan;
          headers = rVals;
          break;
        }
      }

      var colMaKh = -1, colNgay = -1, colKetQua = -1, colChi = -1, colDeXuat = -1, colX = -1, colY = -1;
      var colNguoiThucHien = -1, colSoDienThoai = -1, colPic = -1;
      var colDiaChi = -1;
      var allNguoiThCols = [];
      var allChiCols = [];
      for (var c = 0; c < headers.length; c++) {
        var rawH = String(headers[c] || '').trim();
        var rawLower = rawH.toLowerCase();
        var h = rawH.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
        if (!h) continue;

        if (h.includes('makh')) colMaKh = c;
        if (h === 'ngay' || h.includes('ngaykt') || h.includes('ngaykiemtra') || rawLower.indexOf('ngày') !== -1) {
          if (colNgay === -1) colNgay = c;
        }
        if (h.includes('ketqua')) colKetQua = c;

        // Nhận diện cột Địa chỉ để TUYỆT ĐỐI không bị nhầm với cột Chì
        if (h.includes('diachi') || rawLower.indexOf('địa chỉ') !== -1 || rawLower.indexOf('dia chi') !== -1) {
          colDiaChi = c;
        }

        // Nhận diện cột Chì? / Bấm chì / Niêm chì - loại trừ triệt để địa chỉ, chỉ số, chi nhánh, chi tiết, tiêu chí
        var isNotLeadSeal = (
          h.includes('diachi') || h.includes('chiso') || h.includes('chinhanh') || h.includes('chidao') ||
          h.includes('chitiet') || h.includes('tieuchi') || h.includes('chidan') || h.includes('chitieu') ||
          rawLower.indexOf('địa chỉ') !== -1 || rawLower.indexOf('chỉ số') !== -1 || rawLower.indexOf('chi nhánh') !== -1 ||
          rawLower.indexOf('chi tiết') !== -1 || rawLower.indexOf('tiêu chí') !== -1
        );
        if (!isNotLeadSeal) {
          if (
            h === 'chi' || h === 'bamchi' || h === 'niemchi' || h === 'kepchi' ||
            h === 'tinhtrangchi' || h === 'tinhtrangniemchi' || h === 'tinhtrangbamchi' ||
            h === 'tinhhinhchi' || h === 'tinhhinhniemchi' || h === 'tinhhinhbamchi' ||
            h === 'kiemtrachi' || h === 'chiniem' ||
            rawLower.indexOf('bấm chì') !== -1 || rawLower.indexOf('bam chi') !== -1 ||
            rawLower.indexOf('niêm chì') !== -1 || rawLower.indexOf('niem chi') !== -1 ||
            rawLower.indexOf('kẹp chì') !== -1 || rawLower.indexOf('chì?') !== -1 ||
            rawLower === 'chì' || rawLower === 'chi?' || rawLower === 'chi'
          ) {
            if (colChi === -1) colChi = c;
            if (allChiCols.indexOf(c) === -1) allChiCols.push(c);
          }
        }

        if (h.includes('dexuat') || h.includes('ghichu')) colDeXuat = c;
        if (rawH.toUpperCase() === 'X' || h === 'x' || h === 'toadox' || h === 'vido' || h.includes('toadox')) colX = c;
        if (rawH.toUpperCase() === 'Y' || h === 'y' || h === 'toadoy' || h === 'kinhdo' || h.includes('toadoy')) colY = c;
        if (h.includes('nguoithuchien') || h === 'nguoith' || h.includes('nhanvienthuchien') || h.includes('nvth') || 
            h.includes('nguoikt') || h.includes('nguoikiemtra') || h.includes('phancong') || h.includes('nguoixl') ||
            rawLower.indexOf('thực hiện') !== -1 || rawLower.indexOf('thuc hien') !== -1 || rawLower.indexOf('người th') !== -1) {
          if (colNguoiThucHien === -1) colNguoiThucHien = c;
          if (allNguoiThCols.indexOf(c) === -1) allNguoiThCols.push(c);
        }
        if (h.includes('sodienthoai') || h.includes('sdt') || h.includes('dienthoai') || h.includes('sodt')) colSoDienThoai = c;
        if (rawH.toUpperCase() === 'PIC' || h === 'pic' || h.includes('pic') || h.includes('hinhanh') || h.includes('anh')) colPic = c;
      }
      if (colMaKh === -1) colMaKh = 1; // Default Col B (cột 2)
      if (colNgay === -1) colNgay = 10; // Default Col K (cột 11)
      if (colKetQua === -1) colKetQua = 11; // Default Col L (cột 12)
      if (colChi === -1 || colChi === colDiaChi) colChi = 12; // CỐ ĐỊNH CỘT M (CỘT 13, INDEX 12)
      if (colDeXuat === -1) colDeXuat = 13; // Default Col N (cột 14)
      
      // CỐ ĐỊNH DỨT ĐIỂM: CỘT O (CỘT 15, INDEX 14) LÀ CỘT "NGƯỜI THỰC HIỆN"
      if (colNguoiThucHien === -1) colNguoiThucHien = 14;
      if (allNguoiThCols.indexOf(14) === -1) allNguoiThCols.unshift(14);
      if (colX === -1) colX = 15; // Default Col P (cột 16)
      if (colY === -1) colY = 16; // Default Col Q (cột 17)
      if (colPic === -1) colPic = 17; // Default Col R (cột 18)

      // Đảm bảo dòng tiêu đề chuẩn xác, TUYỆT ĐỐI KHÔNG TỰ ĐỘNG THÊM CỘT BỪA BÃI
      try {
        if (!String(sheet.getRange(headerRowIdx, 11).getValue() || '').trim() && colNgay === -1) sheet.getRange(headerRowIdx, 11).setValue('Ngày');
        if (!String(sheet.getRange(headerRowIdx, 12).getValue() || '').trim() && colKetQua === -1) sheet.getRange(headerRowIdx, 12).setValue('Kết quả');
        if (!String(sheet.getRange(headerRowIdx, 13).getValue() || '').trim() && allChiCols.length === 0) sheet.getRange(headerRowIdx, 13).setValue('Chì?');
        if (!String(sheet.getRange(headerRowIdx, 14).getValue() || '').trim() && colDeXuat === -1) sheet.getRange(headerRowIdx, 14).setValue('Đề xuất');
        if (!String(sheet.getRange(headerRowIdx, 15).getValue() || '').trim() && allNguoiThCols.length === 0) sheet.getRange(headerRowIdx, 15).setValue('Người thực hiện');
        if (data.x !== undefined && data.x !== '' && colX === -1 && !String(sheet.getRange(headerRowIdx, 16).getValue() || '').trim()) sheet.getRange(headerRowIdx, 16).setValue('X');
        if (data.y !== undefined && data.y !== '' && colY === -1 && !String(sheet.getRange(headerRowIdx, 17).getValue() || '').trim()) sheet.getRange(headerRowIdx, 17).setValue('Y');
        if (data.pic !== undefined && data.pic !== '' && colPic === -1 && !String(sheet.getRange(headerRowIdx, 18).getValue() || '').trim()) sheet.getRange(headerRowIdx, 18).setValue('Pic');
      } catch (eHdr) {}

      // Tìm dòng bằng TextFinder của Google Sheets (thuật toán tìm nhị phân native C++ siêu tốc < 50ms cho 200k dòng)
      var targetRow = -1;
      var finder = sheet.getRange(2, colMaKh + 1, lastRow - 1, 1)
        .createTextFinder(maKh)
        .matchEntireCell(true)
        .findNext();
      
      if (finder) {
        targetRow = finder.getRow();
      } else {
        // Thử regex không phân biệt chữ hoa thường
        finder = sheet.getRange(2, colMaKh + 1, lastRow - 1, 1)
          .createTextFinder("^" + maKh + "$")
          .matchEntireCell(true)
          .useRegularExpression(true)
          .matchCase(false)
          .findNext();
        if (finder) {
          targetRow = finder.getRow();
        } else {
          // Fallback quét chỉ 1 cột Mã KH (nhẹ hơn 15 lần so với tải toàn bộ bảng)
          var colVals = sheet.getRange(2, colMaKh + 1, lastRow - 1, 1).getValues();
          var lowerMaKh = maKh.toLowerCase();
          for (var r = 0; r < colVals.length; r++) {
            if (String(colVals[r][0] || '').trim().toLowerCase() === lowerMaKh) {
              targetRow = r + 2;
              break;
            }
          }
        }
      }

      if (targetRow > 1) {
        // Đọc 1 dòng duy nhất để ghi cập nhật theo mảng 1 lần (Single Batch Range Update)
        var maxColNeeded = Math.max(headers.length, colX + 1, colY + 1, colPic + 1, colNgay + 1, colChi + 1, 15);
        var rowRange = sheet.getRange(targetRow, 1, 1, maxColNeeded);
        var rowArr = rowRange.getValues()[0];
        
        // 1. Cột Ngày (Cột K, index 10)
        if (data.ngay !== undefined && data.ngay !== '') {
          if (colNgay > -1) rowArr[colNgay] = "'" + data.ngay;
          rowArr[10] = "'" + data.ngay;
        }
        // 2. Cột Kết quả (Cột L, index 11)
        if (data.ketQua !== undefined && data.ketQua !== '') {
          if (colKetQua > -1) rowArr[colKetQua] = data.ketQua;
          rowArr[11] = data.ketQua;
        }
        // 3. Cột Chì? / Bấm chì (Bắt buộc ghi "Có" hoặc "Không", tuyệt đối không để rỗng)
        var inputChi = data.chi !== undefined ? data.chi : (data.bamChi !== undefined ? data.bamChi : (data.tinhTrangChi !== undefined ? data.tinhTrangChi : undefined));
        var cleanChi = '';
        if (inputChi !== undefined && String(inputChi).trim()) {
          var normChiLower = String(inputChi).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          if (normChiLower.indexOf('không') !== -1 || normChiLower.indexOf('khong') !== -1 || normChiLower === 'ko' || normChiLower === 'k' || normChiLower === '0' || normChiLower === 'mat' || normChiLower === 'dut' || normChiLower === 'hong' || normChiLower === 'false') {
            cleanChi = 'Không';
          } else {
            cleanChi = 'Có';
          }
        } else if (data.ketQua !== undefined && String(data.ketQua).trim()) {
          var normKqLower = String(data.ketQua).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          if (normKqLower.indexOf('không') !== -1 || normKqLower.indexOf('khong') !== -1 || normKqLower.indexOf('bat thuong') !== -1 || normKqLower.indexOf('mat') !== -1) {
            cleanChi = 'Không';
          } else {
            cleanChi = 'Có';
          }
        }

        if (cleanChi) {
          if (colChi > -1 && colChi !== colDiaChi) {
            rowArr[colChi] = cleanChi;
          }
          for (var cc = 0; cc < allChiCols.length; cc++) {
            if (allChiCols[cc] !== colDiaChi) {
              rowArr[allChiCols[cc]] = cleanChi;
            }
          }
          if (colChi === -1 && allChiCols.length === 0 && colNgay !== 12 && colKetQua !== 12 && colDeXuat !== 12 && colNguoiThucHien !== 12) {
            rowArr[12] = cleanChi;
          }
        }

        // 4. Cột Đề xuất (Cột N, index 13 - không ghi đè lên cột chì)
        if (data.deXuat !== undefined) {
          if (colDeXuat > -1 && colDeXuat !== colChi && allChiCols.indexOf(colDeXuat) === -1) {
            rowArr[colDeXuat] = data.deXuat;
          } else if (colDeXuat === -1 && colChi !== 13 && allChiCols.indexOf(13) === -1 && colKetQua !== 13 && colNgay !== 13) {
            rowArr[13] = data.deXuat;
          }
        }
        // 5. Cột X & Y (Tọa độ GPS)
        if (data.x !== undefined && data.x !== '' && colX > -1) rowArr[colX] = data.x;
        if (data.y !== undefined && data.y !== '' && colY > -1) rowArr[colY] = data.y;
        // 6. Cột Người thực hiện (Cột O, index 14)
        if (data.nguoiThucHien !== undefined && data.nguoiThucHien !== '') {
          rowArr[14] = data.nguoiThucHien; // CỐ ĐỊNH CỘT O (CỘT 15, INDEX 14)
          for (var nc = 0; nc < allNguoiThCols.length; nc++) {
            rowArr[allNguoiThCols[nc]] = data.nguoiThucHien;
          }
        }
        if (data.soDienThoai !== undefined && colSoDienThoai > -1) rowArr[colSoDienThoai] = "'" + data.soDienThoai;
        if (data.pic !== undefined && colPic > -1) rowArr[colPic] = data.pic;
        rowRange.setValues([rowArr]);

        return ContentService.createTextOutput(JSON.stringify({ 
          status: "success", 
          message: "Đã cập nhật kết quả kiểm tra KH: " + data.maKh,
          row: targetRow
        })).setMimeType(ContentService.MimeType.JSON);
      }

      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Không tìm thấy Mã KH trong sheet KTHTDD: " + data.maKh 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ======== PHÂN CÔNG KIỂM TRA TRẠM TRONG SHEET KTHTDD (TỐI ƯU SIÊU TỐC CHO 200K DÒNG - RANGELIST) ========
    if (action === 'assign_kthtdd') {
      var data = payload.data || payload;
      var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
      var sheet = getSheetFlexibly(ss, ['KTHTDD', 'KT_HTDD', 'Kiện toàn HTDD', 'KienToanHTDD']);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Không tìm thấy sheet KTHTDD" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      var cleanMa = String(data.maTram || '').trim();
      var cleanTen = String(data.tenTram || '').trim();
      var nguoiThucHien = String(data.nguoiThucHien || '').trim();
      var maKhList = data.maKhList || [];
      var now = new Date();
      var ngayPhanCong = String(data.ngay || '').trim() || Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy");
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow < 2) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Sheet rỗng" })).setMimeType(ContentService.MimeType.JSON);
      }

      // Quét 5 dòng đầu tiên để xác định chính xác dòng tiêu đề bảng
      var headerRowIdx = 1;
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      for (var rScan = 1; rScan <= Math.min(5, lastRow); rScan++) {
        var curRowVals = sheet.getRange(rScan, 1, 1, lastCol).getValues()[0];
        var matchCount = 0;
        for (var cs = 0; cs < curRowVals.length; cs++) {
          var normH = String(curRowVals[cs] || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
          if (normH.includes('makh') || normH.includes('matram') || normH.includes('tentram') || normH.includes('danhso') || normH.includes('sono') || normH.includes('nguoith')) {
            matchCount++;
          }
        }
        if (matchCount >= 2) {
          headerRowIdx = rScan;
          headers = curRowVals;
          break;
        }
      }

      var colMaTram = -1, colTenTram = -1, colMaKh = -1, colNgay = -1;
      var colNguoiThList = [];
      for (var c = 0; c < headers.length; c++) {
        var rawH = String(headers[c] || '').trim();
        var rawLower = rawH.toLowerCase();
        var h = rawH.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
        if (!h) continue;

        if (h.includes('makh')) colMaKh = c;
        if (h.includes('matram')) colMaTram = c;
        if (h.includes('tentram')) colTenTram = c;
        if (h === 'ngay' || h.includes('ngaykt') || h.includes('ngaykiemtra') || h.includes('ngayphancong') || rawLower.indexOf('ngày') !== -1) {
          if (colNgay === -1) colNgay = c;
        }
        if (h.includes('nguoithuchien') || h === 'nguoith' || h.includes('nhanvienthuchien') || 
            h.includes('nvth') || h.includes('nguoikt') || h.includes('nguoikiemtra') || 
            h.includes('phancong') || h.includes('nguoiduocgiao') || h.includes('nguoixl') ||
            rawLower.indexOf('thực hiện') !== -1 || rawLower.indexOf('thuc hien') !== -1 || 
            rawLower.indexOf('người th') !== -1 || rawLower.indexOf('phân công') !== -1) {
          if (colNguoiThList.indexOf(c) === -1) {
            colNguoiThList.push(c);
          }
        }
      }
      if (colMaTram === -1) colMaTram = 4; // Col E mặc định (cột 5)
      if (colTenTram === -1) colTenTram = 5; // Col F mặc định (cột 6)
      if (colMaKh === -1) colMaKh = 1; // Col B mặc định (cột 2)
      if (colNgay === -1) colNgay = 10; // Col K mặc định (cột 11)

      // CỐ ĐỊNH DỨT ĐIỂM: CỘT O (CỘT 15, INDEX 14) LÀ CỘT "NGƯỜI THỰC HIỆN"!
      // TUYỆT ĐỐI KHÔNG TỰ TẠO THÊM BẤT KỲ CỘT MỚI NÀO Ở CUỐI BẢNG!
      var colO_Index = 14; // Cột O = cột thứ 15 trong bảng tính Google Sheet (0-based index là 14)
      if (colNguoiThList.indexOf(colO_Index) === -1) {
        colNguoiThList.unshift(colO_Index);
      }

      // Đảm bảo tiêu đề cột O và cột K chuẩn xác
      try {
        if (!String(sheet.getRange(headerRowIdx, 15).getValue() || '').trim()) {
          sheet.getRange(headerRowIdx, 15).setValue('Người thực hiện');
        }
        if (!String(sheet.getRange(headerRowIdx, 11).getValue() || '').trim()) {
          sheet.getRange(headerRowIdx, 11).setValue('Ngày');
        }
      } catch (eHdr2) {}

      var escapeRegex = function(text) {
        if (!text) return "";
        var bs = String.fromCharCode(92);
        var specials = [bs, "^", "$", "*", "+", "?", ".", "(", ")", "|", "{", "}", "[", "]"];
        var s = String(text);
        for (var sp = 0; sp < specials.length; sp++) {
          s = s.split(specials[sp]).join(bs + specials[sp]);
        }
        return s;
      };

      var bs = String.fromCharCode(92);
      var rowNumbers = [];

      // THUẬT TOÁN 1: TextFinder C++ Native siêu tốc (< 50ms cho 200k dòng)
      if (cleanMa) {
        var finder = sheet.getRange(2, colMaTram + 1, lastRow - 1, 1)
          .createTextFinder(cleanMa)
          .matchEntireCell(true)
          .matchCase(false);
        var matches = finder.findAll();
        for (var m = 0; m < matches.length; m++) {
          rowNumbers.push(matches[m].getRow());
        }

        if (rowNumbers.length === 0) {
          var safeMa = escapeRegex(cleanMa);
          var finderRegex = sheet.getRange(2, colMaTram + 1, lastRow - 1, 1)
            .createTextFinder("^" + bs + "s*" + safeMa + bs + "s*$")
            .useRegularExpression(true)
            .matchCase(false);
          var matchesRegex = finderRegex.findAll();
          for (var mr = 0; mr < matchesRegex.length; mr++) {
            rowNumbers.push(matchesRegex[mr].getRow());
          }
        }
      }

      // Nếu không tìm thấy theo Mã trạm, thử theo Tên trạm
      if (rowNumbers.length === 0 && cleanTen && colTenTram > -1) {
        var finderTen = sheet.getRange(2, colTenTram + 1, lastRow - 1, 1)
          .createTextFinder(cleanTen)
          .matchEntireCell(true)
          .matchCase(false);
        var matchesTen = finderTen.findAll();
        for (var mt = 0; mt < matchesTen.length; mt++) {
          rowNumbers.push(matchesTen[mt].getRow());
        }

        if (rowNumbers.length === 0) {
          var safeTen = escapeRegex(cleanTen);
          var finderTenRegex = sheet.getRange(2, colTenTram + 1, lastRow - 1, 1)
            .createTextFinder("^" + bs + "s*" + safeTen + bs + "s*$")
            .useRegularExpression(true)
            .matchCase(false);
          var matchesTenRegex = finderTenRegex.findAll();
          for (var mtr = 0; mtr < matchesTenRegex.length; mtr++) {
            rowNumbers.push(matchesTenRegex[mtr].getRow());
          }
        }
      }

      // THUẬT TOÁN 2: Tìm nhanh theo danh sách Mã KH (Chỉ đọc duy nhất 1 cột colMaKh 200ms, khớp hash set 2ms)
      if (rowNumbers.length === 0 && maKhList && maKhList.length > 0 && colMaKh > -1) {
        var khMap = {};
        for (var k = 0; k < maKhList.length; k++) {
          var kStr = String(maKhList[k]).trim().toLowerCase();
          if (kStr) khMap[kStr] = true;
        }
        var allKhVals = sheet.getRange(2, colMaKh + 1, lastRow - 1, 1).getValues();
        for (var rk = 0; rk < allKhVals.length; rk++) {
          var vKh = String(allKhVals[rk][0] || '').trim().toLowerCase();
          if (vKh && khMap[vKh]) {
            rowNumbers.push(rk + 2);
          }
        }
      }

      // THUẬT TOÁN 3 (Fallback cuối cùng): Quét chỉ 1 cột Mã Trạm
      if (rowNumbers.length === 0) {
        var tramVals = sheet.getRange(2, colMaTram + 1, lastRow - 1, 1).getValues();
        var lowerMa = cleanMa.toLowerCase();
        for (var r = 0; r < tramVals.length; r++) {
          var v = String(tramVals[r][0] || '').trim().toLowerCase();
          if (lowerMa && (v === lowerMa || v.indexOf(lowerMa) !== -1 || lowerMa.indexOf(v) !== -1)) {
            rowNumbers.push(r + 2);
          }
        }
      }

      // GHI HÀNG LOẠT SIÊU TỐC BẰNG sheet.getRangeList() - GIẢM TỪ 26 GIÂY XUỐNG DƯỚI 200ms
      if (rowNumbers.length > 0) {
        // Loại bỏ dòng trùng lặp và sắp xếp tăng dần
        rowNumbers.sort(function(a, b) { return a - b; });
        var uniqueRows = [];
        for (var u = 0; u < rowNumbers.length; u++) {
          if (u === 0 || rowNumbers[u] !== rowNumbers[u - 1]) {
            uniqueRows.push(rowNumbers[u]);
          }
        }

        // Gom cụm thành các khối liên tiếp [start, count]
        var blocks = [];
        var start = uniqueRows[0];
        var prev = uniqueRows[0];
        for (var i = 1; i < uniqueRows.length; i++) {
          if (uniqueRows[i] === prev + 1) {
            prev = uniqueRows[i];
          } else {
            blocks.push({ start: start, count: prev - start + 1 });
            start = uniqueRows[i];
            prev = uniqueRows[i];
          }
        }
        blocks.push({ start: start, count: prev - start + 1 });

        // Chuyển đổi cột thành ký tự chữ cái (A, B, C... AA, AB)
        function getColLetter(colIdx) {
          var letter = '', temp;
          while (colIdx > 0) {
            temp = (colIdx - 1) % 26;
            letter = String.fromCharCode(temp + 65) + letter;
            colIdx = Math.floor((colIdx - temp - 1) / 26);
          }
          return letter;
        }

        var batchSize = 100;

        // 1. CẬP NHẬT CỘT NGƯỜI THỰC HIỆN (Ghi vào TẤT CẢ các cột Người thực hiện nếu có để đảm bảo đồng bộ 100%)
        for (var cn = 0; cn < colNguoiThList.length; cn++) {
          var colLetter = getColLetter(colNguoiThList[cn] + 1);
          var a1Ranges = [];
          for (var b = 0; b < blocks.length; b++) {
            var blk = blocks[b];
            if (blk.count === 1) {
              a1Ranges.push(colLetter + blk.start);
            } else {
              a1Ranges.push(colLetter + blk.start + ':' + colLetter + (blk.start + blk.count - 1));
            }
          }
          for (var bi = 0; bi < a1Ranges.length; bi += batchSize) {
            var chunk = a1Ranges.slice(bi, bi + batchSize);
            sheet.getRangeList(chunk).setValue(nguoiThucHien);
          }
        }

        // 2. CẬP NHẬT TRƯỜNG "NGÀY" (Lấy ngày hiện tại dd/MM/yyyy khi phân công cập nhật vào trường Ngày trong sheet KTHTDD)
        if (colNgay > -1) {
          var colNgayLetter = getColLetter(colNgay + 1);
          var a1RangesNgay = [];
          for (var bn = 0; bn < blocks.length; bn++) {
            var blkn = blocks[bn];
            if (blkn.count === 1) {
              a1RangesNgay.push(colNgayLetter + blkn.start);
            } else {
              a1RangesNgay.push(colNgayLetter + blkn.start + ':' + colNgayLetter + (blkn.start + blkn.count - 1));
            }
          }
          for (var bin = 0; bin < a1RangesNgay.length; bin += batchSize) {
            var chunkNgay = a1RangesNgay.slice(bin, bin + batchSize);
            sheet.getRangeList(chunkNgay).setValue("'" + ngayPhanCong);
          }
        }

        return ContentService.createTextOutput(JSON.stringify({ 
          status: "success", 
          message: "Đã phân công " + uniqueRows.length + " khách hàng thuộc trạm " + (data.maTram || data.tenTram),
          count: uniqueRows.length
        })).setMimeType(ContentService.MimeType.JSON);
      }

      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Không tìm thấy khách hàng nào khớp với trạm " + (data.maTram || data.tenTram) + " trong sheet KTHTDD",
        count: 0
      })).setMimeType(ContentService.MimeType.JSON);
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
      
      var stripZero = function(s) { return String(s).replace(/(^|[/])0+(\\d)/g, '$1$2'); };
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
      
      var stripZero = function(s) { return String(s).replace(/(^|[/])0+(\\d)/g, '$1$2'); };
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

    
    if (action === 'upload_image' || action === 'upload_kthtdd_image') {
       try {
           var folderId = payload.folderId || "1eze4kVWtdUr0gjKSEAB_BKSfm5CNg3fv";
           var folder = DriveApp.getFolderById(folderId);
           var rawB64 = payload.base64 || '';
           var b64 = rawB64.indexOf(',') > -1 ? rawB64.split(',')[1] : rawB64;
           var bytes = Utilities.base64Decode(b64);
           var mime = payload.mimeType || 'image/jpeg';
           var fName = payload.fileName || ('KT_' + (payload.maKh || new Date().getTime()) + '.jpg');

           // Tối ưu siêu tốc O(1): Nếu có oldFileId thì xóa trực tiếp theo ID < 50ms (không duyệt quét cả thư mục)
           if (payload.oldFileId) {
             try {
               DriveApp.getFileById(payload.oldFileId).setTrashed(true);
             } catch(delErr) {}
           }

           // Tạo file trực tiếp trong thư mục Google Drive (Chỉ mất < 800ms thay vì đợi mở bảng tính 200k dòng)
           var blob = Utilities.newBlob(bytes, mime, fName);
           var file = folder.createFile(blob);
           var fileId = file.getId();

           var driveThumbUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1000";
           var driveDirectUrl = "https://drive.google.com/file/d/" + fileId + "/view?usp=drivesdk";
           var finalUrl = driveDirectUrl;

           return ContentService.createTextOutput(JSON.stringify({ 
               status: 'success', 
               url: finalUrl,
               thumbnailUrl: driveThumbUrl,
               fileId: fileId,
               fileName: fName
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

        var xCol = -1, yCol = -1;
        for (var c2 = 0; c2 < headers.length; c2++) {
            var cH = normalizeDcuH(headers[c2]);
            if (cH.indexOf('toadox') !== -1 || cH.indexOf('vido') !== -1) xCol = c2;
            if (cH.indexOf('toadoy') !== -1 || cH.indexOf('kinhdo') !== -1) yCol = c2;
        }
        
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
            
            // Bảo vệ: Tuyệt đối không cho xóa dòng đã xử lý (đã có tọa độ X và Y)
            if (xCol !== -1 && yCol !== -1) {
                var rX = String(sheetData[r][xCol] != null ? sheetData[r][xCol] : '').trim();
                var rY = String(sheetData[r][yCol] != null ? sheetData[r][yCol] : '').trim();
                if (rX !== '' && rY !== '') {
                    continue;
                }
            }

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

    // ======== XÓA SẠCH DỮ LIỆU CŨ VÀ ĐƯA DỮ LIỆU MỚI VÀO SHEET HTDD (QUAHAN, TU, TI, QUAHAN_NAM, TU_NAM, TI_NAM) ========
    if (action === 'overwrite_htdd_sheet' || action === 'import_htdd_sheet') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheetName = payload.sheetName;
       if (!sheetName) {
           return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Thiếu tên sheet' })).setMimeType(ContentService.MimeType.JSON);
       }
       var sheet = getSheetFlexibly(ss, [sheetName]);
       if (!sheet) {
           sheet = ss.insertSheet(sheetName);
       }
       // 1. XÓA SẠCH HẾT NỘI DUNG VÀ DÒNG CŨ CỦA SHEET ĐỂ TRÁNH DỮ LIỆU THỪA LƯU LẠI
       sheet.clearContents();
       var headers = payload.headers || [];
       var rows = payload.rows || [];
       if (headers.length > 0 && rows.length > 0) {
           var matrix = [headers];
           for (var r = 0; r < rows.length; r++) {
               var rowItem = rows[r];
               var rowValues = [];
               for (var c = 0; c < headers.length; c++) {
                   var h = headers[c];
                   var val = rowItem[h];
                   if (val === undefined || val === null) {
                       val = rowItem[h.toLowerCase()] !== undefined ? rowItem[h.toLowerCase()] : '';
                   }
                   rowValues.push(String(val));
               }
               matrix.push(rowValues);
           }
           sheet.getRange(1, 1, matrix.length, headers.length).setValues(matrix);
       } else if (headers.length > 0) {
           sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
       }
       return ContentService.createTextOutput(JSON.stringify({ 
           status: 'success', 
           message: 'Đã xóa sạch sheet cũ và đưa ' + rows.length + ' dòng mới vào sheet ' + sheetName, 
           rowCount: rows.length 
       })).setMimeType(ContentService.MimeType.JSON);
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

        var ketQuaCol = -1;
        for (var c2 = 0; c2 < headers.length; c2++) {
            var cH = normalizeXlH(headers[c2]);
            if (cH.indexOf('ketqua') !== -1 || cH.indexOf('kq') !== -1) ketQuaCol = c2;
        }
        
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
            
            // Bảo vệ: Tuyệt đối không xóa bản ghi đã xử lý ('Xong')
            if (ketQuaCol !== -1) {
                var rKq = String(sheetData[r][ketQuaCol] != null ? sheetData[r][ketQuaCol] : '').trim().toLowerCase();
                if (rKq === 'xong') {
                    continue;
                }
            }

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

    if (action === 'save_dvkh' || action === 'update_dvkh') {
       var ss = (SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID));
       var sheet = getSheetFlexibly(ss, ['DVKH', 'dvkh', 'Dịch vụ khách hàng', 'DV_KH']);
       if (!sheet) {
           sheet = ss.insertSheet('DVKH');
           sheet.appendRow([
             'STT', 'Mã KH', 'Tên KH', 'Địa chỉ', 'Số điện thoại', 'Loại', 
             'Ngày nhận', 'Người nhận', 'Ngày giao', 'Người giao', 'Người thực hiện', 
             'Ngày hoàn tất', 'Kết quả', 'Trạng thái', 'Ghi chú', 'Hình ảnh', 'Ngày tạo', 'Người tạo'
           ]);
       }

       var items = payload.items || (payload.data ? (Array.isArray(payload.data) ? payload.data : [payload.data]) : []);
       if (!Array.isArray(items) || items.length === 0) {
           return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'No items to update' })).setMimeType(ContentService.MimeType.JSON);
       }

       var sheetData = sheet.getDataRange().getValues();
       var headerRowIdx = 0;
       
       function normDvkhH(raw) {
           var s = String(raw || '').toLowerCase().trim();
           if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
           return s.replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
       }

       for (var rIdx = 0; rIdx < Math.min(5, sheetData.length); rIdx++) {
           var tempRow = sheetData[rIdx] || [];
           var foundMakh = false;
           for (var c = 0; c < tempRow.length; c++) {
               var h = normDvkhH(tempRow[c]);
               if (h === 'makh' || h === 'makhachhang' || h === 'ma') {
                   foundMakh = true;
                   break;
               }
           }
           if (foundMakh) {
               headerRowIdx = rIdx;
               break;
           }
       }

       var headers = sheetData[headerRowIdx] || [];
       var colMap = {};
       for (var c = 0; c < headers.length; c++) {
           var h = normDvkhH(headers[c]);
           if (h === 'stt' || h === 'sott') colMap.stt = c;
           else if (h === 'makh' || h === 'makhachhang' || h === 'ma') colMap.maKh = c;
           else if (h === 'tenkh' || h === 'tenkhachhang' || h === 'ten' || h === 'hovaten') colMap.tenKh = c;
           else if (h === 'diachi' || h === 'diachikhachhang') colMap.diaChi = c;
           else if (h === 'sdt' || h === 'sodienthoai' || h === 'dienthoai' || h === 'phone') colMap.sdt = c;
           else if (h === 'loai' || h === 'loaiyeucau' || h === 'yeucau') colMap.loai = c;
           else if (h === 'ngaynhan') colMap.ngayNhan = c;
           else if (h === 'nguoinhan') colMap.nguoiNhan = c;
           else if (h === 'ngaygiao') colMap.ngayGiao = c;
           else if (h === 'nguoigiao') colMap.nguoiGiao = c;
           else if (h === 'nguoithuchien' || h === 'nhanvien' || h === 'nguoith') colMap.nguoiThucHien = c;
           else if (h === 'ngayhoantat' || h === 'ngayxong') colMap.ngayHoanTat = c;
           else if (h === 'ketqua') colMap.ketQua = c;
           else if (h === 'trangthai') colMap.trangThai = c;
           else if (h === 'ghichu' || h === 'trongai') colMap.ghiChu = c;
           else if (h === 'hinhanh' || h === 'pic' || h === 'anh' || h === 'anhtrongai') colMap.pic = c;
           else if (h === 'ngaytao') colMap.ngayTao = c;
           else if (h === 'nguoitao') colMap.nguoiTao = c;
       }

       if (colMap.maKh === undefined) colMap.maKh = 1;

       var existingRowIndexByMaKh = {};
       for (var r = headerRowIdx + 1; r < sheetData.length; r++) {
           var rowMaKh = String(sheetData[r][colMap.maKh] || '').trim().toLowerCase();
           if (rowMaKh) {
               existingRowIndexByMaKh[rowMaKh] = r + 1;
           }
       }

       var updatedCount = 0;
       var appendedCount = 0;

       for (var i = 0; i < items.length; i++) {
           var item = items[i];
           var maKhKey = String(item.maKh || '').trim().toLowerCase();
           if (!maKhKey) continue;

           var rowIndex = existingRowIndexByMaKh[maKhKey];
           if (rowIndex) {
               if (colMap.stt !== undefined && item.stt !== undefined) sheet.getRange(rowIndex, colMap.stt + 1).setValue(item.stt);
               if (colMap.tenKh !== undefined && item.tenKh !== undefined) sheet.getRange(rowIndex, colMap.tenKh + 1).setValue(item.tenKh);
               if (colMap.diaChi !== undefined && item.diaChi !== undefined) sheet.getRange(rowIndex, colMap.diaChi + 1).setValue(item.diaChi);
               if (colMap.sdt !== undefined && item.sdt !== undefined) sheet.getRange(rowIndex, colMap.sdt + 1).setValue(item.sdt);
               if (colMap.loai !== undefined && (item.loai || item.loaiYeuCau)) sheet.getRange(rowIndex, colMap.loai + 1).setValue(item.loai || item.loaiYeuCau);
               if (colMap.ngayNhan !== undefined && item.ngayNhan !== undefined) sheet.getRange(rowIndex, colMap.ngayNhan + 1).setValue(item.ngayNhan);
               if (colMap.nguoiNhan !== undefined && item.nguoiNhan !== undefined) sheet.getRange(rowIndex, colMap.nguoiNhan + 1).setValue(item.nguoiNhan);
               if (colMap.ngayGiao !== undefined && item.ngayGiao !== undefined) sheet.getRange(rowIndex, colMap.ngayGiao + 1).setValue(item.ngayGiao);
               if (colMap.nguoiGiao !== undefined && item.nguoiGiao !== undefined) sheet.getRange(rowIndex, colMap.nguoiGiao + 1).setValue(item.nguoiGiao);
               if (colMap.nguoiThucHien !== undefined && item.nguoiThucHien !== undefined) sheet.getRange(rowIndex, colMap.nguoiThucHien + 1).setValue(item.nguoiThucHien);
               if (colMap.ngayHoanTat !== undefined && item.ngayHoanTat !== undefined) sheet.getRange(rowIndex, colMap.ngayHoanTat + 1).setValue(item.ngayHoanTat);
               if (colMap.ketQua !== undefined && item.ketQua !== undefined) sheet.getRange(rowIndex, colMap.ketQua + 1).setValue(item.ketQua);
               if (colMap.trangThai !== undefined && item.trangThai !== undefined) sheet.getRange(rowIndex, colMap.trangThai + 1).setValue(item.trangThai);
               if (colMap.ghiChu !== undefined && item.ghiChu !== undefined) sheet.getRange(rowIndex, colMap.ghiChu + 1).setValue(item.ghiChu);
               if (colMap.pic !== undefined && item.pic !== undefined) sheet.getRange(rowIndex, colMap.pic + 1).setValue(item.pic);
               if (colMap.ngayTao !== undefined && item.ngayTao !== undefined) sheet.getRange(rowIndex, colMap.ngayTao + 1).setValue(item.ngayTao);
               if (colMap.nguoiTao !== undefined && item.nguoiTao !== undefined) sheet.getRange(rowIndex, colMap.nguoiTao + 1).setValue(item.nguoiTao);
               updatedCount++;
           } else {
               var lastRow = sheet.getLastRow();
               var newRow = new Array(headers.length).fill('');
               if (colMap.stt !== undefined) newRow[colMap.stt] = item.stt || (lastRow - headerRowIdx + 1);
               if (colMap.maKh !== undefined) newRow[colMap.maKh] = item.maKh;
               if (colMap.tenKh !== undefined) newRow[colMap.tenKh] = item.tenKh || '';
               if (colMap.diaChi !== undefined) newRow[colMap.diaChi] = item.diaChi || '';
               if (colMap.sdt !== undefined) newRow[colMap.sdt] = item.sdt || '';
               if (colMap.loai !== undefined) newRow[colMap.loai] = item.loai || item.loaiYeuCau || 'Gắn mới';
               if (colMap.ngayNhan !== undefined) newRow[colMap.ngayNhan] = item.ngayNhan || '';
               if (colMap.nguoiNhan !== undefined) newRow[colMap.nguoiNhan] = item.nguoiNhan || '';
               if (colMap.ngayGiao !== undefined) newRow[colMap.ngayGiao] = item.ngayGiao || '';
               if (colMap.nguoiGiao !== undefined) newRow[colMap.nguoiGiao] = item.nguoiGiao || '';
               if (colMap.nguoiThucHien !== undefined) newRow[colMap.nguoiThucHien] = item.nguoiThucHien || '';
               if (colMap.ngayHoanTat !== undefined) newRow[colMap.ngayHoanTat] = item.ngayHoanTat || '';
               if (colMap.ketQua !== undefined) newRow[colMap.ketQua] = item.ketQua || '';
               if (colMap.trangThai !== undefined) newRow[colMap.trangThai] = item.trangThai || 'Chưa giao';
               if (colMap.ghiChu !== undefined) newRow[colMap.ghiChu] = item.ghiChu || '';
               if (colMap.pic !== undefined) newRow[colMap.pic] = item.pic || '';
               if (colMap.ngayTao !== undefined) newRow[colMap.ngayTao] = item.ngayTao || item.ngayNhan || '';
               if (colMap.nguoiTao !== undefined) newRow[colMap.nguoiTao] = item.nguoiTao || '';

               sheet.appendRow(newRow);
               existingRowIndexByMaKh[maKhKey] = sheet.getLastRow();
               appendedCount++;
           }
       }

       return ContentService.createTextOutput(JSON.stringify({ 
           status: 'success', 
           updatedCount: updatedCount, 
           appendedCount: appendedCount 
       })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action: ' + action })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

export default function ConfigModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState(DataStore.getAppScriptUrl());
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSaveAndSync = async () => {
    DataStore.setAppScriptUrl(url);
    setSyncing(true);
    setSyncResult(null);
    const success = await DataStore.syncMasterData();
    setSyncing(false);
    if (success) {
       setSyncResult('success');
    } else {
       setSyncResult('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#E4E3E0]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-[4px] border-[#141414] shadow-[8px_8px_0_rgba(20,20,20,1)] max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#141414] hover:bg-[#E4E3E0] p-2 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-6 lg:p-10">
          <div className="flex items-center justify-between mb-6 pr-12 flex-wrap gap-2">
            <h2 className="font-serif italic text-2xl">
               Cấu hình Hệ Thống & Google Scripts
            </h2>
            <span className="text-xs font-mono font-bold bg-slate-900 text-white px-2.5 py-1 rounded shadow-sm">
               v{APP_VERSION}
            </span>
          </div>
          
          <div className="space-y-6 text-sm font-sans">
            <div className="bg-[#FFF4E5] border border-orange-400 p-4 rounded-none flex gap-3 text-orange-900 border-l-[6px] shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
               <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
               <div>
                  <p className="font-bold mb-1 text-base uppercase text-red-600">BẮT BUỘC: Cập nhật lại mã nguồn App Script</p>
                  <p className="mb-2">Mã mới đã bổ sung nhận diện <strong>Bảng Định Mức công việc</strong> và <strong>Nhật ký công việc</strong> từ Google Sheet.</p>
                  <ul className="list-decimal pl-5 space-y-1 mb-2">
                     <li>Copy toàn bộ mã trong ô màu đen bên dưới.</li>
                     <li>Dán đè vào <a href="https://script.google.com" target="_blank" rel="noreferrer" className="underline font-bold text-blue-700">Google Apps Script</a> của bạn. Bấm nút Lưu (💾).</li>
                     <li><strong>CẤP QUYỀN LƯU ẢNH:</strong> Trên thanh công cụ, chọn hàm <strong>setup</strong> thay vì doPost. Bấm nút <strong>Run (Chạy)</strong>. Cửa sổ yêu cầu quyền hiện ra: Chọn <strong>Review permissions</strong> {'->'} <strong>Advanced</strong> {'->'} <strong>Go to Project (unsafe)</strong> {'->'} <strong>Allow</strong>.</li>
                     <li>Bấm <strong>Deploy {'->'} Manage deployments</strong>. Bấm nút chỉnh sửa (Cây bút), chọn <strong>New version</strong> và bấm Deploy.</li>
                  </ul>
               </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-mono opacity-50 uppercase font-bold">1. Chép URL App Script Mới cập nhật vào đây (bắt buộc tải lại dữ liệu)</label>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                className="w-full bg-[#E4E3E0] bg-opacity-30 border border-[#141414] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414] font-mono"
              />
            </div>



            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
               <button 
                  onClick={handleSaveAndSync}
                  disabled={syncing}
                  className="bg-[#141414] text-[#E4E3E0] px-6 py-3 uppercase font-bold tracking-widest hover:invert transition-all flex items-center gap-2 text-sm disabled:opacity-50"
               >
                  <DownloadCloud className="w-4 h-4" />
                  {syncing ? 'Đang Tải Dữ Liệu...' : 'Lưu URL & Tải Danh Sách Tổ/NV'}
               </button>
               {syncResult === 'success' && <div className="text-green-700 font-bold flex items-center bg-green-50 px-3 py-2 border border-green-200">✓ Đã tải dữ liệu Tổ & NV thành công!</div>}
               {syncResult === 'error' && <div className="text-red-700 font-bold flex items-center bg-red-50 px-3 py-2 border border-red-200">✗ Lỗi tải dữ liệu. Hãy kiểm tra URL hoặc App Script.</div>}
            </div>
            
            <div className="border border-[#141414] mt-8 bg-[#141414] text-[#E4E3E0] shadow-inner">
              <div className="flex justify-between items-center p-3 border-b border-[#E4E3E0]/20 bg-black">
                 <span className="text-[10px] font-mono uppercase opacity-50">2. Mã Code Apps Script Mới (Code.gs)</span>
                 <button onClick={handleCopy} className="text-xs font-mono flex items-center gap-1 hover:text-white transition-colors bg-white/10 px-3 py-1">
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Đã chép' : 'Sao chép mã'}
                 </button>
              </div>
              <pre className="p-4 text-[11px] font-mono overflow-auto max-h-[300px]">
                 <code>{SCRIPT_TEMPLATE}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
