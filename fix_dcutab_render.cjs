const fs = require('fs');
let content = fs.readFileSync('src/components/DisconnectRateTab.tsx', 'utf8');

const strToFind = `         {!loading && !error && subTab === 'xuly' && (
            <XuLyDoXaView xuLyList={xuLyList} refreshData={fetchXuLyData} setXuLyList={setXuLyList} />
         )}`;

const strToReplace = `         {!loading && !error && subTab === 'xuly' && (
            <XuLyDoXaView xuLyList={xuLyList} refreshData={fetchXuLyData} setXuLyList={setXuLyList} />
         )}

         {!loading && !error && subTab === 'dcu' && (
            <DcuTab />
         )}`;

content = content.replace(strToFind, strToReplace);
fs.writeFileSync('src/components/DisconnectRateTab.tsx', content, 'utf8');
console.log("Fixed rendering of DcuTab");
