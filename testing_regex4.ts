let tasksTextLower = "kiểm tra hai rưỡi và bảo trì mười và công việc khác ba chấm năm.";
        let normalizedText = tasksTextLower
            .replace(/\b(một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\s+(rưỡi|phẩy năm|chấm năm)\b/gi, (match, p1) => {
                 const map: any = { 'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'năm': 5, 'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9, 'mười': 10 };
                 return map[p1.toLowerCase()] + '.5';
            })
            .replace(/\b(một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\b/gi, (match) => {
                 const map: any = { 'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'năm': 5, 'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9, 'mười': 10 };
                 return map[match.toLowerCase()];
            });
console.log(normalizedText);
