const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

// Revert the form inputs and logic back to defaulting to defaultThoiGian
code = code.replace(/setFormData\(\{...nextItem, thoiGianXl: formData\.thoiGianXl \?\? ''\}\);/g, `setFormData({...nextItem, thoiGianXl: formData.thoiGianXl || defaultThoiGian});`);
code = code.replace(/thoiGianXl: formData\.thoiGianXl !== undefined \? formData\.thoiGianXl : defaultThoiGian,/g, `thoiGianXl: formData.thoiGianXl || defaultThoiGian,`);
code = code.replace(/value=\{formData\.thoiGianXl \?\? ''\}/g, `value={formData.thoiGianXl || defaultThoiGian}`);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
