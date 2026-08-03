import fs from 'fs';

let code = fs.readFileSync('src/components/WarehouseTab.tsx', 'utf-8');

code = code.replace("                 </div>\n              )})}", "                 </motion.div>\n              )})}");

fs.writeFileSync('src/components/WarehouseTab.tsx', code);
