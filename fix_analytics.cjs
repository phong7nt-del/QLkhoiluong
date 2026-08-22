const fs = require('fs');
let code = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

const t = `  const groupedByWorkgroup = useMemo(() => {
    if (filterMode !== 'day' || detailViewMode !== 'by_workgroup' || !selectedDate) return [];
    
    const groups = new Map();
    
    // Scan ALL entries for the day to build groups, not just filtered ones
    const dayEntries = entries.filter(e => e.date === selectedDate);
    
    dayEntries.forEach(e => {
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
    
    return resultGroups.map(g => ({
        id: g.id,
        date: g.date,
        members: Array.from(g.members).sort(),
        team: Array.from(g.teams).join(', '),
        content: g.content,
        timestamp: g.timestamp
    })).sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredEntries, filterMode, detailViewMode]);`;

if (code.includes(t)) {
    code = code.replace(t, ''); // remove it from here
    
    // now we need to insert it after filteredEntries
    const afterTarget = `      if (selectedMember !== 'all' && (!e.members || !e.members.includes(selectedMember))) return false;
      return true;
    });
  }, [entries, selectedTeam, selectedMember, filterMode, selectedDate, selectedWeek, selectedMonth, selectedYear]);`;

    const properHook = `  const groupedByWorkgroup = useMemo(() => {
    if (filterMode !== 'day' || detailViewMode !== 'by_workgroup' || !selectedDate) return [];
    
    const groups = new Map();
    
    // Scan ALL entries for the day to build groups, not just filtered ones
    const dayEntries = entries.filter(e => e.date === selectedDate);
    
    dayEntries.forEach(e => {
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
    
    return resultGroups.map(g => ({
        id: g.id,
        date: g.date,
        members: Array.from(g.members).sort(),
        team: Array.from(g.teams).join(', '),
        content: g.content,
        timestamp: g.timestamp
    })).sort((a, b) => b.timestamp - a.timestamp);
  }, [entries, filterMode, detailViewMode, selectedDate, selectedTeam, selectedMember]);`;

    code = code.replace(afterTarget, afterTarget + '\\n\\n' + properHook);
    fs.writeFileSync('src/components/Analytics.tsx', code, 'utf8');
    console.log("Fixed!");
} else {
    console.log("Could not find the target text.");
}
