const dinhMucList = [
  { name: "kiểm tra", quota: 1 },
  { name: "bình sữa", quota: 1 }
];

let remainingChunk = "kiểm tra 2 bình sữa 3";
let foundAny = true;
let loopCount = 0;
const matchedTasksInChunk = new Set<string>();
const newSelectedTasks = {};

while (foundAny && remainingChunk.trim().length > 2 && loopCount < 10) {
    foundAny = false;
    loopCount++;
    let bestTask = null;
    let maxMatchScore = 0;
    let bestMatchWords = [];
    
    dinhMucList.forEach(dm => {
        if (matchedTasksInChunk.has(dm.name)) return;
        const words = dm.name.split(/\s+/);
        let matches = 0;
        let matchedWords = [];
        words.forEach(w => {
            if (remainingChunk.includes(w)) {
                matches++;
                matchedWords.push(w);
            }
        });
        const score = matches / words.length;
        const finalScore = score * words.length; 
        if (score >= 0.5 && finalScore > maxMatchScore) {
            maxMatchScore = finalScore;
            bestTask = dm;
            bestMatchWords = matchedWords;
        }
    });
    
    if (bestTask) {
        foundAny = true;
        matchedTasksInChunk.add(bestTask.name);
        
        const escapedWords = bestMatchWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        let regexStr = escapedWords.join('.*?');
        const followMatch = remainingChunk.match(new RegExp(regexStr + '.{0,20}?(\\d+([.,]\\d+)?)', 'i'));
        
        let qty = bestTask.quota || 1;
        if (followMatch && followMatch[1]) {
            qty = parseFloat(followMatch[1].replace(',', '.'));
        }
        
        newSelectedTasks[bestTask.name] = qty;
        bestMatchWords.forEach((w: string) => {
            remainingChunk = remainingChunk.replace(new RegExp(w, 'i'), ' ');
        });
    }
}
console.log(newSelectedTasks);
