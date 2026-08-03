// BẠN VUI LÒNG BỔ SUNG ĐOẠN CODE SAU VÀO TRONG HÀM `doPost(e)` CỦA GOOGLE APPS SCRIPT ĐỂ XỬ LÝ LƯU KHO VÀ VTTB
function doPost(e) {
  // Các code hiện tại của bạn ...
  
  if (e.postData.type === "application/json" || e.postData.type === "text/plain") {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    
    // ======== THÊM ĐOẠN NÀY ĐỂ XỬ LÝ LƯU SƠ ĐỒ KHO ========
    if (action === "update_kho") {
      try {
        var sheetName = "Kho";
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
           sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
        }
        
        // Thiết lập tiêu đề (Header) cho Sheet Kho
        var headers = ["id", "type", "code", "x", "y", "width", "height", "categories"];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
        
        // Xóa dữ liệu cũ
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
            sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
        }
        
        // Cập nhật dữ liệu mới
        var rows = payload.data;
        if (rows && rows.length > 0) {
           var dataValues = rows.map(function(r) {
              return [r.id || "", r.type || "", r.code || "", r.x || 0, r.y || 0, r.width || 0, r.height || 0, r.categories || ""];
           });
           sheet.getRange(2, 1, dataValues.length, headers.length).setValues(dataValues);
        }
        
        return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // ======== THÊM ĐOẠN NÀY ĐỂ XỬ LÝ LƯU DỮ LIỆU VTTB ========
    if (action === "update_vttb") {
      try {
        var sheetName = "VTTB";
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
           sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
        }
        
        // Thiết lập tiêu đề (Header) cho Sheet VTTB
        var headers = ["Mã VTTB", "Tên VTTB", "Chủng loại", "Số lượng", "Số No", "Tình trạng"];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
        
        // Xóa dữ liệu cũ
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
            sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
        }
        
        // Cập nhật dữ liệu mới
        var rows = payload.data;
        if (rows && rows.length > 0) {
           var dataValues = rows.map(function(r) {
              return [
                 r['mã vttb'] || r['Mã VTTB'] || r['Mã'] || "", 
                 r['tên vttb'] || r['Tên VTTB'] || r['Tên'] || "", 
                 r['chủng loại'] || r['Chủng loại'] || "", 
                 r['số lượng'] || r['Số lượng'] || r['Số Lượng'] || 1, 
                 r['số no'] || r['Số No'] || r['Số NO'] || "", 
                 r['tình trạng'] || r['Tình trạng'] || r['Tình Trạng'] || ""
              ];
           });
           sheet.getRange(2, 1, dataValues.length, headers.length).setValues(dataValues);
        }
        
        return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    // ======== KẾT THÚC ĐOẠN THÊM MỚI ========
  }
}
