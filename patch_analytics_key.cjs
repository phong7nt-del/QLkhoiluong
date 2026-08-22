const fs = require('fs');
let code = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

const target = `        let key = e.content;
        if (gId === 0) {
            key = e.id; // unique for independent tasks
        }`;

const replacement = `        let key = gId > 0 ? gId.toString() : e.id;`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/components/Analytics.tsx', code, 'utf8');
    console.log("Success: patched Analytics grouping key");
} else {
    console.log("Failed: could not find target in Analytics");
}
