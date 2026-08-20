const fs = require('fs');

let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

const oldCode = `    } else {
        ok = await DataStore.syncXuLyDoXaToSheet(entry);
    }`;

const newCode = `    } else {
        const res = await DataStore.syncXuLyDoXaToSheet(entry) as any;
        if (res && res.ok !== undefined) {
            ok = res.ok;
            if (res.message === 'html_response' || (res.message && res.message.includes('Unknown action'))) {
                errMsg = "Mã App Script chưa được cập nhật phiên bản mới nhất! Hãy vào Cài đặt -> Copy mã mới -> Dán vào App Script và bấm [Deploy -> New version].";
            } else {
                errMsg = res.message || "";
            }
        } else {
            ok = !!res;
            if (!ok) errMsg = "Lỗi không xác định từ máy chủ.";
        }
    }`;

if (code.includes(oldCode)) {
    code = code.replace(oldCode, newCode);
    console.log("Updated XuLyDoXaView ADD logic");
}

const oldBulk = `              const ok = await DataStore.syncXuLyDoXaBulkToSheet(formattedData);
              setIsImporting(false);
              if (ok) {
                  alert("Đã import " + formattedData.length + " dòng thành công!");`;

const newBulk = `              const res = await DataStore.syncXuLyDoXaBulkToSheet(formattedData) as any;
              setIsImporting(false);
              let ok = false;
              let errMsg = "";
              if (res && res.ok !== undefined) {
                  ok = res.ok;
                  if (res.message === 'html_response' || (res.message && res.message.includes('Unknown action'))) {
                      errMsg = "Mã App Script chưa được cập nhật phiên bản mới nhất! Hãy vào Cài đặt -> Copy mã mới -> Dán vào App Script và bấm [Deploy -> New version].";
                  } else {
                      errMsg = res.message || "";
                  }
              } else {
                  ok = !!res;
              }
              if (ok) {
                  alert("Đã import " + formattedData.length + " dòng thành công!");`;

if (code.includes(oldBulk)) {
    code = code.replace(oldBulk, newBulk);
    console.log("Updated XuLyDoXaView BULK logic");
}

const oldBulkError = `              } else {
                  alert("Có lỗi khi import Excel!");
              }`;
const newBulkError = `              } else {
                  alert("Có lỗi khi import Excel! " + (errMsg || ""));
              }`;

if (code.includes(oldBulkError)) {
    code = code.replace(oldBulkError, newBulkError);
    console.log("Updated XuLyDoXaView BULK Error message");
}

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');

