const fs = require('fs');

let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

const oldCheck = `} else {
              setMessage({ type: 'error', text: "Lỗi từ server: " + JSON.stringify(res) });
          }`;
          
const newCheck = `} else if (res && res.reason === 'html_response') {
              setMessage({ type: 'error', text: "Mã App Script chưa được cập nhật phiên bản mới nhất! Hãy vào Cài đặt -> Copy mã mới -> Dán vào App Script và bấm [Deploy -> New version]." });
          } else {
              setMessage({ type: 'error', text: "Lỗi từ server: " + (res?.text || JSON.stringify(res)) });
          }`;

if (code.includes(oldCheck)) {
    code = code.replace(oldCheck, newCheck);
    fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
    console.log("Fixed delete UI handling");
} else {
    console.log("Could not find the target codeblock");
}
