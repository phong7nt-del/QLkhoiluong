const fs = require('fs');
let content = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

// The search input ends with:
// className="w-full md:w-64 pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800"
// />
// </div>
// </div>

// We need to add one more </div> to close the bg-slate-50 div.

content = content.replace(
    /<div className="overflow-x-auto">/,
    `</div>\n        <div className="overflow-x-auto">`
);

fs.writeFileSync('src/components/DcuTab.tsx', content, 'utf8');
