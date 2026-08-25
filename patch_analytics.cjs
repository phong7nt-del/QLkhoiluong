const fs = require('fs');

let content = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

// Update imports
content = content.replace(
    "import { DataStore } from '../store/DataStore';",
    "import { DataStore, SheetMember } from '../store/DataStore';"
);
content = content.replace(
    "import { Filter, Trash2, ChevronDown, ChevronUp, Download } from 'lucide-react';",
    "import { Filter, Trash2, ChevronDown, ChevronUp, Download, AlertCircle } from 'lucide-react';"
);

// Update component signature
content = content.replace(
    "export default function Analytics({ refreshToggle }: { refreshToggle: number }) {",
    "export default function Analytics({ refreshToggle, sessionUser }: { refreshToggle: number, sessionUser?: SheetMember | null }) {"
);

// Insert missingReportsInfo
const targetMissing = "  const dinhMucList = useMemo(() => DataStore.getDinhMuc(), [refreshToggle]);";
const insertMissing = `  const dinhMucList = useMemo(() => DataStore.getDinhMuc(), [refreshToggle]);

  const missingReportsInfo = useMemo(() => {
    if (!sessionUser) return null;
    const role = (sessionUser.role || '').toLowerCase();
    const isToPhoTruong = role.includes('tổ trưởng') || role.includes('tổ phó');
    const isDoiPhoTruong = role.includes('đội trưởng') || role.includes('đội phó') || role.includes('giám đốc');
    
    if (!isToPhoTruong && !isDoiPhoTruong) return null;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const checkDate = (filterMode === 'day' && selectedDate) ? selectedDate : todayStr;
    const allMembers = DataStore.getMembers();
    const dayEntries = entries.filter(e => e.date === checkDate);
    
    const reportedMembers = new Set<string>();
    dayEntries.forEach(e => {
        (e.members || []).forEach(m => reportedMembers.add(m));
    });

    if (isToPhoTruong && !isDoiPhoTruong && sessionUser.team) {
        const teamMembers = allMembers.filter(m => m.team === sessionUser.team);
        const missing = teamMembers.filter(m => !reportedMembers.has(m.name));
        return {
            type: 'team',
            teamName: sessionUser.team,
            count: missing.length,
            members: missing.map(m => m.name),
            checkDate
        };
    }

    if (isDoiPhoTruong) {
        const teamsMap = new Map<string, string[]>();
        allMembers.forEach(m => {
            if (!m.team || m.team === 'Đội') return;
            if (!reportedMembers.has(m.name)) {
                if (!teamsMap.has(m.team)) teamsMap.set(m.team, []);
                teamsMap.get(m.team).push(m.name);
            }
        });
        
        return {
            type: 'all_teams',
            teams: Array.from(teamsMap.entries()).map(([team, missing]) => ({ team, count: missing.length, members: missing })).sort((a, b) => b.count - a.count),
            checkDate
        };
    }
    
    return null;
  }, [entries, filterMode, selectedDate, sessionUser]);`;

content = content.replace(targetMissing, insertMissing);

// Insert UI
const targetUI = `<div className="space-y-8">
      <div className="bg-white border border-[#141414] flex flex-col shadow-[4px_4px_0_#141414] sm:shadow-[8px_8px_0_#141414]">`;

const insertUI = `<div className="space-y-8">
      {missingReportsInfo && (
        <div className="bg-[#141414] text-[#E4E3E0] p-4 sm:p-6 shadow-[4px_4px_0_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-top-2 border border-[#E4E3E0]/20">
          <div className="font-bold flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span className="uppercase tracking-widest text-sm text-amber-400">Thông tin nhân viên chưa báo cáo ({missingReportsInfo.checkDate.split('-').reverse().join('/')})</span>
          </div>
          
          {missingReportsInfo.type === 'team' && (
             <div className="text-sm">
               Có <span className="font-bold text-amber-400 text-lg mx-1">{missingReportsInfo.count}</span> nhân viên thuộc <strong>{missingReportsInfo.teamName}</strong> chưa báo cáo.
               {missingReportsInfo.count > 0 && (
                  <div className="mt-2 text-[#E4E3E0]/70 font-mono text-xs leading-relaxed">
                    ({missingReportsInfo.members.join(', ')})
                  </div>
               )}
             </div>
          )}
          
          {missingReportsInfo.type === 'all_teams' && (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
               {missingReportsInfo.teams.map(t => (
                  <div key={t.team} className="bg-white/5 p-3 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="font-bold text-sm mb-1 flex justify-between items-center">
                       <span>{t.team}</span>
                       <span className={\`px-2 py-0.5 text-xs rounded-full \${t.count > 0 ? 'bg-amber-400/20 text-amber-400' : 'bg-emerald-400/20 text-emerald-400'}\`}>
                          {t.count > 0 ? \`\${t.count} thiếu\` : 'Đủ'}
                       </span>
                    </div>
                    {t.count > 0 && (
                       <div className="text-xs text-[#E4E3E0]/60 mt-2 font-mono line-clamp-3 hover:line-clamp-none transition-all" title={t.members.join(', ')}>
                         {t.members.join(', ')}
                       </div>
                    )}
                  </div>
               ))}
               {missingReportsInfo.teams.length === 0 && (
                  <div className="col-span-full text-emerald-400 font-bold text-sm">
                     Tất cả các tổ đều đã báo cáo đầy đủ!
                  </div>
               )}
             </div>
          )}
        </div>
      )}

      <div className="bg-white border border-[#141414] flex flex-col shadow-[4px_4px_0_#141414] sm:shadow-[8px_8px_0_#141414]">`;

content = content.replace(targetUI, insertUI);

fs.writeFileSync('src/components/Analytics.tsx', content, 'utf8');
console.log("Patched Analytics.tsx successfully!");

