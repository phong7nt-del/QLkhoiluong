const fs = require('fs');
let code = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

const t1 = `      const eTeamNormalized = (e.team || '').normalize('NFC').toLowerCase().replace(/\\s+/g, ' ').trim();
      const selectedTeamNormalized = selectedTeam.normalize('NFC').toLowerCase().replace(/\\s+/g, ' ').trim();

      if (selectedTeam !== 'all' && eTeamNormalized !== selectedTeamNormalized) return false;`;

const r1 = `      const selectedTeamNormalized = selectedTeam.normalize('NFC').toLowerCase().replace(/\\s+/g, ' ').trim();
      if (selectedTeam !== 'all') {
         const hasTeam = (e.team || '').split(',').some(t => t.normalize('NFC').toLowerCase().replace(/\\s+/g, ' ').trim() === selectedTeamNormalized);
         if (!hasTeam) return false;
      }`;

const t2 = `       const eTeamNormalized = (e.team || '').normalize('NFC').toLowerCase().replace(/\\s+/g, ' ').trim();
       const selectedTeamNormalized = selectedTeam.normalize('NFC').toLowerCase().replace(/\\s+/g, ' ').trim();
       
       if ((selectedTeam === 'all' || eTeamNormalized === selectedTeamNormalized) && e.members) {`;

const r2 = `       const selectedTeamNormalized = selectedTeam.normalize('NFC').toLowerCase().replace(/\\s+/g, ' ').trim();
       const hasTeam = (e.team || '').split(',').some(t => t.normalize('NFC').toLowerCase().replace(/\\s+/g, ' ').trim() === selectedTeamNormalized);
       
       if ((selectedTeam === 'all' || hasTeam) && e.members) {`;

if (code.includes(t1) && code.includes(t2)) {
    code = code.replace(t1, r1);
    code = code.replace(t2, r2);
    fs.writeFileSync('src/components/Analytics.tsx', code, 'utf8');
    console.log("Success: patched Analytics team filtering logic");
} else {
    console.log("Failed: could not find target in Analytics");
}
