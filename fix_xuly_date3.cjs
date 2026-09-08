const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

code = code.replace(/setFormData\(\{...nextItem, thoiGianXl: formData\.thoiGianXl \|\| defaultThoiGian\}\);/g, `setFormData({...nextItem, thoiGianXl: formData.thoiGianXl ?? ''});`);

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
