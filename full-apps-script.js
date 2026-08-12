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
          members.push({ team: assignTeam, name: name });
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
            var h = rawH.normalize('NFD').replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/s+/g, ' ');
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
             if (rowName.replace(/s+/g, '') === nameToChange.replace(/s+/g, '')) {
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
      
      var dateColIndex = -1;
      for (var i = 0; i < headers.length; i++) {
         var h = headers[i];
         var cellDateStr = '';
         if (Object.prototype.toString.call(h) === '[object Date]') {
            cellDateStr = Utilities.formatDate(h, Session.getScriptTimeZone(), "dd/MM/yyyy");
         } else {
            cellDateStr = String(h).trim();
         }
         
         if (cellDateStr === targetDateStr || cellDateStr === targetDateStrAlt || cellDateStr === data.date) {
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
           var newVal = currentVal ? currentVal + "\n- " + data.content : "- " + data.content;
           cell.setValue(newVal);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
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
          var h = rawH.normalize('NFD').replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/s+/g, ' ');
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
          var h = rawH.normalize('NFD').replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[s_]+/g, '');
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
          var h = rawH.normalize('NFD').replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[s_]+/g, '');
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
