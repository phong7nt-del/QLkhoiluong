const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const target = `               }
               json.workloads = newWorkloads;
            } catch (e) {
               console.error('Error parsing CongTac for Workloads', e);
            }`;

const replacement = `               }
               
               // Post-processing: Ensure any report with only 1 member has ID 0
               newWorkloads.forEach(w => {
                   if (w.members.length === 1) {
                       const lines = w.content.split('\\n');
                       const lastLine = lines[lines.length - 1].trim();
                       if (/^\\d+$/.test(lastLine)) {
                           const gId = parseInt(lastLine, 10);
                           if (gId !== 0) {
                               lines[lines.length - 1] = '0';
                               w.content = lines.join('\\n');
                           }
                       }
                   }
               });

               json.workloads = newWorkloads;
            } catch (e) {
               console.error('Error parsing CongTac for Workloads', e);
            }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    console.log("Successfully added 1-person ID=0 fallback in DataStore.ts");
} else {
    console.log("Could not find insertion point in DataStore.ts");
}

fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
