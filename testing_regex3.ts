export function convertVietnameseNumbers(text: string): string {
    const numbers: {[key: string]: number} = {
        'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'năm': 5, 'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9, 'mười': 10,
        'mười một': 11, 'mười hai': 12, 'mười ba': 13, 'mười bốn': 14, 'mười năm': 15, 'mười lăm': 16,
        'mười sáu': 16, 'mười bảy': 17, 'mười tám': 18, 'mười chín': 19, 'hai mươi': 20,
        'rưỡi': 0.5, 'nửa': 0.5
    };
    
    // Convert e.g., "một phẩy năm" -> "1.5"
    let result = text;
    
    // First pass for decimals like "hai phẩy lăm", "ba chấm năm"
    
    // We can just simple replace for common single numbers
    Object.keys(numbers).sort((a,b)=>b.length-a.length).forEach(k => {
        const regex = new RegExp(`\\b${k}\\b`, 'gi');
        result = result.replace(regex, numbers[k].toString());
    });
    
    return result;
}
console.log(convertVietnameseNumbers("kiểm tra hai và bình sữa ba phẩy rưỡi"));
