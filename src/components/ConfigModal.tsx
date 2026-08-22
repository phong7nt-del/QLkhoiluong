import React, { useState } from 'react';
import { DataStore } from '../store/DataStore';
import { Copy, Check, DownloadCloud, AlertTriangle, X } from 'lucide-react';

const SCRIPT_TEMPLATE = `// VERSION: 2026.08.16
// XÓA TẤT CẢ MÃ CŨ (XÓA function myFunction() { ... })
// CHỈ DÁN ĐOẠN MÃ DƯỚI ĐÂY VÀO:
var SPREADSHEET_ID = '1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ';

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
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var sheet = getSheetFlexibly(ss, ['CongTac', 'Cong Tac', 'Công tác', 'Công Tác', 'Con Tác']);
      if (!sheet) return ContentService.createTextOutput(JSON.stringify({ spreadsheetId: SPREADSHEET_ID, error: "Not found sheet CongTac"})).setMimeType(ContentService.MimeType.JSON);
      var data = sheet.getDataRange().getValues();
      
      var nameIdx = -1;
      var teamIdx = -1;
      var startRow = 1;

      for (var r = 0; r < 5 && r < data.length; r++) {
        for (var c = 0; c < data[r].length; c++) {
          var val = String(data[r][c]).toLowerCase().trim();
          if (val.includes('họ và tên') || val === 'họ tên') nameIdx = c;
          if (val.includes('khu vực') || val === 'khu vuc' || val.includes('tổ công tác') || val.includes('bộ phận công tác')) teamIdx = c;
        }
        if (nameIdx !== -1 && teamIdx !== -1) {
          startRow = r + 1;
          break;
        }
      }
      
      if (nameIdx === -1) { nameIdx = 1; startRow = 2; }
      if (teamIdx === -1) { teamIdx = 2; }
      
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
        members.push({ team: assignTeam, name: name, msnv: msnv, role: role });
          memberTeamMap[name] = assignTeam;
        }
      }
      
      var workloads = [];
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
        var headers = dmData[0] || [];
        var nameCol = -1;
        var quotaCol = -1;
        for (var j = 0; j < headers.length; j++) {
           var h = String(headers[j]).toLowerCase();
           if (h.indexOf('nội dung') > -1 || h.indexOf('danh mục') > -1 || h.indexOf('tên') > -1) {
               if (nameCol === -1) nameCol = j;
           }
           if (h.indexOf('định mức') > -1 || h.indexOf('khối lượng') > -1 || h.indexOf('chỉ tiêu') > -1) {
               quotaCol = j;
           }
        }
        if (nameCol === -1) nameCol = 0;
        if (quotaCol === -1 && dmData[0].length > 1) quotaCol = 1;
        
        for (var d = 1; d < dmData.length; d++) {
           var val1 = String(dmData[d][nameCol] || '').trim();
           var val2 = quotaCol > -1 ? Number(dmData[d][quotaCol]) : 0;
           if (isNaN(val2)) val2 = 0;
           
           if (val1 && val1.toLowerCase() !== 'stt') {
              dinhMucList.push({ name: val1, quota: val2 });
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

function doPost(e) {
  try {
    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: "Invalid JSON format" })).setMimeType(ContentService.MimeType.JSON);
    }

    var action = payload.action;
    if (action === 'savePlan') {
       var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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
       var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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
       var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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
       var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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
       if (action === 'update_tuti' && data.maTram && data.tenDiemDo) {
          for (var r = 1; r < sheetData.length; r++) {
             if (hm.maTramCol !== undefined && hm.tenDiemDoCol !== undefined &&
                 String(sheetData[r][hm.maTramCol]).trim() === String(data.maTram).trim() &&
                 String(sheetData[r][hm.tenDiemDoCol]).trim() === String(data.tenDiemDo).trim()) {
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

    if (action === 'update_sangtai') {
       var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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

    if (action === 'add_xulydoxa') {
       var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
       var sheet = getSheetFlexibly(ss, ['XuLyDoXa', 'Xu Ly Do Xa', 'Xử lý đo xa']);
       if (!sheet) {
           sheet = ss.insertSheet('XuLyDoXa');
           sheet.appendRow(['STT', 'Loại XL', 'Người XL', 'Thời gian XL', 'Mã DD', 'Cách XL', 'Kết quả', 'Ghi chú']);
       }
       var data = payload.data;
       var lastRow = sheet.getLastRow();
       var nextStt = lastRow;
       
       sheet.appendRow([
          nextStt,
          data.loaiXl || '',
          data.nguoiXl || '',
          data.thoiGianXl || '',
          data.maDd || '',
          data.cachXl || '',
          data.ketQua || '',
          data.ghiChu || ''
       ]);
       
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }


    if (action === 'add_xulydoxa_bulk') {
       var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
       var sheet = getSheetFlexibly(ss, ['XuLyDoXa', 'Xu Ly Do Xa', 'Xử lý đo xa']);
       if (!sheet) {
           sheet = ss.insertSheet('XuLyDoXa');
           sheet.appendRow(['STT', 'Loại XL', 'Người XL', 'Thời gian XL', 'Mã DD', 'Cách XL', 'Kết quả', 'Ghi chú']);
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
             d.cachXl || '',
             d.ketQua || '',
             d.ghiChu || ''
          ]);
       }
       
       if (rows.length > 0) {
          sheet.getRange(lastRow + 1, 1, rows.length, 8).setValues(rows);
       }
       
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'update_xulydoxa') {
       var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
       var sheet = getSheetFlexibly(ss, ['XuLyDoXa', 'Xu Ly Do Xa', 'Xử lý đo xa']);
       if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Sheet not found'})).setMimeType(ContentService.MimeType.JSON);
       
       var data = payload.data;
       var sheetDataDisplay = sheet.getDataRange().getDisplayValues(); // Get as string
       
       var loaiXlCol = -1, nguoiXlCol = -1, thoiGianXlCol = -1, maDdCol = -1, cachXlCol = -1, ketQuaCol = -1, ghiChuCol = -1;
       var headerRowIdx = 0;
       
       function normalizeHeader(raw) {
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
           var tempMaDdCol = -1, tempThoiGianCol = -1;
           for (var c = 0; c < tempHeaders.length; c++) {
               var h = normalizeHeader(tempHeaders[c]);
               if (h === 'madd') tempMaDdCol = c;
               else if (h === 'thoigianxl') tempThoiGianCol = c;
           }
           if (tempMaDdCol > -1) {
               headerRowIdx = rIdx;
               break;
           }
       }
       
       var headers = sheetDataDisplay[headerRowIdx] || [];
       for (var c = 0; c < headers.length; c++) {
           var h = normalizeHeader(headers[c]);
           if (h === 'loaixl') loaiXlCol = c;
           else if (h === 'nguoixl') nguoiXlCol = c;
           else if (h === 'thoigianxl') thoiGianXlCol = c;
           else if (h === 'madd') maDdCol = c;
           else if (h === 'cachxl') cachXlCol = c;
           else if (h === 'ketqua') ketQuaCol = c;
           else if (h === 'ghichu') ghiChuCol = c;
       }
       
       function normalizeDateStr(dStr) {
           if (!dStr) return '';
           var s = String(dStr).trim().split(' ')[0];
           if (s.indexOf('T') !== -1) s = s.split('T')[0];
           var parts = s.indexOf('-') !== -1 ? s.split('-') : s.split('/');
           if (parts.length >= 3) {
               var d, m, y;
               if (parts[0].length === 4) { y = parts[0]; m = parts[1]; d = parts[2]; } 
               else { d = parts[0]; m = parts[1]; y = parts[2]; }
               d = parseInt(d, 10); m = parseInt(m, 10);
               if (m > 12 && d <= 12) { var tmp = m; m = d; d = tmp; }
               return (d < 10 ? '0'+d : ''+d) + '/' + (m < 10 ? '0'+m : ''+m) + '/' + y;
           }
           return s;
       }
       
       var inputDateStr = normalizeDateStr(data.thoiGianXl);
       var inputMaDd = String(data.maDd).trim().toLowerCase();
       
       if (maDdCol > -1 && thoiGianXlCol > -1 && data.maDd) {
          var seenDates = [];
          for (var r = headerRowIdx + 1; r < sheetDataDisplay.length; r++) {
              var rMaDd = String(sheetDataDisplay[r][maDdCol]).trim().toLowerCase();
              var rawDate = String(sheetDataDisplay[r][thoiGianXlCol]);
              var rDateStr = normalizeDateStr(rawDate);
              
              if (rMaDd === inputMaDd) {
                  seenDates.push(rawDate + " => " + rDateStr);
              }
              
              if (rMaDd === inputMaDd && rDateStr === inputDateStr) {
                  // Found! Update values
                  if (loaiXlCol > -1 && data.loaiXl !== undefined) sheet.getRange(r + 1, loaiXlCol + 1).setValue(data.loaiXl);
                  if (nguoiXlCol > -1 && data.nguoiXl !== undefined) sheet.getRange(r + 1, nguoiXlCol + 1).setValue(data.nguoiXl);
                  if (cachXlCol > -1 && data.cachXl !== undefined) sheet.getRange(r + 1, cachXlCol + 1).setValue(data.cachXl);
                  if (ketQuaCol > -1 && data.ketQua !== undefined) sheet.getRange(r + 1, ketQuaCol + 1).setValue(data.ketQua);
                  if (ghiChuCol > -1 && data.ghiChu !== undefined) sheet.getRange(r + 1, ghiChuCol + 1).setValue(data.ghiChu);
                  
                  return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
              }
          }
          if (seenDates.length > 0) {
             return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Mã ĐĐ có tồn tại, nhưng sai ngày. Của bạn gửi: ' + inputDateStr + '. Trên sheet là: ' + seenDates.join(', ') })).setMimeType(ContentService.MimeType.JSON);
          }
       }
       if (maDdCol === -1 || thoiGianXlCol === -1) {
           return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Lỗi cấu trúc Sheet: maDdCol=' + maDdCol + ', thoiGianCol=' + thoiGianXlCol + '. Các cột tìm thấy: ' + headers.join(', ') })).setMimeType(ContentService.MimeType.JSON);
       }
       return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Không tìm thấy mã ĐĐ: ' + inputMaDd + ' trong ' + (sheetDataDisplay.length - headerRowIdx - 1) + ' dòng (bỏ qua ' + headerRowIdx + ' dòng đầu).' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'update_sangtai_bulk') {

       var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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
          <h2 className="font-serif italic text-2xl mb-6 pr-12">
             Cấu hình Hệ Thống & Google Scripts
          </h2>
          
          <div className="space-y-6 text-sm font-sans">
            <div className="bg-[#FFF4E5] border border-orange-400 p-4 rounded-none flex gap-3 text-orange-900 border-l-[6px] shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
               <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
               <div>
                  <p className="font-bold mb-1 text-base uppercase text-red-600">BẮT BUỘC: Cập nhật lại mã nguồn App Script</p>
                  <p className="mb-2">Mã mới đã bổ sung nhận diện <strong>Bảng Định Mức công việc</strong> và <strong>Nhật ký công việc</strong> từ Google Sheet.</p>
                  <ul className="list-decimal pl-5 space-y-1 mb-2">
                     <li>Đảm bảo bạn đã có Sheet <strong>DinhMuc</strong> (Cột A: Tên định mức/nội dung).</li>
                     <li>Copy toàn bộ mã trong ô màu đen bên dưới.</li>
                     <li>Dán đè vào <a href="https://script.google.com" target="_blank" rel="noreferrer" className="underline font-bold text-blue-700">Google Apps Script</a> của bạn.</li>
                     <li>Bấm <strong>Deploy {'->'} New deployment</strong>. (Không được chọn Manage Deployments bản cũ)</li>
                     <li>Sao chép Web App URL <strong>MỚI NHẤT</strong> và dán vào ô bên dưới rồi TẢI LẠI DỮ LIỆU.</li>
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
