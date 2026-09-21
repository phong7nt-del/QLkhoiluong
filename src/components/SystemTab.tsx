import React, { useState, useEffect } from 'react';
import { PermissionStore, RBACConfig, ALL_ROLES, AppRole } from '../store/PermissionStore';
import { Shield, Save, CheckSquare, Square, RotateCcw, Award, UserPlus, X, Check, Info, RefreshCw, Sparkles, AlertTriangle, UserMinus, AlertOctagon, Trash2, Ban, ShieldAlert } from 'lucide-react';
import { DataStore, TuyenDuongExclusion } from '../store/DataStore';
import { APP_VERSION, APP_VERSION_DETAILS } from '../version';
import { checkLatestVersion, forceRefreshApp } from '../utils/versionSync';

const TABS_INFO = [
    { id: 'input', label: 'Cập nhật' },
    { id: 'report', label: 'Báo cáo' },
    { id: 'stations', label: 'Link báo cáo' },
    { id: 'analysis', label: 'Phân tích' },
    { id: 'disconnect', label: 'Đo xa' },
    { id: 'search', label: 'Tìm kiếm' },
    { id: 'sangtai', label: 'KT sang tải' },
    { id: 'progress', label: 'Tiến độ CV' },
    { id: 'tuti', label: 'TU - TI' },
    { id: 'plan_progress', label: 'Tiến độ kế hoạch' },
    { id: 'warehouse', label: 'Kho VTTB' },
    { id: 'birthday', label: 'Công Đoàn' },
    { id: 'system', label: 'Hệ thống' }
];

const ACTIONS_INFO = [
    { id: 'config_system', label: 'Nút Cài đặt (Bánh răng)' },
    { id: 'edit_others_workload', label: 'Chỉnh sửa/Xóa báo cáo của người khác' },
    { id: 'bao_cao_ho', label: 'Cập nhật báo cáo hộ' }
];

export default function SystemTab() {
    const [config, setConfig] = useState<RBACConfig>(PermissionStore.getConfig());
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [excludeSat, setExcludeSat] = useState(DataStore.getExcludeSaturday());
    const [excludeSun, setExcludeSun] = useState(DataStore.getExcludeSunday());
    const [excludeNghi, setExcludeNghi] = useState(DataStore.getExcludeNghi());
    const [allowAllLock, setAllowAllLock] = useState(DataStore.getAllowAllLockPlan());
    const [congDoanLeaders, setCongDoanLeaders] = useState<string[]>(DataStore.getCongDoanLeaderNames());
    const [newLeaderName, setNewLeaderName] = useState('');
    const [isCheckingVer, setIsCheckingVer] = useState(false);
    const [verMsg, setVerMsg] = useState<{ text: string; type: 'success' | 'update' | 'error' } | null>(null);

    const handleCheckVersion = async () => {
        setIsCheckingVer(true);
        setVerMsg(null);
        try {
            const res = await checkLatestVersion();
            if (res.hasUpdate) {
                setVerMsg({
                    text: `Phát hiện phiên bản mới: v${res.latestVersion} (hiện tại đang tải: v${res.currentVersion}). Hãy bấm "Xóa Cache & Ép tải lại" để cập nhật ngay.`,
                    type: 'update',
                });
            } else {
                setVerMsg({
                    text: `Hệ thống đang chạy phiên bản mới nhất trên máy chủ (v${res.currentVersion}).`,
                    type: 'success',
                });
            }
        } catch (e) {
            setVerMsg({
                text: 'Không thể kết nối máy chủ để kiểm tra phiên bản.',
                type: 'error',
            });
        } finally {
            setIsCheckingVer(false);
        }
    };

    const handleForceReload = async () => {
        await forceRefreshApp();
    };

    const handleAddLeader = () => {
        if (!newLeaderName.trim()) return;
        const trimmed = newLeaderName.trim();
        if (!congDoanLeaders.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
            const updated = [...congDoanLeaders, trimmed];
            setCongDoanLeaders(updated);
            DataStore.setCongDoanLeaderNames(updated);
        }
        setNewLeaderName('');
    };

    const handleRemoveLeader = (nameToRemove: string) => {
        const updated = congDoanLeaders.filter(n => n !== nameToRemove);
        setCongDoanLeaders(updated);
        DataStore.setCongDoanLeaderNames(updated);
    };

    // Commendation Exclusion (Đội trưởng loại cá nhân khỏi tuyên dương do vi phạm)
    const [exclusions, setExclusions] = useState<TuyenDuongExclusion[]>(DataStore.getTuyenDuongExclusions());
    const [exclMonth, setExclMonth] = useState<number>(new Date().getMonth() + 1);
    const [exclYear, setExclYear] = useState<number>(new Date().getFullYear());
    const [exclMemberName, setExclMemberName] = useState<string>('');
    const [exclReason, setExclReason] = useState<string>('');
    const [exclFilterMonth, setExclFilterMonth] = useState<string>('all');
    const [exclMsg, setExclMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const allMembers = DataStore.getMembers();

    const PRESET_INFRACTION_REASONS = [
        'Vi phạm quy trình an toàn lao động',
        'Vi phạm kỷ luật lao động / quy chế nội bộ',
        'Không tuân thủ quy trình kỹ thuật',
        'Khách hàng phản ánh thái độ / chất lượng phục vụ',
        'Nghỉ việc không phép / đi muộn vi phạm quy định',
        'Gây sự cố trong quá trình thực hiện nhiệm vụ'
    ];

    const handleAddExclusion = () => {
        setExclMsg(null);
        if (!exclMemberName.trim()) {
            setExclMsg({ type: 'error', text: 'Vui lòng chọn nhân sự cần loại khỏi danh sách tuyên dương.' });
            return;
        }
        if (!exclReason.trim()) {
            setExclMsg({ type: 'error', text: 'Vui lòng nhập lý do vi phạm / phạm lỗi cụ thể.' });
            return;
        }

        const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const already = exclusions.some(
            e => norm(e.memberName) === norm(exclMemberName) &&
                 Number(e.year) === Number(exclYear) &&
                 Number(e.month) === Number(exclMonth)
        );

        if (already) {
            setExclMsg({
                type: 'error',
                text: `Nhân sự "${exclMemberName}" đã có tên trong danh sách bị loại của Tháng ${exclMonth}/${exclYear}.`
            });
            return;
        }

        const foundMember = allMembers.find(m => m.name === exclMemberName);
        let currentUser: any = null;
        try {
            const stored = sessionStorage.getItem('workload_user_session');
            if (stored) currentUser = JSON.parse(stored);
        } catch {}

        const author = currentUser ? `${currentUser.name || currentUser.hoTen} (${currentUser.role || 'Đội trưởng'})` : 'Đội trưởng';

        DataStore.addTuyenDuongExclusion({
            year: exclYear,
            month: exclMonth,
            memberName: exclMemberName,
            team: foundMember?.team || 'Đo xa',
            reason: exclReason.trim(),
            createdBy: author
        });

        setExclusions(DataStore.getTuyenDuongExclusions());
        setExclReason('');
        setExclMemberName('');
        setExclMsg({
            type: 'success',
            text: `Đã loại nhân sự "${exclMemberName}" ra khỏi danh sách xét tuyên dương Tháng ${exclMonth}/${exclYear}.`
        });
        setTimeout(() => setExclMsg(null), 4000);
    };

    const handleRemoveExclusion = (id: string, memberName: string, month: number, year: number) => {
        if (confirm(`Bạn có chắc chắn muốn xóa hình thức kỷ luật đối với "${memberName}" (Tháng ${month}/${year}) để khôi phục quyền xét tuyên dương năng suất?`)) {
            DataStore.removeTuyenDuongExclusion(id);
            setExclusions(DataStore.getTuyenDuongExclusions());
            setExclMsg({
                type: 'success',
                text: `Đã khôi phục quyền xét tuyên dương cho nhân sự "${memberName}".`
            });
            setTimeout(() => setExclMsg(null), 3500);
        }
    };

    const handleToggleTab = (tabId: string, role: AppRole) => {
        const newConfig = { ...config };
        const currentRoles = newConfig.tabs[tabId] || [];
        if (currentRoles.includes(role)) {
            newConfig.tabs[tabId] = currentRoles.filter(r => r !== role);
        } else {
            newConfig.tabs[tabId] = [...currentRoles, role];
        }
        setConfig(newConfig);
    };

    const handleToggleAction = (actionId: string, role: AppRole) => {
        const newConfig = { ...config };
        const currentRoles = newConfig.actions[actionId] || [];
        if (currentRoles.includes(role)) {
            newConfig.actions[actionId] = currentRoles.filter(r => r !== role);
        } else {
            newConfig.actions[actionId] = [...currentRoles, role];
        }
        setConfig(newConfig);
    };

    const handleSave = () => {
        PermissionStore.saveConfig(config);
        setMessage({ type: 'success', text: 'Đã lưu cấu hình phân quyền thành công! Hãy tải lại trang để áp dụng hoàn toàn.' });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleReset = () => {
        if (confirm("Bạn có chắc chắn muốn khôi phục phân quyền về mặc định ban đầu?")) {
            const { DEFAULT_RBAC } = require('../store/PermissionStore');
            setConfig(JSON.parse(JSON.stringify(DEFAULT_RBAC)));
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full animate-fade-in">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shadow-inner">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Cấu hình Hệ thống</h2>
                        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Phân quyền chức năng</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleReset}
                        className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span className="hidden sm:inline">Khôi phục mặc định</span>
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-[#141414] hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md shadow-black/10"
                    >
                        <Save className="w-4 h-4" />
                        <span className="hidden sm:inline">Lưu cấu hình</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {message && (
                    <div className={`mb-4 p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-4 border-slate-800 pl-2">Quyền truy cập Tab</h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                                <tr>
                                    <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap sticky left-0 bg-slate-100 z-10 shadow-[1px_0_0_#e2e8f0]">Tính năng \ Vai trò</th>
                                    {ALL_ROLES.map(r => (
                                        <th key={r} className="px-4 py-3 border-b border-slate-200 text-center whitespace-nowrap">{r}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {TABS_INFO.map((tab, idx) => (
                                    <tr key={tab.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                        <td className="px-4 py-3 font-semibold text-slate-700 border-b border-slate-100 whitespace-nowrap sticky left-0 bg-inherit shadow-[1px_0_0_#e2e8f0] z-10">
                                            {tab.label}
                                        </td>
                                        {ALL_ROLES.map(role => {
                                            const isChecked = (config.tabs[tab.id] || []).includes(role);
                                            return (
                                                <td key={role} className="px-4 py-3 text-center border-b border-slate-100">
                                                    <button 
                                                        onClick={() => handleToggleTab(tab.id, role)}
                                                        className="w-full flex justify-center hover:scale-110 transition-transform"
                                                    >
                                                        {isChecked ? <CheckSquare className="w-5 h-5 text-slate-800" /> : <Square className="w-5 h-5 text-slate-300" />}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-4 border-slate-800 pl-2">Cấu hình Năng Suất</h3>
                    <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 space-y-3">
                        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors -ml-2">
                            <input 
                                type="checkbox" 
                                checked={!excludeSat} 
                                onChange={(e) => {
                                    const newVal = !e.target.checked;
                                    setExcludeSat(newVal);
                                    DataStore.setExcludeSaturday(newVal);
                                }} 
                                className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
                            />
                            <span className="font-medium text-slate-700">Tính năng suất cho ngày Thứ Bảy</span>
                        </label>
                        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors -ml-2">
                            <input 
                                type="checkbox" 
                                checked={!excludeSun} 
                                onChange={(e) => {
                                    const newVal = !e.target.checked;
                                    setExcludeSun(newVal);
                                    DataStore.setExcludeSunday(newVal);
                                }} 
                                className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
                            />
                            <span className="font-medium text-slate-700">Tính năng suất cho ngày Chủ Nhật</span>
                        </label>

                        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors -ml-2">
                            <input 
                                type="checkbox" 
                                checked={!excludeNghi} 
                                onChange={(e) => {
                                    const newVal = !e.target.checked;
                                    setExcludeNghi(newVal);
                                    DataStore.setExcludeNghi(newVal);
                                }} 
                                className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
                            />
                            <span className="font-medium text-slate-700">Tính năng suất cho các ngày nghỉ (Báo cáo nội dung: Nghỉ)</span>
                        </label>
                        
                        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors -ml-2">
                            <input 
                                type="checkbox" 
                                checked={allowAllLock} 
                                onChange={(e) => {
                                    const newVal = e.target.checked;
                                    setAllowAllLock(newVal);
                                    DataStore.setAllowAllLockPlan(newVal);
                                }} 
                                className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
                            />
                            <span className="font-medium text-slate-700">Cho phép tất cả người dùng được quyền Chốt tiến độ (KH & TH) - Nếu tắt, chỉ "Đội trưởng" hoặc "Tổ trưởng" của Tổ Tổng hợp mới được quyền chốt.</span>
                        </label>

                    </div>
                </div>

                {/* PHÂN QUYỀN CÔNG ĐOÀN (SINH NHẬT & TUYÊN DƯƠNG) */}
                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-rose-600" />
                        <h3 className="text-sm font-bold text-slate-800">Phân quyền Công Đoàn (Quyền Công Bố Sinh Nhật & Tuyên Dương)</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                        Chỉ <span className="font-bold text-slate-700">Đội trưởng / Giám đốc</span> và <span className="font-bold text-slate-700">Tổ trưởng Công đoàn</span> (hoặc cán bộ được chỉ định dưới đây) mới có thẩm quyền bấm công bố chính thức các chương trình sinh nhật và bảng vinh danh năng suất.
                    </p>

                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs font-semibold text-slate-600">Cán bộ có quyền:</span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-200">
                                👑 Đội trưởng / Giám đốc (Tự động)
                            </span>
                            {congDoanLeaders.map(name => (
                                <span key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 shadow-sm">
                                    <span>{name}</span>
                                    {name.includes('Thụy') || name.includes('Thuy') ? (
                                        <span className="text-[10px] text-rose-500 font-normal">(Tổ trưởng CĐ)</span>
                                    ) : null}
                                    <button 
                                        type="button"
                                        onClick={() => handleRemoveLeader(name)}
                                        className="hover:text-rose-900 transition-colors cursor-pointer"
                                        title="Xóa khỏi danh sách"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <input 
                                type="text"
                                value={newLeaderName}
                                onChange={e => setNewLeaderName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddLeader(); } }}
                                placeholder="Nhập họ tên cán bộ Công đoàn cần cấp quyền..."
                                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 w-full max-w-sm"
                            />
                            <button
                                type="button"
                                onClick={handleAddLeader}
                                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Thêm cán bộ</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* QUẢN LÝ LOẠI KHỎI TUYÊN DƯƠNG NĂNG SUẤT DO PHẠM LỖI */}
                <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                                <UserMinus className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                        Loại Khỏi Tuyên Dương Năng Suất (Do Phạm Lỗi / Kỷ Luật)
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[10px] tracking-wider uppercase">
                                        Quyền Đội Trưởng
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Đội trưởng có thể chủ động loại 1 hoặc nhiều người ra khỏi danh sách xét vinh danh trong tháng do vi phạm kỷ luật, an toàn dù có năng suất cao.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Notification Message */}
                    {exclMsg && (
                        <div className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                            exclMsg.type === 'success' 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                            {exclMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />}
                            <span>{exclMsg.text}</span>
                        </div>
                    )}

                    {/* Form to Add Exclusion */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-4">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-rose-600" />
                            Thiết Lập Loại Trừ Khen Thưởng Nhân Sự Trong Tháng
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                            {/* Month & Year Selection */}
                            <div className="lg:col-span-3">
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                    Tháng & Năm áp dụng
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={exclMonth}
                                        onChange={e => setExclMonth(Number(e.target.value))}
                                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <option key={m} value={m}>Tháng {m}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={exclYear}
                                        onChange={e => setExclYear(Number(e.target.value))}
                                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                    >
                                        {[2024, 2025, 2026, 2027].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Member Selection */}
                            <div className="lg:col-span-4">
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                    Chọn nhân sự vi phạm ({allMembers.length} nhân sự)
                                </label>
                                <select
                                    value={exclMemberName}
                                    onChange={e => setExclMemberName(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                >
                                    <option value="">-- Chọn nhân sự cần loại trừ --</option>
                                    {allMembers.map(m => (
                                        <option key={m.name} value={m.name}>
                                            {m.name} ({m.team || 'Đo xa'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Reason for infraction */}
                            <div className="lg:col-span-5">
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                    Lý do vi phạm lỗi / kỷ luật
                                </label>
                                <input
                                    type="text"
                                    value={exclReason}
                                    onChange={e => setExclReason(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddExclusion(); } }}
                                    placeholder="VD: Vi phạm quy trình an toàn, kỷ luật lao động..."
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Quick Preset Buttons */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                            <span className="text-[11px] text-slate-400 font-medium">Gợi ý lý do nhanh:</span>
                            {PRESET_INFRACTION_REASONS.map((preset, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setExclReason(preset)}
                                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 transition-colors cursor-pointer border border-slate-200"
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>

                        <div className="mt-3 flex justify-end">
                            <button
                                type="button"
                                onClick={handleAddExclusion}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                                <UserMinus className="w-4 h-4" />
                                <span>Xác Nhận Loại Khỏi Tuyên Dương Tháng {exclMonth}/{exclYear}</span>
                            </button>
                        </div>
                    </div>

                    {/* Exclusions List */}
                    <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                    Danh Sách Nhân Sự Đang Bị Loại Trừ ({exclusions.length})
                                </h4>
                                <span className="text-[11px] text-slate-500">
                                    (Những nhân sự này sẽ không xuất hiện trên bảng vinh danh Top 3)
                                </span>
                            </div>

                            <div className="flex items-center gap-1">
                                <select
                                    value={exclFilterMonth}
                                    onChange={e => setExclFilterMonth(e.target.value)}
                                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none"
                                >
                                    <option value="all">Xem tất cả các tháng</option>
                                    <option value="selected">Chỉ Tháng {exclMonth}/{exclYear}</option>
                                </select>
                            </div>
                        </div>

                        {(() => {
                            const filteredExclusions = exclusions.filter(e => {
                                if (exclFilterMonth === 'selected') {
                                    return Number(e.year) === Number(exclYear) && Number(e.month) === Number(exclMonth);
                                }
                                return true;
                            });

                            if (filteredExclusions.length === 0) {
                                return (
                                    <div className="p-5 text-center bg-white rounded-xl border border-slate-200/80 text-slate-500">
                                        <Check className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                                        <p className="text-xs font-semibold text-slate-700">
                                            {exclFilterMonth === 'selected' 
                                                ? `Không có nhân sự nào bị loại trong Tháng ${exclMonth}/${exclYear}`
                                                : 'Hiện không có nhân sự nào bị loại khỏi danh sách tuyên dương.'
                                            }
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            Mọi nhân sự đạt năng suất xuất sắc đều đủ điều kiện xét Top 3 vinh danh.
                                        </p>
                                    </div>
                                );
                            }

                            return (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                                            <tr>
                                                <th className="py-2.5 px-3">Thời Gian</th>
                                                <th className="py-2.5 px-3">Họ Và Tên</th>
                                                <th className="py-2.5 px-3">Đơn Vị / Tổ</th>
                                                <th className="py-2.5 px-3">Lý Do Vi Phạm Lỗi</th>
                                                <th className="py-2.5 px-3">Người Ghi Nhận</th>
                                                <th className="py-2.5 px-3 text-center">Thao Tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredExclusions.map(ex => (
                                                <tr key={ex.id} className="hover:bg-rose-50/40 transition-colors">
                                                    <td className="py-2 px-3 whitespace-nowrap font-bold text-slate-700">
                                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-mono text-[11px]">
                                                            {ex.month > 0 ? `T${ex.month}/${ex.year}` : `Năm ${ex.year}`}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3 font-extrabold text-slate-900 whitespace-nowrap">
                                                        <span className="text-rose-700 mr-1">⛔</span> {ex.memberName}
                                                    </td>
                                                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                                                        {ex.team || 'Đo xa'}
                                                    </td>
                                                    <td className="py-2 px-3 text-slate-800 font-medium">
                                                        <span className="inline-block px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                                                            {ex.reason}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                                                        <div className="font-semibold text-slate-700">{ex.createdBy || 'Đội trưởng'}</div>
                                                        <div className="text-[10px] text-slate-400">{ex.createdAt}</div>
                                                    </td>
                                                    <td className="py-2 px-3 text-center whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveExclusion(ex.id, ex.memberName, ex.month, ex.year)}
                                                            className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                                            title="Gỡ bỏ kỷ luật / Khôi phục quyền xét tuyên dương"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-4 border-slate-800 pl-2">Quyền Thao tác (Functions)</h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                                <tr>
                                    <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap sticky left-0 bg-slate-100 z-10 shadow-[1px_0_0_#e2e8f0]">Tính năng \ Vai trò</th>
                                    {ALL_ROLES.map(r => (
                                        <th key={r} className="px-4 py-3 border-b border-slate-200 text-center whitespace-nowrap">{r}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ACTIONS_INFO.map((action, idx) => (
                                    <tr key={action.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                        <td className="px-4 py-3 font-semibold text-slate-700 border-b border-slate-100 whitespace-nowrap sticky left-0 bg-inherit shadow-[1px_0_0_#e2e8f0] z-10">
                                            {action.label}
                                        </td>
                                        {ALL_ROLES.map(role => {
                                            const isChecked = (config.actions[action.id] || []).includes(role);
                                            return (
                                                <td key={role} className="px-4 py-3 text-center border-b border-slate-100">
                                                    <button 
                                                        onClick={() => handleToggleAction(action.id, role)}
                                                        className="w-full flex justify-center hover:scale-110 transition-transform"
                                                    >
                                                        {isChecked ? <CheckSquare className="w-5 h-5 text-slate-800" /> : <Square className="w-5 h-5 text-slate-300" />}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Thông tin Phiên bản Hệ thống & Đồng bộ */}
                <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg border border-slate-700">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                                <Info className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-base text-white">Phiên bản Hệ thống</h3>
                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono font-black text-xs shadow-sm">
                                        v{APP_VERSION}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-300 mt-1">
                                    Cấu trúc phiên bản tự động: <span className="font-mono text-amber-300 font-bold">Năm.Tháng.Ngày.Số</span> (trong đó Năm, Tháng, Ngày là ngày hiện tại, Số là số thứ tự tự động tăng lên sau mỗi lần cập nhật).
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:items-end gap-2 shrink-0">
                            <div className="text-xs font-mono text-slate-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                                <span className="text-slate-400">Lần cập nhật gần nhất:</span>{' '}
                                <span className="text-white font-bold">{APP_VERSION_DETAILS.formattedTime}</span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={handleCheckVersion}
                                    disabled={isCheckingVer}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-medium rounded-xl border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    title="Kiểm tra xem máy chủ có bản mới hơn không"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingVer ? 'animate-spin text-amber-400' : 'text-slate-300'}`} />
                                    <span>{isCheckingVer ? 'Đang kiểm tra...' : 'Kiểm tra bản mới'}</span>
                                </button>

                                <button
                                    onClick={handleForceReload}
                                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                                    title="Xóa bộ nhớ đệm (Cache) của trình duyệt và tải lại ứng dụng mới nhất"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-yellow-100" />
                                    <span>Xóa Cache & Đồng bộ</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {verMsg && (
                        <div
                            className={`mt-4 p-3 rounded-xl text-xs flex items-center justify-between gap-3 ${
                                verMsg.type === 'update'
                                    ? 'bg-orange-500/20 text-orange-200 border border-orange-500/40'
                                    : verMsg.type === 'success'
                                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                                    : 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                {verMsg.type === 'update' ? (
                                    <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
                                ) : verMsg.type === 'success' ? (
                                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                ) : (
                                    <X className="w-4 h-4 text-rose-400 shrink-0" />
                                )}
                                <span>{verMsg.text}</span>
                            </div>
                            {verMsg.type === 'update' && (
                                <button
                                    onClick={handleForceReload}
                                    className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs shrink-0 cursor-pointer shadow"
                                >
                                    Ép tải lại ngay
                                </button>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
