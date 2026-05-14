const bestMatchWords = ["thay", "bảo", "trì", "1", "pha"];
const remainingChunk = "thay bảo trì 1 pha 3";
const escapedWords = bestMatchWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
let regexStr = escapedWords.join('.*?');
console.log("Regex", regexStr);
const followMatch = remainingChunk.match(new RegExp(regexStr + '.{0,20}?(\\d+([.,]\\d+)?)', 'i'));
console.log("Follow match", followMatch && followMatch[1]);
