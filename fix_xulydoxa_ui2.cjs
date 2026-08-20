const fs = require('fs');

let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

const oldCode = `                if (res.message === 'html_response') {
                    errMsg = "Mã App Script chưa được cập nhật phiên bản mới nhất! Hãy vào Cài đặt -> Copy mã mới -> Dán vào App Script và bấm [Deploy -> New version].";
                } else if (res.message && res.message.includes("Unknown name")) {
                    errMsg = "Lỗi tiêu đề cột trên Google Sheet không khớp. Vui lòng kiểm tra lại.";
                } else {
                    errMsg = res.message || "";
                }`;

const newCode = `                if (res.message === 'html_response' || (res.message && res.message.includes('Unknown action'))) {
                    errMsg = "Mã App Script chưa được cập nhật phiên bản mới nhất! Hãy vào Cài đặt -> Copy mã mới -> Dán vào App Script và bấm [Deploy -> New version].";
                } else if (res.message && res.message.includes("Unknown name")) {
                    errMsg = "Lỗi tiêu đề cột trên Google Sheet không khớp. Vui lòng kiểm tra lại.";
                } else {
                    errMsg = res.message || "";
                }`;

if (code.includes(oldCode)) {
    code = code.replace(oldCode, newCode);
    fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
    console.log("Updated XuLyDoXaView.tsx again");
} else {
    console.log("Could not find old code in XuLyDoXaView.tsx");
}
