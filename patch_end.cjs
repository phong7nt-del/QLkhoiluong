const fs = require('fs');
let code = fs.readFileSync('src/components/PlanProgressTab.tsx', 'utf8');

code = code.replace(/<\/div>\n    <\/div>\n  \);\n\}/, '</div>\n    </div>\n    </>\n  );\n}');

fs.writeFileSync('src/components/PlanProgressTab.tsx', code);
