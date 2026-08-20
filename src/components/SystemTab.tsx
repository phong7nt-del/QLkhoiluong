import React, { useState, useEffect } from 'react';
import { PermissionStore, RBACConfig, ALL_ROLES, AppRole } from '../store/PermissionStore';
import { Shield, Save, CheckSquare, Square, RotateCcw } from 'lucide-react';

const TABS_INFO = [
    { id: 'input', label: 'Cập nhật' },
    { id: 'report', label: 'Báo cáo' },
    { id: 'stations', label: 'Link báo cáo' },
    { id: 'analysis', label: 'Phân tích' },
    { id: 'disconnect', label: 'Đo xa' },
    { id: 'search', label: 'Tìm kiếm' },
    { id: 'sangtai', label: 'KT sang tải' },
    { id: 'progress', label: 'Tiến độ CV' },
    { id: 'tuti', label: 'KT TU - TI' },
    { id: 'plan_progress', label: 'Tiến độ kế hoạch' },
    { id: 'warehouse', label: 'Kho VTTB' },
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

            </div>
        </div>
    );
}
