// BẠN VUI LÒNG BỔ SUNG ĐOẠN CODE SAU VÀO TRONG HÀM `doPost(e)` CỦA GOOGLE APPS SCRIPT ĐỂ XỬ LÝ ĐỔI MẬT KHẨU

function doPost(e) {
  // Các code hiện tại của bạn ...
  
  if (e.postData.type === "application/json" || e.postData.type === "text/plain") {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    
    // ======== THÊM ĐOẠN NÀY ĐỂ XỬ LÝ ĐỔI MẬT KHẨU ========
    if (action === "change_password") {
      try {
        var possibleNames = ["CongTac", "Cong Tac", "Công tác", "Công Tác", "Con Tác"];
        var sheetName = payload.sheetName;
        var sheet = null;
        if (sheetName) {
           sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        }
        if (!sheet) {
           for (var x = 0; x < possibleNames.length; x++) {
              sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(possibleNames[x]);
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
        
        // Tìm dòng header
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
              
              // Nếu tên trùng khớp (bỏ qua khoảng trắng, chữ hoa chữ thường)
              if (rowName.replace(/\s+/g, '') === nameToChange.replace(/\s+/g, '')) {
                 sheet.getRange(i + 1, msnvCol + 1).setValue(newPass);
                 updated = true;
              }
           }
           if (updated) {
               return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
           }
        }
        
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Không tìm thấy tài khoản" })).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    // ======== KẾT THÚC ĐOẠN THÊM MỚI ========
    
    // Code gốc xử lý add_workload, update_progress...
  }
}
