const fs = require('fs');
let code = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');
code = code.replace(/import \{ Camera, MapPin, Search/g, "import { Fingerprint, Map, Navigation, FileText, Camera, MapPin, Search");
fs.writeFileSync('src/components/DcuTab.tsx', code, 'utf8');
