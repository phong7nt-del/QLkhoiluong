const fs = require('fs');

let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

const oldCode = `        try {
            const res = await DataStore.updateXuLyDoXaToSheet(entry) as any;
            if (res && res.ok !== undefined) {
                ok = res.ok;
                errMsg = res.message || "";
            } else {
                // Backward compatibility if it returns boolean
                ok = !!res;
                if (!ok) errMsg = "Unknown error (returned false)";
            }
        } catch (err: any) {
            ok = false;
            errMsg = err.message || String(err);
        }`;

const newCode = `        try {
            const res = await DataStore.updateXuLyDoXaToSheet(entry) as any;
            if (res && res.ok !== undefined) {
                ok = res.ok;
                if (res.message === 'html_response') {
                    errMsg = "Mã App Script chưa được cập nhật phiên bản mới nhất! Hãy vào Cài đặt -> Copy mã mới -> Dán vào App Script và bấm [Deploy -> New version].";
                } else if (res.message && res.message.includes("Unknown name")) {
                    errMsg = "Lỗi tiêu đề cột trên Google Sheet không khớp. Vui lòng kiểm tra lại.";
                } else {
                    errMsg = res.message || "";
                }
            } else {
                // Backward compatibility if it returns boolean
                ok = !!res;
                if (!ok) errMsg = "Lỗi không xác định từ máy chủ.";
            }
        } catch (err: any) {
            ok = false;
            errMsg = err.message || String(err);
        }`;

if (code.includes(oldCode)) {
    code = code.replace(oldCode, newCode);
    fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
    console.log("Updated XuLyDoXaView.tsx");
} else {
    console.log("Could not find old code in XuLyDoXaView.tsx");
}
