import fs from 'fs';

let code = fs.readFileSync('src/components/WarehouseTab.tsx', 'utf-8');

if (!code.includes("import { motion }")) {
   code = code.replace("import React", "import { motion } from 'motion/react';\nimport React");
   
   // Replace `<div\n                   key={zone.id}` with `<motion.div\n                   key={zone.id}`
   code = code.replace(/<div\n                   key=\{zone\.id\}/g, "<motion.div\n                   layoutId={zone.id}\n                   initial={{ opacity: 0, scale: 0.8 }}\n                   animate={{ opacity: 1, scale: 1 }}\n                   whileHover={{ scale: isEditMode ? 1.02 : 1.05 }}\n                   transition={{ type: 'spring', stiffness: 300, damping: 20 }}\n                   key={zone.id}");
   
   // Replace `</div>\n              )})}` with `</motion.div>\n              )})}`
   code = code.replace(/<\/div>\n              \)\)\}\}/g, "</motion.div>\n              )})}");
   
   // Replace the specific one inside the map
   code = code.replace(/<\/div>\n              \)\)\}/g, "</motion.div>\n              )}");
}

fs.writeFileSync('src/components/WarehouseTab.tsx', code);
