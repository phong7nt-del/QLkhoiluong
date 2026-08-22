const fs = require('fs');
let code = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

const targetUseMemo = `  const filteredEntries = useMemo(() => {`;
const insertGrouped = `
  const groupedByWorkgroup = useMemo(() => {
    if (filterMode !== 'day' || detailViewMode !== 'by_workgroup') return [];
    
    const groups = new Map();
    
    filteredEntries.forEach(e => {
        const linesAll = (e.content || '').split('\\n');
        const lastLine = linesAll[linesAll.length - 1].trim();
        const gId = /^\\d+$/.test(lastLine) ? parseInt(lastLine, 10) : 0;
        
        let key = e.content;
        if (gId === 0) {
            key = e.id; // unique for independent tasks
        }
        
        if (!groups.has(key)) {
            groups.set(key, {
                id: e.id,
                date: e.date,
                members: new Set(e.members || []),
                teams: new Set([e.team || '']),
                content: e.content,
                timestamp: e.timestamp
            });
        } else {
            const g = groups.get(key);
            (e.members || []).forEach(m => g.members.add(m));
            if (e.team) g.teams.add(e.team);
            if (e.timestamp > g.timestamp) g.timestamp = e.timestamp;
        }
    });
    
    return Array.from(groups.values()).map(g => ({
        id: g.id,
        date: g.date,
        members: Array.from(g.members).sort(),
        team: Array.from(g.teams).join(', '),
        content: g.content,
        timestamp: g.timestamp
    })).sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredEntries, filterMode, detailViewMode]);

  const filteredEntries = useMemo(() => {`;

code = code.replace(targetUseMemo, insertGrouped);


const targetRender = `                      {filteredEntries.sort((a, b) => b.timestamp - a.timestamp).map((e, i) => {
                         const displayDate = e.date.includes('-') ? e.date.split('-').reverse().join('/') : e.date;
                         return (
                         <tr key={e.id} className={\`border-b border-[#141414]/10 hover:bg-[#E4E3E0]/30 transition-colors \${i % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'}\`}>`;

const replRender = `                      {groupedByWorkgroup.map((e, i) => {
                         const displayDate = e.date.includes('-') ? e.date.split('-').reverse().join('/') : e.date;
                         return (
                         <tr key={e.id} className={\`border-b border-[#141414]/10 hover:bg-[#E4E3E0]/30 transition-colors \${i % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'}\`}>`;

if (code.includes(targetRender)) {
    code = code.replace(targetRender, replRender);
    fs.writeFileSync('src/components/Analytics.tsx', code, 'utf8');
    console.log('Success: patched grouping');
} else {
    console.log('Error: Could not find targetRender');
}

