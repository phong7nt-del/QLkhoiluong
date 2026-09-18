import { DataStore, WorkloadEntry, SheetMember } from '../store/DataStore';

export interface MemberProductivityStat {
  member: string;
  team: string;
  daysWorkedCount: number;
  totalStandardDays: number;
  productivityPercent: number;
  entriesCount: number;
}

/**
 * Calculates member productivity (%) exactly matching AnalysisTab business logic:
 * - Group size division for shared tasks (id > 0)
 * - Quotas from DataStore.getDinhMuc()
 * - Working days calculated with excludeSat, excludeSun, excludeNghi
 * - Productivity (%) = (totalStandardDays / daysWorkedCount) * 100
 */
export function calculateMemberProductivity(
  periodType: 'month' | 'year',
  selectedYear: number,
  selectedMonth: number,
  selectedTeam: string = 'all'
): MemberProductivityStat[] {
  const allEntries = DataStore.getEntries();
  const allMembers = DataStore.getMembers();
  const dinhMucList = DataStore.getDinhMuc();
  const excludeSat = DataStore.getExcludeSaturday();
  const excludeSun = DataStore.getExcludeSunday();
  const excludeNghi = DataStore.getExcludeNghi();

  // 1. Filter entries by period & team
  const filteredEntries = allEntries.filter(e => {
    if (!e.date) return false;
    const parts = e.date.split('-');
    if (parts.length < 2) return false;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);

    if (y !== selectedYear) return false;
    if (periodType === 'month' && m !== selectedMonth) return false;
    if (selectedTeam !== 'all' && e.team !== selectedTeam) return false;
    return true;
  });

  // 2. Build group sizes across all entries for same date and group ID
  const groupSizes: Record<string, Record<number, Set<string>>> = {};
  filteredEntries.forEach(e => {
    let mbrTokens = e.members || (e as any).workGroup || [];
    if (typeof mbrTokens === 'string') mbrTokens = [mbrTokens];
    const members = (Array.isArray(mbrTokens) && mbrTokens.length > 0) ? mbrTokens : ['Khuyết danh'];
    const linesAll = (e.content || '').split(/\n/);
    const lastLine = linesAll[linesAll.length - 1].trim();
    if (/^\d+$/.test(lastLine)) {
      const groupId = parseInt(lastLine, 10);
      if (groupId > 0) {
        const date = e.date;
        if (!groupSizes[date]) groupSizes[date] = {};
        if (!groupSizes[date][groupId]) groupSizes[date][groupId] = new Set();
        members.forEach(m => groupSizes[date][groupId].add(m));
      }
    }
  });

  // 3. Compute stats per member
  const stats: Record<string, { member: string; team: string; daysWorked: Set<string>; totalStandardDays: number; entriesCount: number }> = {};

  filteredEntries.forEach(e => {
    let mbrTokens = e.members || (e as any).workGroup || [];
    if (typeof mbrTokens === 'string') mbrTokens = [mbrTokens];
    const members = (Array.isArray(mbrTokens) && mbrTokens.length > 0) ? mbrTokens : ['Khuyết danh'];
    const date = e.date;

    members.forEach(m => {
      const trimmedM = String(m).trim();
      if (!trimmedM) return;
      if (!stats[trimmedM]) {
        const memberObj = allMembers.find(mem => mem.name.toLowerCase() === trimmedM.toLowerCase());
        stats[trimmedM] = {
          member: trimmedM,
          team: memberObj?.team || e.team || 'Tổ Đo xa',
          daysWorked: new Set(),
          totalStandardDays: 0,
          entriesCount: 0,
        };
      }
      stats[trimmedM].entriesCount += 1;

      if (date) {
        const parts = date.split('-');
        const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const day = dObj.getDay();

        let shouldCount = true;
        if (day === 0 && excludeSun) shouldCount = false;
        if (day === 6 && excludeSat) shouldCount = false;

        if (excludeNghi && e.content) {
          const cleanContent = e.content.toLowerCase().trim();
          const isNghi = cleanContent.length < 30 && /(^|\s)(nghỉ|nghi|ốm|phép)($|\s)/i.test(cleanContent);
          if (isNghi) shouldCount = false;
        }

        if (shouldCount) {
          stats[trimmedM].daysWorked.add(date);
        }
      }
    });

    // Parse work content lines for standard day quotas
    const lines = (e.content || '').split(/\n/).map(l => {
      let clean = l.trim();
      if (clean.startsWith('-')) clean = clean.substring(1).trim();
      return clean;
    }).filter(l => l.length > 0 && !l.toLowerCase().includes('phát hiện:') && !/^\d+$/.test(l));

    lines.forEach(line => {
      let qty = 1;
      let itemContent = line;

      const kvMatch = line.match(/^(.+?):\s*([\d.,]+)$/);
      const qtyMatch = line.match(/^([\d.,]+)\s+(.+)$/);
      const oldQtyMatch = line.match(/^(\d+)\s+/);

      if (kvMatch) {
        itemContent = kvMatch[1].trim();
        const parsed = parseFloat(kvMatch[2].replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) qty = parsed;
      } else if (qtyMatch) {
        const parsed = parseFloat(qtyMatch[1].replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) qty = parsed;
        itemContent = qtyMatch[2].trim();
      } else if (oldQtyMatch) {
        const parsed = parseInt(oldQtyMatch[1], 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 9999) qty = parsed;
      }

      let matchedName = 'Khác';
      const cleanItemContent = (itemContent || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();

      let exactDm = dinhMucList.find(d => {
        const cleanDName = (d.name || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
        return cleanDName === cleanItemContent;
      });

      if (exactDm) {
        matchedName = exactDm.name;
      } else {
        const foundDm = dinhMucList.find(d => {
          const cleanDName = (d.name || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
          return cleanDName.includes(cleanItemContent) || cleanItemContent.includes(cleanDName);
        });
        if (foundDm) matchedName = foundDm.name;
      }

      const cleanMatchedName = matchedName.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
      const dm = dinhMucList.find(d => {
        const cleanDName = (d.name || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
        return cleanDName === cleanMatchedName;
      });

      const quotaStr = dm ? String(dm.quota).replace(/,/g, '.') : "0";
      const quota = parseFloat(quotaStr) || 0;

      const linesAll = (e.content || '').split(/\n/);
      const lastLine = linesAll[linesAll.length - 1].trim();
      const isGroupReport = /^\d+$/.test(lastLine) && parseInt(lastLine, 10) > 0;
      const groupId = isGroupReport ? parseInt(lastLine, 10) : 0;
      const trueMembersCount = isGroupReport && groupSizes[e.date] && groupSizes[e.date][groupId]
        ? groupSizes[e.date][groupId].size
        : members.length;

      let qtyPerMember = qty;
      if (isGroupReport && trueMembersCount >= 3) {
        qtyPerMember = (qty * 2) / trueMembersCount;
      }

      members.forEach(m => {
        const trimmedM = String(m).trim();
        if (stats[trimmedM]) {
          if (cleanMatchedName === 'khác') {
            stats[trimmedM].totalStandardDays += (qtyPerMember / 1);
          } else if (quota > 0) {
            stats[trimmedM].totalStandardDays += (qtyPerMember / quota);
          } else {
            stats[trimmedM].totalStandardDays += (qtyPerMember * 0.05);
          }
        }
      });
    });
  });

  // Also include any members from DataStore.getMembers() if selectedTeam matches and not yet present
  allMembers.forEach(mem => {
    if (selectedTeam !== 'all' && mem.team !== selectedTeam) return;
    if (!stats[mem.name]) {
      // Members with 0 recorded entries in period
      stats[mem.name] = {
        member: mem.name,
        team: mem.team || 'Tổ Đo xa',
        daysWorked: new Set(),
        totalStandardDays: 0,
        entriesCount: 0,
      };
    }
  });

  return Object.values(stats).map(m => {
    const days = m.daysWorked.size || 0;
    // If daysWorked > 0, compute (totalStandardDays / daysWorked) * 100
    // If no days worked but has standard days (e.g. weekend), use 1 day
    const effectiveDays = days > 0 ? days : (m.totalStandardDays > 0 ? 1 : 0);
    const p = effectiveDays > 0 ? (m.totalStandardDays / effectiveDays) * 100 : 0;
    return {
      member: m.member,
      team: m.team,
      daysWorkedCount: days,
      totalStandardDays: Number(m.totalStandardDays.toFixed(2)),
      productivityPercent: Number(p.toFixed(1)),
      entriesCount: m.entriesCount
    };
  }).sort((a, b) => {
    // Sort descending by productivityPercent, secondary by totalStandardDays
    if (b.productivityPercent !== a.productivityPercent) {
      return b.productivityPercent - a.productivityPercent;
    }
    return b.totalStandardDays - a.totalStandardDays;
  });
}
