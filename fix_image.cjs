const fs = require('fs');

let content = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

const helperStr = `
const getDriveImageUrl = (url: string) => {
    if (!url) return '';
    try {
        if (url.includes('drive.google.com/uc?id=')) {
            const id = url.split('id=')[1]?.split('&')[0];
            if (id) return \`https://drive.google.com/thumbnail?id=\${id}&sz=w1200\`;
        }
        if (url.includes('drive.google.com/file/d/')) {
            const id = url.split('/d/')[1]?.split('/')[0];
            if (id) return \`https://drive.google.com/thumbnail?id=\${id}&sz=w1200\`;
        }
    } catch(e) {}
    return url;
};
`;

content = content.replace("export default function DcuTab() {", helperStr + "\nexport default function DcuTab() {");

// Replace {imagePreview} usage
content = content.replace(
    /<img src=\{imagePreview\} alt="Preview" className="w-full h-full object-cover" \/>/g,
    '<img src={getDriveImageUrl(imagePreview)} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />'
);

// Replace viewImage modal
content = content.replace(
    /src=\{viewImage\}/g,
    'src={getDriveImageUrl(viewImage)} referrerPolicy="no-referrer"'
);

// Replace row.hinhAnh in table
content = content.replace(
    /<img src=\{row\.hinhAnh\} alt="DCU" className="w-full h-full object-cover" \/>/g,
    '<img src={getDriveImageUrl(row.hinhAnh)} alt="DCU" className="w-full h-full object-cover" referrerPolicy="no-referrer" />'
);

fs.writeFileSync('src/components/DcuTab.tsx', content, 'utf8');
console.log('Fixed DcuTab.tsx image preview');

let config = fs.readFileSync('src/components/ConfigModal.tsx', 'utf8');
config = config.replace(
    /url: "https:\/\/drive\.google\.com\/uc\?id=" \+ file\.getId\(\)/g,
    'url: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1200"'
);
config = config.replace(/2026\.09\.15/g, '2026.09.16');
fs.writeFileSync('src/components/ConfigModal.tsx', config, 'utf8');
console.log('Fixed ConfigModal.tsx URL format');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(/2026\.09\.15/g, '2026.09.16');
fs.writeFileSync('src/App.tsx', appContent, 'utf8');

let loginContent = fs.readFileSync('src/components/Login.tsx', 'utf8');
loginContent = loginContent.replace(/2026\.09\.15/g, '2026.09.16');
fs.writeFileSync('src/components/Login.tsx', loginContent, 'utf8');
