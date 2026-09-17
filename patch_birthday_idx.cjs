const fs = require('fs');
let code = fs.readFileSync('src/components/BirthdayTab.tsx', 'utf8');

code = code.replace(/Header từ Sheet: \{localStorage\.getItem\('HEADER_DEBUG'\)\}/, `Header từ Sheet: {localStorage.getItem('HEADER_DEBUG')}
             <br/>
             Idx Debug: {localStorage.getItem('IDX_DEBUG')}`);

fs.writeFileSync('src/components/BirthdayTab.tsx', code);
