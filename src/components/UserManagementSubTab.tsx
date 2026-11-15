import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  X,
  Save,
  Copy,
  Check,
  FileSpreadsheet,
  Info,
  Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { DataStore, SheetMember } from '../store/DataStore';
import { SCRIPT_TEMPLATE } from './ConfigModal';

interface UserManagementSubTabProps {
  sessionUser?: SheetMember | null;
  onOpenAppsScript?: () => void;
}

const DEFAULT_DEPARTMENTS = [
  'Tổ Tổng hợp',
  'Tổ Treo tháo 1',
  'Tổ Treo tháo 2',
  'Tổ Treo tháo 3',
  'Tổ Treo tháo 4',
  'Tổ Tăng cường',
  'Tổ Đo xa',
  'DVKH',
  'KD'
];

const DEFAULT_ROLES = [
  'Nhân viên',
  'Tổ phó',
  'Tổ trưởng',
  'Đội phó',
  'Đội trưởng',
  'Phó Giám đốc',
  'Giám đốc'
];

const DEFAULT_TEAMS = [
  'Tổng hợp',
  'Vũng Tàu',
  'Bà Rịa',
  'Phú Mỹ',
  'Tăng cường',
  'Đo xa',
  'Côn Đảo',
  'DVKH',
  'KD'
];

interface UserFormState {
  stt: string;
  msnv: string;
  name: string;
  boPhanCongTac: string;
  role: string;
  team: string;
  sinhNhat: string;
  trangThai: '1' | '0';
}

const EMPTY_FORM: UserFormState = {
  stt: '',
  msnv: '',
  name: '',
  boPhanCongTac: '',
  role: 'Nhân viên',
  team: 'Vũng Tàu',
  sinhNhat: '',
  trangThai: '1'
};

export default function UserManagementSubTab({
  sessionUser,
  onOpenAppsScript
}: UserManagementSubTabProps) {
  const [members, setMembers] = useState<SheetMember[]>(() => DataStore.getMembers());
  const [reportCountVersion, setReportCountVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingUserKey, setTogglingUserKey] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | '1' | '0'>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // Notifications
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);
  const [needsScriptDeploy, setNeedsScriptDeploy] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Add/Edit Modal
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingOriginal, setEditingOriginal] = useState<SheetMember | null>(null);
  const [formState, setFormState] = useState<UserFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<{
    member: SheetMember;
    reportCount: number;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadUsersFromSheet = async (showSuccessToast = true) => {
    setIsLoading(true);
    try {
      const res = await DataStore.fetchCongTacUsers();
      setMembers(res.members);
      setReportCountVersion((v) => v + 1);
      if (res.source === 'sheet') {
        if (showSuccessToast) {
          setFeedback({
            type: 'success',
            text: `Đã đồng bộ ${res.members.length} người dùng từ sheet CongTac (cột A → H).`
          });
        }
      } else if (res.error) {
        setFeedback({
          type: 'warning',
          text: `Đang dùng danh sách cache (${res.members.length} người dùng): ${res.error}`
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Lỗi tải danh sách người dùng từ sheet CongTac.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsersFromSheet(false);

    const onUpdated = () => {
      setMembers(DataStore.getMembers());
      setReportCountVersion((v) => v + 1);
    };
    window.addEventListener('workload_updated', onUpdated);
    return () => window.removeEventListener('workload_updated', onUpdated);
  }, []);

  // Report counts map keyed by normalized user name
  const reportCountsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of members) {
      const key = DataStore.normalizeUserKey(m.name);
      if (key && !map.has(key)) {
        map.set(key, DataStore.getMemberDailyReportCount(m.name));
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, reportCountVersion]);

  const getReportCount = (name?: string) => {
    const key = DataStore.normalizeUserKey(name);
    return key ? reportCountsMap.get(key) || 0 : 0;
  };

  // Distinct dropdown options
  const teamOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_TEAMS);
    members.forEach((m) => {
      if (m.team && m.team !== 'Không xác định') set.add(m.team);
    });
    return Array.from(set);
  }, [members]);

  const deptOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_DEPARTMENTS);
    members.forEach((m) => {
      const d = (m.boPhanCongTac || m.boPhan || '').trim();
      if (d) set.add(d);
    });
    return Array.from(set);
  }, [members]);

  const roleOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_ROLES);
    members.forEach((m) => {
      if (m.role && m.role.trim()) set.add(m.role.trim());
    });
    return Array.from(set);
  }, [members]);

  // Summary metrics
  const stats = useMemo(() => {
    let active = 0;
    let locked = 0;
    let withReports = 0;
    for (const m of members) {
      if (DataStore.isMemberActive(m)) active++;
      else locked++;
      if (getReportCount(m.name) > 0) withReports++;
    }
    return {
      total: members.length,
      active,
      locked,
      withReports
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, reportCountsMap]);

  // Filtered list
  const filteredMembers = useMemo(() => {
    const q = DataStore.normalizeUserKey(searchQuery);
    return members.filter((m) => {
      const status = DataStore.normalizeTrangThai(m.trangThai);
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;
      if (teamFilter !== 'ALL' && (m.team || '') !== teamFilter) return false;
      const dept = (m.boPhanCongTac || m.boPhan || '').trim();
      if (deptFilter !== 'ALL' && dept !== deptFilter) return false;
      if (q) {
        const hay = DataStore.normalizeUserKey(
          `${m.stt || ''} ${m.msnv || ''} ${m.name || ''} ${dept} ${m.role || ''} ${m.team || ''}`
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [members, searchQuery, statusFilter, teamFilter, deptFilter]);

  const sessionUserKey = DataStore.normalizeUserKey(sessionUser?.name);

  const openAddModal = () => {
    const maxStt = members.reduce((max, m) => {
      const n = parseInt(String(m.stt || '0'), 10);
      return !isNaN(n) && n > max ? n : max;
    }, members.length);

    setModalMode('add');
    setEditingOriginal(null);
    setFormState({
      ...EMPTY_FORM,
      stt: String(maxStt + 1)
    });
    setFormError(null);
  };

  const openEditModal = (member: SheetMember) => {
    setModalMode('edit');
    setEditingOriginal(member);
    setFormState({
      stt: member.stt !== undefined ? String(member.stt) : '',
      msnv: member.msnv || '',
      name: member.name || '',
      boPhanCongTac: member.boPhanCongTac || member.boPhan || '',
      role: member.role || 'Nhân viên',
      team: member.team || '',
      sinhNhat: member.sinhNhat || '',
      trangThai: DataStore.normalizeTrangThai(member.trangThai)
    });
    setFormError(null);
  };

  const closeFormModal = () => {
    if (isSubmitting) return;
    setModalMode(null);
    setEditingOriginal(null);
    setFormError(null);
  };

  const normalizeBirthdayInput = (raw: string): { valid: boolean; value: string } => {
    const cleaned = raw.trim();
    if (!cleaned) return { valid: true, value: '' };
    const normalized = cleaned.replace(/[\-\.]/g, '/');
    const parts = normalized.split('/').map((p) => p.trim());
    if (parts.length !== 3) return { valid: false, value: cleaned };
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (isNaN(d) || isNaN(m) || isNaN(y) || d < 1 || d > 31 || m < 1 || m > 12 || y < 1940 || y > 2025) {
      return { valid: false, value: cleaned };
    }
    return {
      valid: true,
      value: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${String(y).padStart(4, '0')}`
    };
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formState.name.trim();
    const trimmedMsnv = formState.msnv.trim();
    if (!trimmedName) {
      setFormError('Vui lòng nhập Họ và tên (Cột C).');
      return;
    }
    if (!trimmedMsnv) {
      setFormError('Vui lòng nhập Mã nhân viên (Cột B) để người dùng đăng nhập.');
      return;
    }

    const snCheck = normalizeBirthdayInput(formState.sinhNhat);
    if (!snCheck.valid) {
      setFormError('Ngày sinh (Cột G) không hợp lệ. Định dạng chuẩn: dd/mm/yyyy (ví dụ 15/08/1992).');
      return;
    }

    const targetKey = DataStore.normalizeUserKey(trimmedName);
    const origKey = editingOriginal ? DataStore.normalizeUserKey(editingOriginal.name) : '';

    if (modalMode === 'add') {
      const dup = members.find((m) => DataStore.normalizeUserKey(m.name) === targetKey);
      if (dup) {
        setFormError(`Người dùng "${dup.name}" đã tồn tại trong danh sách.`);
        return;
      }
    } else if (modalMode === 'edit' && targetKey !== origKey) {
      const dup = members.find((m) => DataStore.normalizeUserKey(m.name) === targetKey);
      if (dup) {
        setFormError(`Họ và tên "${dup.name}" đã tồn tại ở dòng khác.`);
        return;
      }
    }

    // Bảo vệ không tự khóa chính mình
    if (
      modalMode === 'edit' &&
      origKey &&
      origKey === sessionUserKey &&
      formState.trangThai === '0'
    ) {
      setFormError('Không thể tự khóa tài khoản đang đăng nhập của chính bạn.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadUser: Partial<SheetMember> = {
        stt: formState.stt.trim() || (modalMode === 'add' ? members.length + 1 : editingOriginal?.stt),
        msnv: trimmedMsnv,
        name: trimmedName,
        boPhanCongTac: formState.boPhanCongTac.trim(),
        role: formState.role.trim() || 'Nhân viên',
        team: formState.team.trim() || 'Không xác định',
        sinhNhat: snCheck.value,
        trangThai: formState.trangThai
      };

      const res = await DataStore.saveCongTacUser(
        modalMode === 'add' ? 'add' : 'update',
        {
          user: payloadUser,
          originalName: editingOriginal?.name,
          originalMsnv: editingOriginal?.msnv
        }
      );

      if (!res.success) {
        setFormError(res.error || 'Lưu người dùng thất bại.');
        return;
      }

      setMembers(res.members);
      if (res.needsScriptDeploy) {
        setNeedsScriptDeploy(true);
      }

      setFeedback({
        type: res.sheetSynced ? 'success' : 'warning',
        text: res.sheetSynced
          ? modalMode === 'add'
            ? `Đã thêm người dùng "${trimmedName}" vào sheet CongTac (cột A → H).`
            : `Đã cập nhật thông tin "${trimmedName}" trên sheet CongTac (cột A → H).`
          : `Đã lưu "${trimmedName}" vào máy chủ ứng dụng. Cần cập nhật Google Apps Script để ghi trực tiếp về Google Sheet CongTac.`
      });

      setModalMode(null);
      setEditingOriginal(null);
    } catch (err: any) {
      setFormError(err?.message || 'Đã xảy ra lỗi khi lưu người dùng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLock = async (member: SheetMember) => {
    const key = DataStore.normalizeUserKey(member.name);
    if (!key) return;
    if (key === sessionUserKey) {
      setFeedback({
        type: 'error',
        text: 'Không thể tự khóa tài khoản đang đăng nhập của chính bạn.'
      });
      return;
    }

    const currentStatus = DataStore.normalizeTrangThai(member.trangThai);
    const nextStatus: '1' | '0' = currentStatus === '1' ? '0' : '1';

    setTogglingUserKey(key);
    try {
      const res = await DataStore.saveCongTacUser('toggle_lock', {
        user: { ...member, trangThai: nextStatus },
        originalName: member.name,
        originalMsnv: member.msnv,
        trangThai: nextStatus
      });

      if (!res.success) {
        setFeedback({
          type: 'error',
          text: res.error || 'Không thể thay đổi trạng thái khóa người dùng.'
        });
        return;
      }

      setMembers(res.members);
      if (res.needsScriptDeploy) {
        setNeedsScriptDeploy(true);
      }

      setFeedback({
        type: res.sheetSynced ? 'success' : 'warning',
        text:
          nextStatus === '0'
            ? `Đã KHÓA tài khoản "${member.name}" (TrangThai = 0). Người dùng này sẽ không thể đăng nhập.`
            : `Đã MỞ KHÓA tài khoản "${member.name}" (TrangThai = 1).`
      });
    } finally {
      setTogglingUserKey(null);
    }
  };

  const openDeleteModal = (member: SheetMember) => {
    const key = DataStore.normalizeUserKey(member.name);
    if (key === sessionUserKey) {
      setFeedback({
        type: 'error',
        text: 'Không thể tự xóa tài khoản đang đăng nhập của chính bạn.'
      });
      return;
    }
    const reportCount = getReportCount(member.name);
    setDeleteTarget({ member, reportCount });
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { member, reportCount } = deleteTarget;

    if (reportCount > 0) {
      setDeleteError(
        `Người dùng "${member.name}" đã có ${reportCount} dữ liệu báo cáo ngày nên không thể xóa. Vui lòng dùng tính năng Khóa (TrangThai = 0) để giữ toàn vẹn dữ liệu.`
      );
      return;
    }

    setIsSubmitting(true);
    setDeleteError(null);
    try {
      const res = await DataStore.saveCongTacUser('delete', {
        user: member,
        originalName: member.name,
        originalMsnv: member.msnv
      });

      if (!res.success) {
        setDeleteError(res.error || 'Không thể xóa người dùng.');
        return;
      }

      setMembers(res.members);
      if (res.needsScriptDeploy) {
        setNeedsScriptDeploy(true);
      }

      setFeedback({
        type: res.sheetSynced ? 'success' : 'warning',
        text: `Đã xóa người dùng "${member.name}" khỏi danh sách CongTac.`
      });
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Lỗi khi xóa người dùng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    const rows = filteredMembers.map((m, idx) => [
      m.stt ?? idx + 1,
      m.msnv || '',
      m.name || '',
      m.boPhanCongTac || m.boPhan || '',
      m.role || '',
      m.team || '',
      m.sinhNhat || '',
      Number(DataStore.normalizeTrangThai(m.trangThai))
    ]);

    const header = [
      'STT',
      'Mã nhân viên',
      'Họ và tên',
      'Bộ phận công tác',
      'Chức danh, công việc',
      'Khu vực',
      'SinhNhat',
      'TrangThai'
    ];

    const wsData = [header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Style header row
    for (let c = 0; c < header.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '0F172A' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'CBD5E1' } },
            bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
            left: { style: 'thin', color: { rgb: 'CBD5E1' } },
            right: { style: 'thin', color: { rgb: 'CBD5E1' } }
          }
        };
      }
    }

    ws['!cols'] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 26 },
      { wch: 18 },
      { wch: 24 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CongTac_AH');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Danh_sach_nguoi_dung_CongTac_${dateStr}.xlsx`);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner & Guide */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Quản lý người dùng (Sheet CongTac — Cột A đến H)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Quản lý thêm, sửa, xóa và khóa/mở khóa tài khoản qua cột{' '}
              <span className="font-mono font-bold text-indigo-700">TrangThai</span> (
              <span className="font-bold text-emerald-700">1 = Đang hoạt động</span>,{' '}
              <span className="font-bold text-rose-700">0 = Bị khóa</span>). Tài khoản đã phát sinh dữ liệu báo cáo ngày sẽ được bảo vệ{' '}
              <span className="font-semibold text-amber-700">không cho phép xóa</span>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => loadUsersFromSheet(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Tải lại từ CongTac</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel (A→H)</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#141414] hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Thêm người dùng</span>
          </button>
        </div>
      </div>

      {/* Warning banner if Apps Script needs re-deploy */}
      {needsScriptDeploy && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Google Apps Script trên Google Sheet chưa có hành động{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">manage_congtac_user</code>
              </p>
              <p className="text-amber-800 mt-0.5">
                Thay đổi đã được lưu tức thì trên hệ thống ứng dụng. Để đồng bộ ngược về file Google Sheet{' '}
                <strong>CongTac (cột A→H)</strong>, vui lòng copy mã Apps Script mới và Deploy lại trên Google Apps Script.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyScript}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedScript ? 'Đã chép mã!' : 'Copy Apps Script'}</span>
            </button>
            {onOpenAppsScript && (
              <button
                type="button"
                onClick={onOpenAppsScript}
                className="px-2.5 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold cursor-pointer"
              >
                Mở hướng dẫn
              </button>
            )}
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : feedback.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : feedback.type === 'info'
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : feedback.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : feedback.type === 'info' ? (
              <Info className="w-4 h-4 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng người dùng</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Đồng bộ từ sheet CongTac</div>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Đang hoạt động (1)</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.active}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Được phép đăng nhập</div>
        </div>
        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Đang bị khóa (0)</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{stats.locked}</div>
          <div className="text-[11px] text-rose-600 mt-0.5">Chặn đăng nhập hệ thống</div>
        </div>
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Đã có BC ngày</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{stats.withReports}</div>
          <div className="text-[11px] text-amber-700 mt-0.5">Được khóa, không được xóa</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên, Mã NV, chức danh..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | '1' | '0')}
          className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">Tất cả trạng thái (TrangThai)</option>
          <option value="1">1 — Đang hoạt động</option>
          <option value="0">0 — Đã bị khóa</option>
        </select>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">Tất cả Khu vực (Cột F)</option>
          {teamOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">Tất cả Bộ phận công tác (Cột D)</option>
          {deptOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Users Table (Columns A -> H) */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                <th className="py-3 px-2.5 text-center w-12">A: STT</th>
                <th className="py-3 px-2.5">B: Mã NV</th>
                <th className="py-3 px-3">C: Họ và tên</th>
                <th className="py-3 px-2.5">D: Bộ phận CT</th>
                <th className="py-3 px-2.5">E: Chức danh, CV</th>
                <th className="py-3 px-2.5">F: Khu vực</th>
                <th className="py-3 px-2.5 text-center">G: Sinh nhật</th>
                <th className="py-3 px-2.5 text-center">H: TrangThai</th>
                <th className="py-3 px-2.5 text-center">BC ngày</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500">
                    Không tìm thấy người dùng nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m, idx) => {
                  const key = DataStore.normalizeUserKey(m.name);
                  const isActive = DataStore.isMemberActive(m);
                  const reportCount = getReportCount(m.name);
                  const isSelf = key === sessionUserKey;
                  const isToggling = togglingUserKey === key;

                  return (
                    <tr
                      key={`${key || 'row'}-${idx}`}
                      className={`transition-colors ${
                        !isActive ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-500 font-semibold">
                        {m.stt ?? idx + 1}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono font-bold text-slate-700 whitespace-nowrap">
                        {m.msnv || <span className="text-slate-300 italic">Trống</span>}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{m.name}</span>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-100 text-indigo-700 rounded">
                              Bạn
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-700 whitespace-nowrap">
                        {m.boPhanCongTac || m.boPhan || '-'}
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-700 whitespace-nowrap">
                        {m.role || 'Nhân viên'}
                      </td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                          {m.team || 'Không xác định'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-600 whitespace-nowrap">
                        {m.sinhNhat || '-'}
                      </td>
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            1 • Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-200">
                            <Lock className="w-3 h-3" />
                            0 • Đã khóa
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        {reportCount > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200"
                            title={`Đã có ${reportCount} dòng dữ liệu báo cáo ngày — không thể xóa`}
                          >
                            {reportCount} ngày
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Chưa có</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(m)}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
                            title="Sửa thông tin (Cột A → H)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={isSelf || isToggling}
                            onClick={() => handleToggleLock(m)}
                            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                              isSelf
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : isActive
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 cursor-pointer'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 cursor-pointer'
                            }`}
                            title={
                              isSelf
                                ? 'Không thể tự khóa tài khoản đang đăng nhập'
                                : isActive
                                ? 'Khóa tài khoản (đặt TrangThai = 0)'
                                : 'Mở khóa tài khoản (đặt TrangThai = 1)'
                            }
                          >
                            {isToggling ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : isActive ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Khóa</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Mở khóa</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(m)}
                            disabled={isSelf}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isSelf
                                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                : reportCount > 0
                                ? 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-amber-50 hover:text-amber-700 cursor-pointer'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer'
                            }`}
                            title={
                              isSelf
                                ? 'Không thể xóa tài khoản đang đăng nhập'
                                : reportCount > 0
                                ? `Đã có ${reportCount} dữ liệu báo cáo ngày — không thể xóa`
                                : 'Xóa người dùng'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap justify-between items-center gap-2">
          <span>
            Đang hiển thị <strong className="text-slate-800">{filteredMembers.length}</strong> /{' '}
            <strong className="text-slate-800">{members.length}</strong> người dùng
          </span>
          <span className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Mọi thao tác chỉ cập nhật cột A → H trên sheet <strong>CongTac</strong>, bảo toàn cột I (NghiBu) và các cột ngày báo cáo (J+).
          </span>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {modalMode === 'add' ? <UserPlus className="w-5 h-5 text-emerald-400" /> : <Edit2 className="w-5 h-5 text-blue-400" />}
                <div>
                  <h3 className="text-sm sm:text-base font-bold">
                    {modalMode === 'add'
                      ? 'Thêm người dùng mới (Sheet CongTac: A → H)'
                      : `Chỉnh sửa người dùng: ${editingOriginal?.name}`}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Dữ liệu tương ứng 8 cột đầu (A → H) trong sheet CongTac
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                disabled={isSubmitting}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Cột A: STT
                  </label>
                  <input
                    type="text"
                    value={formState.stt}
                    onChange={(e) => setFormState((s) => ({ ...s, stt: e.target.value }))}
                    placeholder="Ví dụ: 93"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Cột B: Mã nhân viên (Mật khẩu) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formState.msnv}
                    onChange={(e) => setFormState((s) => ({ ...s, msnv: e.target.value }))}
                    placeholder="Ví dụ: 012345"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Cột C: Họ và tên (User đăng nhập) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Cột D: Bộ phận công tác
                  </label>
                  <input
                    type="text"
                    list="user-mgmt-dept-list"
                    value={formState.boPhanCongTac}
                    onChange={(e) => setFormState((s) => ({ ...s, boPhanCongTac: e.target.value }))}
                    placeholder="Chọn hoặc nhập bộ phận..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                  <datalist id="user-mgmt-dept-list">
                    {deptOptions.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Cột E: Chức danh, công việc
                  </label>
                  <input
                    type="text"
                    list="user-mgmt-role-list"
                    value={formState.role}
                    onChange={(e) => setFormState((s) => ({ ...s, role: e.target.value }))}
                    placeholder="Chọn hoặc nhập chức danh..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                  <datalist id="user-mgmt-role-list">
                    {roleOptions.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Cột F: Khu vực
                  </label>
                  <input
                    type="text"
                    list="user-mgmt-team-list"
                    value={formState.team}
                    onChange={(e) => setFormState((s) => ({ ...s, team: e.target.value }))}
                    placeholder="Chọn hoặc nhập khu vực..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                  <datalist id="user-mgmt-team-list">
                    {teamOptions.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Cột G: SinhNhat (dd/mm/yyyy)
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={formState.sinhNhat}
                      onChange={(e) => setFormState((s) => ({ ...s, sinhNhat: e.target.value }))}
                      placeholder="dd/mm/yyyy (vd: 15/08/1992)"
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Cột H: TrangThai
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setFormState((s) => ({ ...s, trangThai: '1' }))}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        formState.trangThai === '1'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-200'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 ${
                          formState.trangThai === '1' ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      />
                      <div>
                        <div className="text-xs font-bold">1 — Đang hoạt động</div>
                        <div className="text-[10px] opacity-80">Cho phép đăng nhập & sử dụng app</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormState((s) => ({ ...s, trangThai: '0' }))}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        formState.trangThai === '0'
                          ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-200'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Lock
                        className={`w-4 h-4 shrink-0 ${
                          formState.trangThai === '0' ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      />
                      <div>
                        <div className="text-xs font-bold">0 — Bị khóa</div>
                        <div className="text-[10px] opacity-80">Chặn đăng nhập, giữ lại dữ liệu</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  Khi lưu, hệ thống chỉ ghi vào <strong>cột A đến H</strong> của sheet <strong>CongTac</strong>. Cột I (NghiBu) và các cột ngày báo cáo (từ cột J trở đi) được giữ nguyên tuyệt đối.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#141414] hover:bg-black text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{isSubmitting ? 'Đang lưu...' : modalMode === 'add' ? 'Thêm người dùng' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className={`px-5 py-4 text-white flex items-center justify-between ${
                deleteTarget.reportCount > 0 ? 'bg-amber-600' : 'bg-rose-600'
              }`}
            >
              <div className="flex items-center gap-2">
                {deleteTarget.reportCount > 0 ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
                <h3 className="text-sm font-bold">
                  {deleteTarget.reportCount > 0
                    ? 'Không thể xóa người dùng'
                    : 'Xác nhận xóa người dùng'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setDeleteTarget(null)}
                className="p-1 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-700">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div>
                  <span className="text-slate-500">Họ và tên:</span>{' '}
                  <strong className="text-slate-900">{deleteTarget.member.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Mã nhân viên:</span>{' '}
                  <strong className="font-mono text-slate-900">{deleteTarget.member.msnv || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Khu vực / Chức danh:</span>{' '}
                  <strong>
                    {deleteTarget.member.team} • {deleteTarget.member.role}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Dữ liệu báo cáo ngày:</span>{' '}
                  <strong
                    className={
                      deleteTarget.reportCount > 0 ? 'text-amber-700' : 'text-emerald-700'
                    }
                  >
                    {deleteTarget.reportCount > 0
                      ? `${deleteTarget.reportCount} ngày đã báo cáo`
                      : 'Chưa có dữ liệu báo cáo ngày'}
                  </strong>
                </div>
              </div>

              {deleteTarget.reportCount > 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium leading-relaxed">
                  Theo quy định bảo toàn dữ liệu, người dùng đã có dữ liệu báo cáo ngày{' '}
                  <strong>không được phép xóa</strong>. Bạn hãy sử dụng nút{' '}
                  <strong>Khóa (TrangThai = 0)</strong> để ngừng quyền truy cập mà vẫn giữ nguyên lịch sử báo cáo.
                </div>
              ) : (
                <p className="leading-relaxed">
                  Bạn có chắc chắn muốn xóa vĩnh viễn người dùng{' '}
                  <strong>{deleteTarget.member.name}</strong> khỏi sheet <strong>CongTac</strong>? Thao tác này không thể hoàn tác.
                </p>
              )}

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-start gap-2">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Đóng
                </button>
                {deleteTarget.reportCount > 0 ? (
                  DataStore.isMemberActive(deleteTarget.member) && (
                    <button
                      type="button"
                      onClick={async () => {
                        const target = deleteTarget.member;
                        setDeleteTarget(null);
                        await handleToggleLock(target);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Khóa tài khoản (TrangThai = 0)</span>
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isSubmitting ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
