import fs from 'fs';
let code = fs.readFileSync('src/store/DataStore.ts', 'utf-8');

code = code.replace(
`         const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
         });
         const resData = await response.json();
         return resData && resData.status === 'success';`,
`         await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
         });
         return true;`
);

fs.writeFileSync('src/store/DataStore.ts', code);
