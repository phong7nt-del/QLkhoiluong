const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf-8');

code = code.replace(/https:\/\/docs\.google\.com\/spreadsheets\/d\/[^\/]+\/gviz\/tq\?tqx=out:csv&sheet=\$\{encodeURIComponent\(([^}]+)\)\}(&_t=\$\{new Date\(\)\.getTime\(\)\})?/g, '/api/proxy/gviz?sheet=${encodeURIComponent($1)}');

code = code.replace(/https:\/\/docs\.google\.com\/spreadsheets\/d\/[^\/]+\/gviz\/tq\?tqx=out:csv&sheet=\$\{encodeURIComponent\('([^']+)'\)\}(&_t=\$\{new Date\(\)\.getTime\(\)\})?/g, '/api/proxy/gviz?sheet=${encodeURIComponent(\'$1\')}');

code = code.replace(/https:\/\/docs\.google\.com\/spreadsheets\/d\/[^\/]+\/gviz\/tq\?tqx=out:csv&sheet=\$\{encodeURIComponent\("([^"]+)"\)\}(&_t=\$\{new Date\(\)\.getTime\(\)\})?/g, '/api/proxy/gviz?sheet=${encodeURIComponent("$1")}');

fs.writeFileSync('src/store/DataStore.ts', code);
console.log('Fixed gviz urls in DataStore.ts');
