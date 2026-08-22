const fs = require('fs');
let code = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

const t1 = `  const groupedByWorkgroup = useMemo(() => {
    if (filterMode !== 'day' || detailViewMode !== 'by_workgroup') return [];
    
    const groups = new Map();
    
    filteredEntries.forEach(e => {`;

const r1 = `  const groupedByWorkgroup = useMemo(() => {
    if (filterMode !== 'day' || detailViewMode !== 'by_workgroup' || !selectedDate) return [];
    
    const groups = new Map();
    
    // Scan ALL entries for the day to build groups, not just filtered ones
    const dayEntries = entries.filter(e => e.date === selectedDate);
    
    dayEntries.forEach(e => {`;

const t2 = `        if (!groups.has(key)) {
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
    
    return Array.from(groups.values()).map(g => ({`;

const r2 = `        if (!groups.has(key)) {
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
    
    let resultGroups = Array.from(groups.values());
    
    // If a specific team is selected, only show groups that contain someone from that team
    if (selectedTeam !== 'all') {
       const selectedTeamNormalized = selectedTeam.normalize('NFC').toLowerCase().replace(/\\s+/g, ' ').trim();
       resultGroups = resultGroups.filter(g => {
           // We need to check if any original entry in this group was from the selected team
           // e.team might not have all the info, but g.teams has all the teams in the group
           return Array.from(g.teams).some(t => t.normalize('NFC').toLowerCase().replace(/\\s+/g, ' ').trim() === selectedTeamNormalized);
       });
    }
    
    // If a specific member is selected, only show groups containing that member
    if (selectedMember !== 'all') {
       resultGroups = resultGroups.filter(g => g.members.has(selectedMember));
    }
    
    return resultGroups.map(g => ({`;

if (code.includes(t1) && code.includes(t2)) {
    code = code.replace(t1, r1);
    code = code.replace(t2, r2);
    fs.writeFileSync('src/components/Analytics.tsx', code, 'utf8');
    console.log("Success: Fixed grouping to include all day entries");
} else {
    console.log("Error: could not find grouping logic");
}
