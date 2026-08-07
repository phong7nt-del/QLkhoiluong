import fs from 'fs';
let code = fs.readFileSync('src/store/DataStore.ts', 'utf-8');

code = code.replace(
  "     } catch (e) {\n         return false;\n     }",
  "     } catch (e) {\n         console.error('syncPlanToSheet error:', e);\n         return false;\n     }"
);

fs.writeFileSync('src/store/DataStore.ts', code);
