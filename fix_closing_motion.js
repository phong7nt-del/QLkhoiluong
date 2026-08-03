import fs from 'fs';

let code = fs.readFileSync('src/components/WarehouseTab.tsx', 'utf-8');

// The original block ended like this:
//                    </div>
//                 </div>
//              ))}

// Let's replace the last `</div>` of the map return block
const regex = /                   <\/div>\n                 <\/div>\n              \)\)\}/g;
code = code.replace(regex, "                   </div>\n                 </motion.div>\n              )}");

fs.writeFileSync('src/components/WarehouseTab.tsx', code);
