import React, { useState, useMemo } from 'react';
import { DataStore, SheetMember, WorkloadEntry, NghiBuLog } from '../store/DataStore';
import { PermissionStore, normalizeRoleStr } from '../store/PermissionStore';
import { 
  CalendarDays, 
  Users, 
  Clock, 
  CheckCircle2, 
  Download, 
  Search, 
  Filter, 
  PlusCircle, 
  AlertCircle, 
  Info, 
  Calendar, 
  Briefcase, 
  History, 
  X, 
  ChevronRight,
  ShieldCheck,
  Building2,
  CalendarCheck2,
  Coffee
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx-js-style';

interface Props {
  refreshToggle: number;
  sessionUser?: SheetMember | null;
  onRefresh?: () => void;
}

interface MemberOvertimeStat {
  member: SheetMember;
  name: string;
  team: string;
  role: string;
  isWorkerOrDeputy: boolean;
  overtimeDates: { date: string; dayOfWeek: number; content: string }[];
  overtimeDaysCount: number;
  leaveDates: { date: string; dayOfWeek: number; content: string; days: number }[];
  leaveDaysReportCount: number;
  daNghiBu: number;
  totalDaNghiBuAllTime: number;
  conLai: number;
  conLaiTotal: number;
  totalOvertimeAllTime: number;
  nghiBuLogs: NghiBuLog[];
}

export default function NgayLamThemSubTab({ refreshToggle, sessionUser, onRefresh }: Props) {
  const [localRefresh, setLocalRefresh] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or '01', '02', ...
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyWorkerAndDeputy, setOnlyWorkerAndDeputy] = useState<boolean>(true);

  // Modals state
  const [updatingMember, setUpdatingMember] = useState<MemberOvertimeStat | null>(null);
  const [addDaysInput, setAddDaysInput] = useState<string>('1');
  const [leaveDateInput, setLeaveDateInput] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [leaveNoteInput, setLeaveNoteInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Detail view modal
  const [detailMember, setDetailMember] = useState<MemberOvertimeStat | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'overtime' | 'leave'>('overtime');

  // History log modal
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  const rawEntries = useMemo(() => DataStore.getEntries(), [refreshToggle, localRefresh]);
  const allMembers = useMemo(() => DataStore.getMembers(), [refreshToggle, localRefresh]);
  const allTeams = useMemo(() => {
    const list = DataStore.getTeams();
    const set = new Set<string>();
    list.forEach(t => {
      if (t && t !== 'Không xác định' && t !== 'Tổ công tác' && t !== 'Khu vực') {
        set.add(t);
      }
    });
    allMembers.forEach(m => {
      if (m.team && m.team !== 'Không xác định') set.add(m.team);
    });
    return Array.from(set).sort();
  }, [allMembers, refreshToggle]);

  // Determine user permission to update leave
  const userRoleStr = useMemo(() => {
    let r = sessionUser?.role || (sessionUser as any)?.chucDanh || (sessionUser as any)?.chucVu || '';
    const rawName = sessionUser?.name || '';
    const normName = normalizeRoleStr(rawName);
    if (normName.includes('nguyen thanh phong') || normName.includes('thanh phong')) {
      r = r ? `Đội trưởng, ${r}` : 'Đội trưởng';
    }
    return r;
  }, [sessionUser]);

  const canManageNghiBu = useMemo(() => {
    const norm = normalizeRoleStr(userRoleStr);
    const uName = normalizeRoleStr(sessionUser?.name || '');
    if (uName.includes('nguyen thanh phong') || uName.includes('thanh phong') || (sessionUser as any)?.email?.includes('phong7nt')) {
      return true;
    }
    return (
      norm.includes('doi truong') ||
      norm.includes('giam doc') ||
      norm.includes('doi pho') ||
      norm.includes('to truong') ||
      PermissionStore.hasActionAccess('update_nghibu', userRoleStr, sessionUser)
    );
  }, [userRoleStr, sessionUser]);

  // Available years from entries
  const availableYears = useMemo(() => {
    const ySet = new Set<string>();
    const currentY = String(new Date().getFullYear());
    ySet.add(currentY);
    rawEntries.forEach(e => {
      if (e.date && e.date.length >= 4) {
        const y = e.date.substring(0, 4);
        if (/^\d{4}$/.test(y)) ySet.add(y);
      }
    });
    return Array.from(ySet).sort().reverse();
  }, [rawEntries]);

  // Helper check: Is worker or deputy ("nhân viên, tổ phó")
  const checkIsWorkerOrDeputy = (role?: string) => {
    const r = normalizeRoleStr(role || '');
    if (
      r.includes('doi truong') ||
      r.includes('truong doi') ||
      r.includes('giam doc') ||
      r.includes('pho giam doc') ||
      r.includes('pgd') ||
      r.includes('doi pho') ||
      r.includes('pho doi') ||
      r.includes('to truong') ||
      r.includes('truong to')
    ) {
      return false;
    }
    return true; // nhân viên, công nhân, tổ phó, hoặc chưa gán chức vụ quản lý
  };

  // Helper check: Is leave report from Monday to Friday with content 'Nghỉ'
  const isLeaveReport = (content?: string): boolean => {
    if (!content) return false;
    const lower = content.toLowerCase().trim();
    return (
      lower.startsWith('nghỉ') ||
      lower.startsWith('- nghỉ') ||
      lower.startsWith('nghi') ||
      lower.startsWith('- nghi') ||
      /(^|\n)\s*(-\s*)?nghỉ(\s*:|\s+|$)/i.test(lower) ||
      /(^|\n)\s*(-\s*)?nghi(\s*:|\s+|$)/i.test(lower) ||
      lower.includes('nghỉ bù') ||
      lower.includes('nghi bu')
    );
  };

  // Helper: Extract leave days from content (defaults to 1 if not specified)
  const extractLeaveDays = (content?: string): number => {
    if (!content) return 1;
    const match = content.match(/(?:^|\n|\s)(?:-\s*)?ngh[iỉ]\s*:\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0) return val;
    }
    return 1;
  };

  // Helper: Day of week name
  const getDayOfWeekName = (dayOfWeek: number): string => {
    switch (dayOfWeek) {
      case 1: return 'Thứ Hai';
      case 2: return 'Thứ Ba';
      case 3: return 'Thứ Tư';
      case 4: return 'Thứ Năm';
      case 5: return 'Thứ Sáu';
      case 6: return 'Thứ Bảy';
      case 0: return 'Chủ Nhật';
      default: return '';
    }
  };

  // Map of member overtime records
  const memberStatsList = useMemo<MemberOvertimeStat[]>(() => {
    // 1. Build map of member names to weekend dates worked (T7, CN)
    const weekendWorkedMap = new Map<string, Map<string, { date: string; dayOfWeek: number; content: string }>>();
    // 2. Build map of member names to weekday compensatory leave dates (T2 - T6, report 'Nghỉ')
    const weekdayLeaveMap = new Map<string, Map<string, { date: string; dayOfWeek: number; content: string; days: number }>>();

    rawEntries.forEach(e => {
      if (!e.date) return;
      const parts = e.date.split('-');
      if (parts.length < 3) return;
      const y = parts[0];
      const m = parts[1];
      const d = parts[2];

      // Filter by selected year
      if (selectedYear !== 'all' && y !== selectedYear) return;
      // Filter by selected month
      if (selectedMonth !== 'all' && m !== selectedMonth) return;

      const dObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      const dayOfWeek = dObj.getDay(); // 0: Sunday, 1: Mon, ..., 5: Fri, 6: Sat

      let mbrTokens = e.members || (e as any).workGroup || [];
      if (typeof mbrTokens === 'string') mbrTokens = [mbrTokens];
      if (!Array.isArray(mbrTokens) || mbrTokens.length === 0) return;

      // Check if it's weekend overtime (Saturday or Sunday)
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      // Check if it's weekday compensatory leave (Monday to Friday with "Nghỉ" report)
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      const isLeave = isWeekday && isLeaveReport(e.content);

      if (!isWeekend && !isLeave) return;

      mbrTokens.forEach(mName => {
        const cleanName = String(mName || '').trim();
        if (!cleanName || cleanName.toLowerCase() === 'khuyết danh') return;
        const normKey = normalizeRoleStr(cleanName);

        if (isWeekend) {
          if (!weekendWorkedMap.has(normKey)) {
            weekendWorkedMap.set(normKey, new Map());
          }
          const userDates = weekendWorkedMap.get(normKey)!;
          if (!userDates.has(e.date)) {
            userDates.set(e.date, {
              date: e.date,
              dayOfWeek,
              content: e.content || 'Công tác ngày nghỉ'
            });
          }
        }

        if (isLeave) {
          if (!weekdayLeaveMap.has(normKey)) {
            weekdayLeaveMap.set(normKey, new Map());
          }
          const userLeaveDates = weekdayLeaveMap.get(normKey)!;
          if (!userLeaveDates.has(e.date)) {
            const days = extractLeaveDays(e.content);
            userLeaveDates.set(e.date, {
              date: e.date,
              dayOfWeek,
              content: e.content || 'Nghỉ',
              days
            });
          }
        }
      });
    });

    // 2. Iterate through all members in master list
    const results: MemberOvertimeStat[] = [];
    const processedNormNames = new Set<string>();
    const localNghiBuMap = DataStore.getLocalNghiBuMap();
    const allNghiBuLogs = DataStore.getNghiBuLogs();

    allMembers.forEach(mem => {
      const cleanName = (mem.name || '').trim();
      if (!cleanName) return;
      const normKey = normalizeRoleStr(cleanName);
      processedNormNames.add(normKey);

      const isWorkerOrDeputy = checkIsWorkerOrDeputy(mem.role);
      const userDateMap = weekendWorkedMap.get(normKey);
      const overtimeDates = userDateMap ? Array.from(userDateMap.values()).sort((a, b) => b.date.localeCompare(a.date)) : [];
      const overtimeDaysCount = overtimeDates.length;

      const userLeaveMap = weekdayLeaveMap.get(normKey);
      const leaveDates = userLeaveMap ? Array.from(userLeaveMap.values()).sort((a, b) => b.date.localeCompare(a.date)) : [];
      const leaveDaysReportCount = Number(leaveDates.reduce((sum, item) => sum + (item.days || 1), 0).toFixed(1));

      const memNghiBu = typeof mem.nghiBu === 'number' ? mem.nghiBu : (parseFloat(String(mem.nghiBu || 0)) || 0);
      const localVal = localNghiBuMap[cleanName] ?? localNghiBuMap[normKey] ?? 0;
      const daNghiBu = Number(Math.max(memNghiBu, localVal, leaveDaysReportCount).toFixed(2));
      const conLai = Math.max(0, Number((overtimeDaysCount - daNghiBu).toFixed(2)));

      const memberLogs = allNghiBuLogs.filter(l => {
        const lName = normalizeRoleStr(l.memberName || '');
        return lName === normKey || lName.includes(normKey) || normKey.includes(lName);
      });

      results.push({
        member: mem,
        name: cleanName,
        team: mem.team || 'Không xác định',
        role: mem.role || 'Nhân viên',
        isWorkerOrDeputy,
        overtimeDates,
        overtimeDaysCount,
        leaveDates,
        leaveDaysReportCount,
        daNghiBu,
        totalDaNghiBuAllTime: daNghiBu,
        conLai,
        conLaiTotal: conLai,
        totalOvertimeAllTime: overtimeDaysCount,
        nghiBuLogs: memberLogs
      });
    });

    // Also include any reporting member from CongTac who might not be in members master list
    const remainingKeys = new Set([...weekendWorkedMap.keys(), ...weekdayLeaveMap.keys()]);
    remainingKeys.forEach(normKey => {
      if (!processedNormNames.has(normKey)) {
        const userDateMap = weekendWorkedMap.get(normKey);
        const overtimeDates = userDateMap ? Array.from(userDateMap.values()).sort((a, b) => b.date.localeCompare(a.date)) : [];
        const overtimeDaysCount = overtimeDates.length;

        const userLeaveMap = weekdayLeaveMap.get(normKey);
        const leaveDates = userLeaveMap ? Array.from(userLeaveMap.values()).sort((a, b) => b.date.localeCompare(a.date)) : [];
        const leaveDaysReportCount = Number(leaveDates.reduce((sum, item) => sum + (item.days || 1), 0).toFixed(1));

        const localVal = localNghiBuMap[normKey] ?? 0;
        const daNghiBu = Number(Math.max(localVal, leaveDaysReportCount).toFixed(2));
        const conLai = Math.max(0, Number((overtimeDaysCount - daNghiBu).toFixed(2)));
        const memberLogs = allNghiBuLogs.filter(l => {
          const lName = normalizeRoleStr(l.memberName || '');
          return lName === normKey || lName.includes(normKey) || normKey.includes(lName);
        });

        results.push({
          member: { name: normKey, team: 'Khác' },
          name: normKey,
          team: 'Khác',
          role: 'Nhân viên',
          isWorkerOrDeputy: true,
          overtimeDates,
          overtimeDaysCount,
          leaveDates,
          leaveDaysReportCount,
          daNghiBu,
          totalDaNghiBuAllTime: daNghiBu,
          conLai,
          conLaiTotal: conLai,
          totalOvertimeAllTime: overtimeDaysCount,
          nghiBuLogs: memberLogs
        });
      }
    });

    return results;
  }, [rawEntries, allMembers, selectedYear, selectedMonth, localRefresh]);

  // Filtered members list based on UI filters
  const filteredMembers = useMemo(() => {
    return memberStatsList.filter(item => {
      // 1. Worker & Deputy filter
      if (onlyWorkerAndDeputy && !item.isWorkerOrDeputy) {
        return false;
      }
      // 2. Team filter
      if (selectedTeam !== 'all' && item.team !== selectedTeam) {
        return false;
      }
      // 3. Search query
      if (searchQuery.trim()) {
        const q = normalizeRoleStr(searchQuery);
        const nameNorm = normalizeRoleStr(item.name);
        const teamNorm = normalizeRoleStr(item.team);
        if (!nameNorm.includes(q) && !teamNorm.includes(q)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Sort by overtime days descending, then by name
      if (b.overtimeDaysCount !== a.overtimeDaysCount) {
        return b.overtimeDaysCount - a.overtimeDaysCount;
      }
      return a.name.localeCompare(b.name);
    });
  }, [memberStatsList, onlyWorkerAndDeputy, selectedTeam, searchQuery]);

  // Overall KPIs (Cả Đội)
  const teamKPIs = useMemo(() => {
    const targetList = onlyWorkerAndDeputy 
      ? memberStatsList.filter(m => m.isWorkerOrDeputy) 
      : memberStatsList;

    const activeMembersCount = targetList.filter(m => m.overtimeDaysCount > 0).length;
    const totalOvertimeDays = targetList.reduce((acc, m) => acc + m.overtimeDaysCount, 0);
    const totalDaNghiBu = targetList.reduce((acc, m) => acc + m.daNghiBu, 0);
    const totalLeaveFromReports = targetList.reduce((acc, m) => acc + m.leaveDaysReportCount, 0);
    const totalConLai = Math.max(0, totalOvertimeDays - totalDaNghiBu);
    const rate = totalOvertimeDays > 0 ? (totalDaNghiBu / totalOvertimeDays) * 100 : 0;

    return {
      activeMembersCount,
      totalOvertimeDays,
      totalDaNghiBu: Number(totalDaNghiBu.toFixed(2)),
      totalLeaveFromReports: Number(totalLeaveFromReports.toFixed(1)),
      totalConLai: Number(totalConLai.toFixed(2)),
      rate: Number(rate.toFixed(1))
    };
  }, [memberStatsList, onlyWorkerAndDeputy]);

  // Team Aggregates (Từng Tổ)
  const teamSummaries = useMemo(() => {
    const targetList = onlyWorkerAndDeputy 
      ? memberStatsList.filter(m => m.isWorkerOrDeputy) 
      : memberStatsList;

    const map: Record<string, { team: string; memberCount: number; overtimeDays: number; daNghiBu: number; leaveDaysReport: number; conLai: number }> = {};

    targetList.forEach(m => {
      const t = m.team || 'Khác';
      if (!map[t]) {
        map[t] = { team: t, memberCount: 0, overtimeDays: 0, daNghiBu: 0, leaveDaysReport: 0, conLai: 0 };
      }
      if (m.overtimeDaysCount > 0) {
        map[t].memberCount += 1;
      }
      map[t].overtimeDays += m.overtimeDaysCount;
      map[t].daNghiBu += m.daNghiBu;
      map[t].leaveDaysReport += m.leaveDaysReportCount;
      map[t].conLai += m.conLai;
    });

    return Object.values(map)
      .map(t => ({
        ...t,
        daNghiBu: Number(t.daNghiBu.toFixed(2)),
        leaveDaysReport: Number(t.leaveDaysReport.toFixed(1)),
        conLai: Number(t.conLai.toFixed(2)),
        rate: t.overtimeDays > 0 ? Number(((t.daNghiBu / t.overtimeDays) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.overtimeDays - a.overtimeDays);
  }, [memberStatsList, onlyWorkerAndDeputy]);

  // Logs list for history modal
  const historyLogs = useMemo(() => {
    return DataStore.getNghiBuLogs();
  }, [refreshToggle, showHistoryModal]);

  // Open Update Modal
  const handleOpenUpdate = (item: MemberOvertimeStat) => {
    setUpdatingMember(item);
    setAddDaysInput('1');
    setLeaveDateInput(format(new Date(), 'yyyy-MM-dd'));
    setLeaveNoteInput('');
    setModalError(null);
    setModalSuccess(null);
  };

  // Submit Compensatory Leave Update
  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingMember) return;

    const addVal = parseFloat(addDaysInput.replace(',', '.'));
    if (isNaN(addVal) || addVal <= 0) {
      setModalError('Số ngày nghỉ bù phải lớn hơn 0 (ví dụ: 0.5, 1, 1.5, 2)');
      return;
    }

    // Constraint 1: Mỗi lần nghỉ bù không được quá 2 ngày
    if (addVal > 2) {
      setModalError('Mỗi lần nghỉ bù không được quá 2 ngày theo quy định!');
      return;
    }

    // Constraint 2: Số ngày nghỉ bù không được lớn hơn số ngày đã làm
    const currentRemaining = updatingMember.conLai;
    if (addVal > currentRemaining) {
      setModalError(`Số ngày nghỉ bù (${addVal} ngày) vượt quá số ngày làm thêm còn lại (${currentRemaining} ngày)!`);
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      const updaterName = sessionUser?.name || 'Quản lý';
      const fullNote = leaveNoteInput.trim() 
        ? `${leaveNoteInput.trim()} (Ngày nghỉ: ${leaveDateInput})` 
        : `Nghỉ bù ngày ${leaveDateInput}`;

      const res = await DataStore.updateMemberNghiBu(
        updatingMember.name,
        addVal,
        fullNote,
        updaterName,
        leaveDateInput
      );

      if (res.success) {
        setModalSuccess(`Đã cập nhật thành công! Tổng ngày nghỉ bù hiện tại: ${res.newTotal} ngày.`);
        setLocalRefresh(p => p + 1);
        if (onRefresh) onRefresh();
        setTimeout(() => {
          setUpdatingMember(null);
        }, 1400);
      } else {
        setModalError(res.error || 'Có lỗi xảy ra khi lưu lên hệ thống');
      }
    } catch (err: any) {
      setModalError(err?.message || 'Có lỗi khi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export to Excel function
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    const timeLabel = selectedYear === 'all' 
      ? 'TẤT CẢ CÁC NĂM' 
      : selectedMonth === 'all' 
        ? `NĂM ${selectedYear}` 
        : `THÁNG ${selectedMonth}/${selectedYear}`;

    // Styling helper for xlsx-js-style
    const formatSheet = (ws: any) => {
      Object.keys(ws).forEach(addr => {
        if (addr.startsWith('!')) return;
        const cell = ws[addr];
        if (!cell) return;
        if (!cell.s) cell.s = {};
        cell.s.border = {
          top: { style: 'thin', color: { rgb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
          left: { style: 'thin', color: { rgb: 'D1D5DB' } },
          right: { style: 'thin', color: { rgb: 'D1D5DB' } }
        };
      });
    };

    // Sheet 1: Tổng hợp Toàn Đội & Các Tổ
    const sheet1Rows: any[] = [
      ['BÁO CÁO TỔNG HỢP NGÀY LÀM THÊM (THỨ 7 - CHỦ NHẬT) & NGHỈ BÙ'],
      [`Kỳ báo cáo: ${timeLabel}`],
      [''],
      ['I. CHỈ SỐ TỔNG QUAN TOÀN ĐỘI'],
      ['Tổng nhân sự tham gia làm thêm:', teamKPIs.activeMembersCount],
      ['Tổng số ngày làm thêm (ngày công):', teamKPIs.totalOvertimeDays],
      ['Tổng số ngày đã giải quyết nghỉ bù:', teamKPIs.totalDaNghiBu],
      ['Trong đó số ngày nghỉ bù báo cáo (T2-T6):', teamKPIs.totalLeaveFromReports],
      ['Tổng số ngày còn lại cần bố trí nghỉ bù:', teamKPIs.totalConLai],
      ['Tỷ lệ đã giải quyết nghỉ bù:', `${teamKPIs.rate}%`],
      [''],
      ['II. BẢNG TỔNG HỢP THEO TỔ CÔNG TÁC'],
      ['STT', 'Tổ công tác', 'Số nhân sự', 'Tổng ngày làm thêm (T7-CN)', 'Đã nghỉ bù (ngày)', 'Nghỉ bù T2-T6 báo cáo', 'Còn lại (ngày)', 'Tỷ lệ giải quyết (%)']
    ];

    teamSummaries.forEach((t, idx) => {
      sheet1Rows.push([
        idx + 1,
        t.team,
        t.memberCount,
        t.overtimeDays,
        t.daNghiBu,
        t.leaveDaysReport,
        t.conLai,
        `${t.rate}%`
      ]);
    });

    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
    ws1['!cols'] = [
      { wch: 8 },
      { wch: 32 },
      { wch: 16 },
      { wch: 28 },
      { wch: 20 },
      { wch: 22 },
      { wch: 18 },
      { wch: 22 }
    ];
    formatSheet(ws1);
    XLSX.utils.book_append_sheet(workbook, ws1, 'TongHop_ToanDoi_Va_To');

    // Sheet 2: Chi tiết Từng Nhân Viên
    const sheet2Rows: any[] = [
      ['DANH SÁCH CHI TIẾT NGÀY LÀM THÊM & NGHỈ BÙ TỪNG NHÂN VIÊN'],
      [`Kỳ báo cáo: ${timeLabel}`],
      [''],
      ['STT', 'Họ và tên', 'Tổ công tác', 'Chức danh', 'Số ngày làm thêm T7-CN', 'Nghỉ bù T2-T6 báo cáo (ngày)', 'Tổng đã nghỉ bù (ngày)', 'Còn lại (ngày)', 'Tỷ lệ đã nghỉ (%)']
    ];

    filteredMembers.forEach((m, idx) => {
      const rate = m.overtimeDaysCount > 0 ? Number(((m.daNghiBu / m.overtimeDaysCount) * 100).toFixed(1)) : 0;
      sheet2Rows.push([
        idx + 1,
        m.name,
        m.team,
        m.role,
        m.overtimeDaysCount,
        m.leaveDaysReportCount,
        m.daNghiBu,
        m.conLai,
        `${rate}%`
      ]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
    ws2['!cols'] = [
      { wch: 8 },
      { wch: 28 },
      { wch: 26 },
      { wch: 22 },
      { wch: 26 },
      { wch: 26 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 }
    ];
    formatSheet(ws2);
    XLSX.utils.book_append_sheet(workbook, ws2, 'ChiTiet_NhanVien');

    // Sheet 3: Danh sách các ngày Thứ 7 & Chủ Nhật đã làm việc
    const sheet3Rows: any[] = [
      ['NHẬT KÝ CHI TIẾT CÁC NGÀY LÀM THÊM THỨ 7 & CHỦ NHẬT (SHEET CONGTAC)'],
      [`Kỳ báo cáo: ${timeLabel}`],
      [''],
      ['STT', 'Họ và tên', 'Tổ công tác', 'Ngày công tác', 'Thứ', 'Nội dung công tác báo cáo']
    ];

    let rowCount = 0;
    filteredMembers.forEach(m => {
      m.overtimeDates.forEach(d => {
        rowCount++;
        sheet3Rows.push([
          rowCount,
          m.name,
          m.team,
          format(parseISO(d.date), 'dd/MM/yyyy'),
          d.dayOfWeek === 6 ? 'Thứ Bảy' : 'Chủ Nhật',
          d.content
        ]);
      });
    });

    const ws3 = XLSX.utils.aoa_to_sheet(sheet3Rows);
    ws3['!cols'] = [
      { wch: 8 },
      { wch: 28 },
      { wch: 26 },
      { wch: 16 },
      { wch: 14 },
      { wch: 55 }
    ];
    formatSheet(ws3);
    XLSX.utils.book_append_sheet(workbook, ws3, 'NhatKy_LamThem_T7_CN');

    // Sheet 4: Danh sách các ngày Thứ 2 đến Thứ 6 đã nghỉ bù theo báo cáo
    const sheet4Rows: any[] = [
      ['NHẬT KÝ CHI TIẾT CÁC NGÀY NGHỈ BÙ THỨ 2 - THỨ 6 (SHEET CONGTAC)'],
      [`Kỳ báo cáo: ${timeLabel}`],
      [''],
      ['STT', 'Họ và tên', 'Tổ công tác', 'Ngày nghỉ', 'Thứ', 'Số ngày', 'Nội dung báo cáo công tác']
    ];

    let leaveRowCount = 0;
    filteredMembers.forEach(m => {
      m.leaveDates.forEach(d => {
        leaveRowCount++;
        sheet4Rows.push([
          leaveRowCount,
          m.name,
          m.team,
          format(parseISO(d.date), 'dd/MM/yyyy'),
          getDayOfWeekName(d.dayOfWeek),
          d.days,
          d.content
        ]);
      });
    });

    const ws4 = XLSX.utils.aoa_to_sheet(sheet4Rows);
    ws4['!cols'] = [
      { wch: 8 },
      { wch: 28 },
      { wch: 26 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 55 }
    ];
    formatSheet(ws4);
    XLSX.utils.book_append_sheet(workbook, ws4, 'NhatKy_NghiBu_T2_T6');

    const fileName = `BaoCao_NgayLamThem_NghiBu_${selectedYear}_${selectedMonth}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header and Control Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <CalendarCheck2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
                  Quản Lý Ngày Làm Thêm & Nghỉ Bù
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thống kê ngày làm việc Thứ 7 & Chủ Nhật từ sheet <b>CongTac</b> và quản lý hạn mức nghỉ bù nhân viên
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Xem lịch sử duyệt nghỉ bù"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>Lịch sử duyệt nghỉ bù</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-xs hover:shadow"
              title="Xuất báo cáo Excel 3 sheet"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          {/* Year Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> Năm
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            >
              <option value="all">Tất cả các năm</option>
              {availableYears.map(y => (
                <option key={y} value={y}>Năm {y}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <CalendarDays className="w-3 h-3 text-slate-400" /> Tháng
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            >
              <option value="all">Tất cả 12 tháng</option>
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                <option key={m} value={m}>Tháng {parseInt(m, 10)}</option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" /> Tổ công tác
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            >
              <option value="all">Tất cả các tổ ({allTeams.length})</option>
              {allTeams.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Search Query */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Search className="w-3 h-3 text-slate-400" /> Tìm nhân viên
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nhập họ tên nhân viên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Worker filter switch and guideline note */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyWorkerAndDeputy}
              onChange={(e) => setOnlyWorkerAndDeputy(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
            />
            <span className="font-semibold text-slate-700">
              Chỉ tính Nhân viên & Tổ phó (Quy định chế độ làm thêm)
            </span>
          </label>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>Mỗi lần nghỉ bù tối đa <b>2 ngày</b> và không vượt quá số ngày làm thêm còn lại</span>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards (Cả Đội) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Tổng ngày làm thêm */}
        <div className="bg-gradient-to-br from-purple-50 via-indigo-50/50 to-white border border-purple-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900/70">
              Tổng ngày làm thêm T7-CN
            </span>
            <span className="p-1.5 rounded-lg bg-purple-200/60 text-purple-800">
              <CalendarDays className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-purple-950 font-mono tracking-tight">
              {teamKPIs.totalOvertimeDays}
            </span>
            <span className="text-xs font-semibold text-purple-700">ngày công</span>
          </div>
          <div className="text-[11px] text-purple-800/80 mt-1">
            Toàn Đội ({teamKPIs.activeMembersCount} người tham gia)
          </div>
        </div>

        {/* Card 2: Nhân sự tham gia */}
        <div className="bg-gradient-to-br from-blue-50 via-sky-50/50 to-white border border-blue-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900/70">
              Nhân sự có làm thêm
            </span>
            <span className="p-1.5 rounded-lg bg-blue-200/60 text-blue-800">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-blue-950 font-mono tracking-tight">
              {teamKPIs.activeMembersCount}
            </span>
            <span className="text-xs font-semibold text-blue-700">nhân sự</span>
          </div>
          <div className="text-[11px] text-blue-800/80 mt-1">
            Có báo cáo ngày Thứ 7 hoặc CN
          </div>
        </div>

        {/* Card 3: Đã nghỉ bù */}
        <div className="bg-gradient-to-br from-amber-50 via-orange-50/50 to-white border border-amber-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900/70">
              Đã giải quyết nghỉ bù
            </span>
            <span className="p-1.5 rounded-lg bg-amber-200/60 text-amber-800">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-950 font-mono tracking-tight">
              {teamKPIs.totalDaNghiBu}
            </span>
            <span className="text-xs font-semibold text-amber-700">ngày</span>
          </div>
          <div className="text-[11px] text-amber-800/80 mt-1 flex items-center justify-between">
            <span>Đã ghi nhận</span>
            <span className="font-bold text-[10px] bg-amber-100/90 text-amber-900 px-1.5 py-0.5 rounded-md border border-amber-200">
              T2-T6: {teamKPIs.totalLeaveFromReports} ngày
            </span>
          </div>
        </div>

        {/* Card 4: Còn lại */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900/70">
              Còn lại cần bố trí nghỉ bù
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-200/60 text-emerald-800">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono tracking-tight">
              {teamKPIs.totalConLai}
            </span>
            <span className="text-xs font-semibold text-emerald-700">ngày công</span>
          </div>
          <div className="text-[11px] text-emerald-800/80 mt-1 flex items-center justify-between">
            <span>Tồn đọng</span>
            <span className="font-bold font-mono">Đã nghỉ {teamKPIs.rate}%</span>
          </div>
        </div>
      </div>

      {/* Team Aggregates Table (Từng Tổ) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-600" />
            Báo Cáo Tổng Hợp Theo Từng Tổ Công Tác
          </h4>
          <span className="text-[11px] text-slate-500 font-semibold">
            {teamSummaries.length} Tổ
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-2.5 w-12 text-center">STT</th>
                <th className="px-4 py-2.5">Tổ công tác</th>
                <th className="px-4 py-2.5 text-center">Nhân sự làm thêm</th>
                <th className="px-4 py-2.5 text-right">Tổng ngày làm thêm</th>
                <th className="px-4 py-2.5 text-right">Đã nghỉ bù</th>
                <th className="px-4 py-2.5 text-right" title="Nghỉ bù từ Thứ 2 đến Thứ 6 có báo cáo là Nghỉ">Nghỉ T2-T6</th>
                <th className="px-4 py-2.5 text-right">Còn lại</th>
                <th className="px-4 py-2.5 min-w-[140px]">Tỷ lệ giải quyết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamSummaries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400 italic">
                    Chưa có dữ liệu làm thêm cho kỳ báo cáo này
                  </td>
                </tr>
              ) : (
                teamSummaries.map((t, idx) => (
                  <tr key={t.team} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 text-center font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-800">
                      {t.team}
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold text-slate-700">
                      {t.memberCount} người
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-purple-900">
                      {t.overtimeDays}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-amber-800">
                      {t.daNghiBu}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-amber-900">
                      {t.leaveDaysReport > 0 ? (
                        <span className="inline-flex px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-200">
                          {t.leaveDaysReport}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-black text-emerald-700">
                      {t.conLai}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-purple-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(t.rate, 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-700 w-10 text-right">
                          {t.rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Details Table (Từng Người) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              Danh Sách Chi Tiết Từng Nhân Viên & Quản Lý Nghỉ Bù
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Hiển thị số ngày làm thêm T7-CN, ngày đã nghỉ bù (cột NghiBu) và số ngày còn lại
            </p>
          </div>

          <div className="text-xs text-slate-500 font-semibold self-start sm:self-auto">
            Tổng cộng: <b className="text-purple-700">{filteredMembers.length}</b> nhân sự
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 w-12 text-center">STT</th>
                <th className="px-4 py-3">Họ và tên</th>
                <th className="px-4 py-3">Tổ công tác</th>
                <th className="px-4 py-3">Chức danh</th>
                <th className="px-4 py-3 text-center" title="Số ngày Thứ 7, Chủ Nhật có báo cáo công tác">
                  Ngày làm thêm (T7-CN)
                </th>
                <th className="px-4 py-3 text-center" title="Số ngày đã được duyệt nghỉ bù (cột NghiBu sheet CongTac)">
                  Đã nghỉ bù
                </th>
                <th className="px-4 py-3 text-center" title="Số ngày làm thêm còn lại có thể nghỉ bù">
                  Còn lại
                </th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                    Không tìm thấy nhân viên nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m, idx) => {
                  const hasOvertime = m.overtimeDaysCount > 0;
                  const hasRemaining = m.conLai > 0;

                  return (
                    <tr key={m.name + idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase border border-slate-200">
                            {m.name.charAt(0)}
                          </span>
                          <div>
                            <div className="leading-tight">{m.name}</div>
                            {m.member?.msnv && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                MSNV: {m.member.msnv}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] border border-slate-200">
                          {m.team}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-[11px]">
                        {m.role}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                            hasOvertime ? 'bg-purple-100 text-purple-900 border border-purple-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {m.overtimeDaysCount} ngày
                          </span>
                          {hasOvertime && (
                            <button
                              onClick={() => {
                                setDetailMember(m);
                                setDetailActiveTab('overtime');
                              }}
                              className="text-[10px] text-purple-700 hover:text-purple-900 underline font-semibold cursor-pointer"
                              title="Xem danh sách các ngày làm việc T7-CN"
                            >
                              Xem ngày
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                            m.daNghiBu > 0 ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {m.daNghiBu} ngày
                          </span>
                          {m.leaveDaysReportCount > 0 && (
                            <button
                              onClick={() => {
                                setDetailMember(m);
                                setDetailActiveTab('leave');
                              }}
                              className="text-[10px] text-amber-700 hover:text-amber-900 underline font-semibold cursor-pointer inline-flex items-center gap-0.5"
                              title="Xem chi tiết các ngày đã nghỉ bù T2-T6 từ báo cáo"
                            >
                              <span>T2-T6: {m.leaveDaysReportCount} ngày</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-black ${
                          hasRemaining 
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs' 
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {m.conLai} ngày
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {canManageNghiBu ? (
                          <button
                            onClick={() => handleOpenUpdate(m)}
                            disabled={!hasRemaining}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 mx-auto shadow-2xs ${
                              hasRemaining
                                ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer hover:shadow'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            }`}
                            title={hasRemaining ? 'Cập nhật ngày nghỉ bù' : 'Hết ngày làm thêm để nghỉ bù'}
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Cập nhật nghỉ bù</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Chỉ Tổ/Đội trưởng
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cập Nhật Nghỉ Bù */}
      {updatingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-300" />
                <h3 className="font-bold text-sm sm:text-base">
                  Cập Nhật Ngày Nghỉ Bù
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUpdatingMember(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitUpdate} className="p-5 space-y-4">
              {/* Member Summary */}
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Nhân viên:</span>
                  <span className="font-bold text-slate-900 text-sm">{updatingMember.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tổ công tác:</span>
                  <span className="font-semibold text-slate-800">{updatingMember.team}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-200/80 text-center">
                  <div className="bg-white p-1.5 rounded-lg border border-purple-100">
                    <div className="text-[10px] text-slate-500">Làm thêm</div>
                    <div className="font-bold font-mono text-purple-900">{updatingMember.overtimeDaysCount} ngày</div>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-purple-100">
                    <div className="text-[10px] text-slate-500">Đã nghỉ</div>
                    <div className="font-bold font-mono text-amber-800">{updatingMember.daNghiBu} ngày</div>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-purple-100">
                    <div className="text-[10px] text-slate-500">Còn lại</div>
                    <div className="font-black font-mono text-emerald-700">{updatingMember.conLai} ngày</div>
                  </div>
                </div>
              </div>

              {/* Number of days input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Số ngày xin nghỉ bù lần này (Tối đa 2 ngày):
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {['0.5', '1', '1.5', '2'].map(val => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setAddDaysInput(val)}
                      className={`py-1.5 text-xs font-bold font-mono rounded-lg border transition-all ${
                        addDaysInput === val 
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs' 
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      +{val} ngày
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="2"
                  value={addDaysInput}
                  onChange={(e) => setAddDaysInput(e.target.value)}
                  className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder="Nhập số ngày (ví dụ: 1)"
                  required
                />
              </div>

              {/* Leave Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Ngày nghỉ bù:
                </label>
                <input
                  type="date"
                  value={leaveDateInput}
                  onChange={(e) => setLeaveDateInput(e.target.value)}
                  className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>

              {/* Leave Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Lý do / Ghi chú (tùy chọn):
                </label>
                <textarea
                  rows={2}
                  value={leaveNoteInput}
                  onChange={(e) => setLeaveNoteInput(e.target.value)}
                  placeholder="Nhập lý do nghỉ bù (ví dụ: Nghỉ bù ca làm thêm Thứ Bảy...)"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                />
              </div>

              {/* Preview calculation */}
              {parseFloat(addDaysInput) > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Cộng dồn vào cột NghiBu:</span>
                  <span className="font-bold font-mono text-purple-950">
                    {updatingMember.daNghiBu} + {addDaysInput} = {(updatingMember.daNghiBu + parseFloat(addDaysInput || '0')).toFixed(2)} ngày
                  </span>
                </div>
              )}

              {/* Status / Error Messages */}
              {modalError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUpdatingMember(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Đang lưu...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xác nhận & Ghi vào Sheet CongTac</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chi Tiết Ngày Làm Việc & Nghỉ Bù */}
      {detailMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="w-5 h-5 text-purple-300" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Chi Tiết Làm Thêm & Nghỉ Bù Nhân Viên
                  </h3>
                  <div className="text-xs text-purple-200">
                    {detailMember.name} • {detailMember.team} (Làm thêm: {detailMember.overtimeDaysCount} ngày • Đã nghỉ: {detailMember.daNghiBu} ngày)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailMember(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-slate-200 bg-slate-50/90 px-4 pt-2 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDetailActiveTab('overtime')}
                className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  detailActiveTab === 'overtime'
                    ? 'border-purple-600 text-purple-950 bg-white rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Làm thêm T7-CN ({detailMember.overtimeDaysCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailActiveTab('leave')}
                className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  detailActiveTab === 'leave'
                    ? 'border-amber-600 text-amber-950 bg-white rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Coffee className="w-3.5 h-3.5 text-amber-600" />
                <span>Đã nghỉ bù T2-T6 ({detailMember.leaveDaysReportCount})</span>
              </button>
            </div>

            {/* Content List */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-slate-100">
              {detailActiveTab === 'overtime' ? (
                detailMember.overtimeDates.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 italic text-xs">
                    Không có nhật ký làm việc ngày Thứ 7, Chủ Nhật trong kỳ này
                  </div>
                ) : (
                  detailMember.overtimeDates.map((item, idx) => {
                    const isSaturday = item.dayOfWeek === 6;
                    const formattedDate = format(parseISO(item.date), 'dd/MM/yyyy');

                    return (
                      <div key={item.date + idx} className="pt-2.5 first:pt-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              isSaturday ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {isSaturday ? 'Thứ Bảy' : 'Chủ Nhật'}
                            </span>
                            <span className="font-bold text-xs font-mono text-slate-800">
                              {formattedDate}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            #{idx + 1}
                          </span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans">
                          {item.content}
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                detailMember.leaveDates.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 italic text-xs">
                    Không có báo cáo nghỉ bù từ Thứ 2 đến Thứ 6 trong kỳ này
                  </div>
                ) : (
                  detailMember.leaveDates.map((item, idx) => {
                    const formattedDate = format(parseISO(item.date), 'dd/MM/yyyy');
                    const dowName = getDayOfWeekName(item.dayOfWeek);

                    return (
                      <div key={item.date + idx} className="pt-2.5 first:pt-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                              {dowName}
                            </span>
                            <span className="font-bold text-xs font-mono text-slate-800">
                              {formattedDate}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                              {item.days} ngày
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            #{idx + 1}
                          </span>
                        </div>
                        <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-2.5 text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                          {item.content}
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setDetailMember(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lịch Sử Duyệt Nghỉ Bù */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-300" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Lịch Sử Duyệt Nghỉ Bù Nhân Viên
                  </h3>
                  <div className="text-xs text-slate-300">
                    Ghi nhận các lần cập nhật cộng dồn số ngày nghỉ bù vào sheet CongTac
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Table */}
            <div className="p-4 overflow-y-auto flex-1">
              {historyLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 italic text-xs">
                  Chưa có lịch sử cập nhật nghỉ bù nào được lưu
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5">Thời gian</th>
                        <th className="px-3 py-2.5">Nhân viên</th>
                        <th className="px-3 py-2.5 text-center">Nghỉ bù đợt này</th>
                        <th className="px-3 py-2.5 text-center">Tổng tích lũy</th>
                        <th className="px-3 py-2.5">Người duyệt</th>
                        <th className="px-3 py-2.5">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">
                            {log.timestamp ? format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm') : log.date}
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-800">
                            {log.memberName}
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-purple-700">
                            +{log.addDays} ngày
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-amber-800">
                            {log.totalNghiBu} ngày
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {log.updatedBy}
                          </td>
                          <td className="px-3 py-2 text-slate-500 max-w-xs truncate" title={log.note}>
                            {log.note || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
