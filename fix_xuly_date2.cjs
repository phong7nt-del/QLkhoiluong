const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

// The line `setFormData({...nextItem, thoiGianXl: formData.thoiGianXl !== undefined ? formData.thoiGianXl : defaultThoiGian});`
code = code.replace(/setFormData\(\{...nextItem, thoiGianXl: formData\.thoiGianXl !== undefined \? formData\.thoiGianXl : defaultThoiGian\}\);/, `setFormData({...nextItem, thoiGianXl: formData.thoiGianXl ?? ''});`);

// The "Hủy cập nhật" button:
// setFormData({ loaiXl: 'Trạm', nguoiXl: currentUserName, thoiGianXl: defaultThoiGian, maDd: '', cachXl: '', ketQua: 'Xong', ghiChu: '' })
// We keep defaultThoiGian here so it goes back to today when cancelling.

fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
