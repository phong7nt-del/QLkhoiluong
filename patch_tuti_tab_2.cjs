const fs = require('fs');
let code = fs.readFileSync('src/components/TutiTab.tsx', 'utf8');

// 1. Always update date and user on save
const oldDateLogic = `        if (finalUpdates.ketLuan && finalUpdates.ketLuan.trim() !== '') {
            const now = new Date();
            const dateStr = [
                now.getDate().toString().padStart(2, '0'),
                (now.getMonth() + 1).toString().padStart(2, '0'),
                now.getFullYear()
            ].join('/');
            finalUpdates.ngayCapNhat = dateStr;
            finalUpdates.nguoiKiemTra = sessionUser?.name || '';
        }`;
        
const newDateLogic = `        const now = new Date();
        const dateStr = [
            now.getDate().toString().padStart(2, '0'),
            (now.getMonth() + 1).toString().padStart(2, '0'),
            now.getFullYear()
        ].join('/');
        finalUpdates.ngayCapNhat = dateStr;
        finalUpdates.nguoiKiemTra = sessionUser?.name || '';`;

code = code.replace(oldDateLogic, newDateLogic);

fs.writeFileSync('src/components/TutiTab.tsx', code);
