import { readFileSync } from 'fs';
let code = readFileSync('src/store/DataStore.ts', 'utf-8');
console.log(code.match(/let history: Record<string, number> = {};[\s\S]*?if \(!isNaN/)[0]);
