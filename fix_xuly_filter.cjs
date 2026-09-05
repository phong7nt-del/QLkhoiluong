const fs = require('fs');
let code = fs.readFileSync('src/components/XuLyDoXaView.tsx', 'utf8');

const oldStart = "const sortedAndFiltered = useMemo(() => {";
const oldEnd = "}, [xuLyList, sortField, sortDir, columnFilters, listMode]);";

const startIndex = code.indexOf(oldStart);
const endIndex = code.indexOf(oldEnd) + oldEnd.length;

if (startIndex > -1 && endIndex > startIndex) {
    const newFilter = `const sortedAndFiltered = useMemo(() => {
    const sessionUser = JSON.parse(localStorage.getItem('sessionUser') || '{}');
    const roleStr = String(sessionUser.role || '').toLowerCase();
    const isManagement = ['tổ trưởng', 'tổ phó', 'đội trưởng', 'đội phó', 'phó giám đốc', 'giám đốc', 'admin', 'quản trị'].some(role => roleStr.includes(role));

    const normalizeStr = (s) => {
        return String(s || '')
            .normalize('NFD')
            .replace(/[\\u0300-\\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .toLowerCase()
            .replace(/\\s+/g, '');
    };
    
    let currentUserName = normalizeStr(sessionUser.name || '');
    if (!currentUserName) {
        const emailPrefix = (sessionUser.email || '').split('@')[0];
        currentUserName = normalizeStr(emailPrefix);
    }

    let userSpecificList = xuLyList.filter(item => {
        if (!isManagement && currentUserName) {
            const assigneeName = normalizeStr(item.nguoiXl || '');
            if (!assigneeName) return false;
            if (assigneeName !== currentUserName && !assigneeName.includes(currentUserName) && !currentUserName.includes(assigneeName)) {
                return false;
            }
        }
        return true;
    });

    let result = [...userSpecificList];
    
    if (listMode === 'processed') {
        result = result.filter(item => String(item.ketQua).trim().toLowerCase() === 'xong');
    } else {
        result = result.filter(item => String(item.ketQua).trim().toLowerCase() !== 'xong');
    }

    Object.entries(columnFilters).forEach(([key, value]) => {
        if (value.trim() !== '') {
            const lower = value.toLowerCase();
            result = result.filter((item: any) => {
                const itemValue = String(item[key] || '').toLowerCase();
                return itemValue.includes(lower);
            });
        }
    });
    
    if (sortField) {
        result.sort((a, b) => {
            let aVal = String(a[sortField] || '');
            let bVal = String(b[sortField] || '');
            if (sortField === 'stt') {
                return sortDir === 'asc' ? (Number(aVal) - Number(bVal)) : (Number(bVal) - Number(aVal));
            }
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return result;
}, [xuLyList, sortField, sortDir, columnFilters, listMode]);`;

    code = code.substring(0, startIndex) + newFilter + code.substring(endIndex);
    fs.writeFileSync('src/components/XuLyDoXaView.tsx', code, 'utf8');
    console.log("Replaced XuLyDoXaView filter successfully");
} else {
    console.log("Could not find block in XuLyDoXaView.");
}

