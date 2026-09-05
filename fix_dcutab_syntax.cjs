const fs = require('fs');

let content = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');
content = content.replace(/^row\.stt \|\| \(\(currentPage - 1\) \* rowsPerPage \+ idx \+ 1\)/, '');
content = content.replace(
    /\{row\.stt \|\| \(idx \+ 1\)\}/,
    '{row.stt || ((currentPage - 1) * rowsPerPage + idx + 1)}'
);

fs.writeFileSync('src/components/DcuTab.tsx', content, 'utf8');
console.log('Fixed DcuTab syntax error');
