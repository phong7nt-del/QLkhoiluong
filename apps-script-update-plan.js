// THÊM ĐOẠN NÀY VÀO `doPost(e)` TRONG GOOGLE APPS SCRIPT
    if (action === "update_plan_month") {
      try {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Định mức") || SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DinhMuc") || SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Định Mức");
        
        if (!sheet) {
           return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Không tìm thấy sheet Định mức" })).setMimeType(ContentService.MimeType.JSON);
        }
        
        var requestData;
        try {
            requestData = JSON.parse(e.postData.contents);
        } catch(ex) {
            // Trường hợp user đặt biến là data hoặc payload
            if (typeof data !== "undefined") requestData = data;
            else if (typeof payload !== "undefined") requestData = payload;
        }
        
        var monthYear = requestData.monthYear;
        var items = requestData.items;
        
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
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() + " (Line " + (err.lineNumber || "unknown") + ")" })).setMimeType(ContentService.MimeType.JSON);
      }
    }
