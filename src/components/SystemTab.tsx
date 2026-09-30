import React, { useState, useEffect } from 'react';
import { PermissionStore, RBACConfig, ALL_ROLES, AppRole, DEFAULT_RBAC } from '../store/PermissionStore';
import { 
  Shield, 
  Save, 
  CheckSquare, 
  Square, 
  RotateCcw, 
  Award, 
  UserPlus, 
  X, 
  Check, 
  Info, 
  RefreshCw, 
  Sparkles, 
  AlertTriangle, 
  UserMinus, 
  AlertOctagon, 
  Trash2, 
  Ban, 
  ShieldAlert,
  Link2,
  Plus,
  Edit2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sliders,
  Lock,
  MoveUp,
  MoveDown,
  Globe,
  Zap,
  ClipboardCheck,
  Gauge,
  BookOpen,
  Database,
  BarChart3,
  FileText,
  Layers,
  ArrowRight,
  FolderOpen,
  Copy
} from 'lucide-react';
import { DataStore, TuyenDuongExclusion, ExternalReportLink, DEFAULT_EXTERNAL_REPORT_LINKS, DEFAULT_APP_SCRIPT_URL, DEFAULT_SPREADSHEET_ID } from '../store/DataStore';
import { SCRIPT_TEMPLATE } from './ConfigModal';
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
    { id: 'bao_cao_ho', label: 'Cập nhật báo cáo hộ' },
    { id: 'view_online_users', label: 'Xem danh sách người dùng Online' }
];

const ICON_PRESETS = [
    { id: 'zap', label: 'Tia điện', icon: Zap },
    { id: 'shield', label: 'Bảo vệ / Sự cố', icon: ShieldAlert },
    { id: 'clipboard', label: 'Kiểm tra', icon: ClipboardCheck },
    { id: 'gauge', label: 'Đồng hồ đo', icon: Gauge },
    { id: 'book', label: 'Học tập / Ôn thi', icon: BookOpen },
    { id: 'globe', label: 'Website / Cổng TT', icon: Globe },
    { id: 'database', label: 'Cơ sở dữ liệu', icon: Database },
    { id: 'barchart', label: 'Biểu đồ / Thống kê', icon: BarChart3 },
    { id: 'file', label: 'Văn bản / Báo cáo', icon: FileText },
    { id: 'layers', label: 'Ứng dụng khác', icon: Layers }
];

const COLOR_PRESETS = [
    { id: 'blue', label: 'Xanh dương', bg: 'bg-blue-600', ring: 'ring-blue-500' },
    { id: 'red', label: 'Đỏ', bg: 'bg-red-600', ring: 'ring-red-500' },
    { id: 'emerald', label: 'Xanh lá', bg: 'bg-emerald-600', ring: 'ring-emerald-500' },
    { id: 'amber', label: 'Vàng hổ phách', bg: 'bg-amber-600', ring: 'ring-amber-500' },
    { id: 'purple', label: 'Tím', bg: 'bg-purple-600', ring: 'ring-purple-500' },
    { id: 'indigo', label: 'Chàm', bg: 'bg-indigo-600', ring: 'ring-indigo-500' }
];

const SUGGESTED_COVERS = [
    { label: 'Trạm điện', url: 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b6?q=80&w=1600&auto=format&fit=crop' },
    { label: 'Cảnh báo an toàn', url: 'https://images.unsplash.com/photo-1627914371465-d0c3ebbbabfc?fm=jpg&q=80&w=1600&fit=crop' },
    { label: 'Báo cáo kiểm tra', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop' },
    { label: 'Công tơ thiết bị', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1600&auto=format&fit=crop' },
    { label: 'Sách vở ôn tập', url: 'https://images.unsplash.com/photo-1546410531-bea5aadcb6ce?q=80&w=1600&auto=format&fit=crop' }
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

    // Accordion State
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        data_source: true,
        links: false,
        tabs: false,
        productivity: false,
        congdoan: false,
        exclusions: false,
        actions: false,
        version: false
    });

    const toggleSection = (sectionId: string) => {
        setOpenSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const expandAllSections = () => {
        setOpenSections({
            data_source: true,
            links: true,
            tabs: true,
            productivity: true,
            congdoan: true,
            exclusions: true,
            actions: true,
            version: true
        });
    };

    const collapseAllSections = () => {
        setOpenSections({
            data_source: false,
            links: false,
            tabs: false,
            productivity: false,
            congdoan: false,
            exclusions: false,
            actions: false,
            version: false
        });
    };

    // Google Apps Script & Google Sheets Data Source URL State
    const [dataUrl, setDataUrl] = useState(() => DataStore.getAppScriptUrl());
    const [sheetInput, setSheetInput] = useState(() => DataStore.getSpreadsheetId());
    const [isSavingDataUrl, setIsSavingDataUrl] = useState(false);
    const [isTestingDataUrl, setIsTestingDataUrl] = useState(false);
    const [copiedScript, setCopiedScript] = useState(false);
    const [showScriptGuide, setShowScriptGuide] = useState(false);
    const [dataUrlMsg, setDataUrlMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string; details?: string } | null>(null);

    const handleSaveDataUrl = async () => {
        const cleanUrl = dataUrl.trim();
        const cleanSheet = sheetInput.trim();
        if (!cleanUrl) {
            setDataUrlMsg({ type: 'error', text: 'Vui lòng nhập đường link Web App (Google Apps Script URL).' });
            return;
        }
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            setDataUrlMsg({ type: 'error', text: 'Đường link Web App không hợp lệ (phải bắt đầu bằng https://).' });
            return;
        }
        if (!cleanSheet) {
            setDataUrlMsg({ type: 'error', text: 'Vui lòng nhập đường link hoặc ID bảng tính Google Sheets.' });
            return;
        }

        setIsSavingDataUrl(true);
        setDataUrlMsg({ type: 'info', text: 'Đang lưu đường link và kết nối đồng bộ toàn bộ dữ liệu mới...' });

        DataStore.setAppScriptUrl(cleanUrl);
        DataStore.setSpreadsheetId(cleanSheet);
        
        // Refresh sheetInput if a full URL was pasted so it shows the extracted ID cleanly
        const parsedId = DataStore.getSpreadsheetId();
        setSheetInput(parsedId);

        try {
            const success = await DataStore.syncMasterData();
            setIsSavingDataUrl(false);
            if (success) {
                const membersCount = DataStore.getMembers().length;
                const stationsCount = DataStore.getStations().length;
                const entriesCount = DataStore.getEntries().length;
                setDataUrlMsg({ 
                    type: 'success', 
                    text: 'Đã lưu và đồng bộ dữ liệu thành công!',
                    details: `Kết nối hoạt động tốt. Đã đồng bộ: ${membersCount} nhân sự/công nhân, ${stationsCount} trạm, ${entriesCount} bản ghi nhật ký từ nguồn dữ liệu mới.`
                });
                window.dispatchEvent(new CustomEvent('workload_updated'));
            } else {
                setDataUrlMsg({ 
                    type: 'error', 
                    text: 'Đã lưu link nhưng không thể lấy dữ liệu từ Web App hoặc Google Sheets này. Hãy đảm bảo bạn đã triển khai Web App với quyền truy cập "Bất kỳ ai (Anyone)" và mở quyền xem công khai trên Google Sheets.'
                });
            }
        } catch (err: any) {
            setIsSavingDataUrl(false);
            setDataUrlMsg({ type: 'error', text: 'Lỗi khi kết nối tới link dữ liệu: ' + (err.message || 'Lỗi mạng') });
        }
    };

    const handleTestDataUrl = async () => {
        const cleanUrl = dataUrl.trim();
        const cleanSheet = sheetInput.trim();
        if (!cleanUrl) {
            setDataUrlMsg({ type: 'error', text: 'Vui lòng nhập đường link Web App trước khi kiểm tra.' });
            return;
        }
        setIsTestingDataUrl(true);
        setDataUrlMsg({ type: 'info', text: 'Đang kiểm tra kết nối tới Web App và Google Sheets...' });
        const startTime = Date.now();
        try {
            const res = await fetch(`${cleanUrl}?action=getData&_t=${Date.now()}`);
            const json = await res.json();
            const latency = Date.now() - startTime;

            // Also test direct Google Sheets CSV accessibility
            let sheetOk = false;
            let sheetDetails = '';
            try {
                let parsedSheetId = cleanSheet;
                const match = cleanSheet.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                if (match && match[1]) parsedSheetId = match[1];
                const sheetRes = await fetch(`https://docs.google.com/spreadsheets/d/${parsedSheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('CongTac')}&_=${Date.now()}`);
                const text = await sheetRes.text();
                if (!text.includes('<html') && text.length > 30) {
                    sheetOk = true;
                    sheetDetails = 'Bảng tính Google Sheets đã mở quyền xem công khai (OK)';
                } else {
                    sheetDetails = 'Lưu ý: Bảng tính Google Sheets chưa mở quyền xem công khai (bất kỳ ai có liên kết)';
                }
            } catch (e) {
                sheetDetails = 'Chưa kiểm tra được quyền đọc trực tiếp Google Sheets.';
            }

            setIsTestingDataUrl(false);
            if (json && json.status === 'success') {
                setDataUrlMsg({
                    type: sheetOk ? 'success' : 'info',
                    text: `Kết nối Web App thành công (${latency}ms)!`,
                    details: `Web App phản hồi chuẩn. Số CBCNV: ${json.members?.length || 0}, Teams: ${json.teams?.length || 0}. ${sheetDetails}`
                });
            } else {
                setDataUrlMsg({
                    type: 'error',
                    text: 'Web App phản hồi nhưng dữ liệu không đúng cấu trúc (status !== "success").',
                    details: json?.message || JSON.stringify(json).slice(0, 150)
                });
            }
        } catch (err: any) {
            setIsTestingDataUrl(false);
            setDataUrlMsg({
                type: 'error',
                text: 'Không thể kết nối tới URL này. Hãy đảm bảo bạn đã triển khai Web App với quyền truy cập "Bất kỳ ai" (Anyone).'
            });
        }
    };

    const handleResetDataUrl = async () => {
        if (confirm("Bạn có chắc chắn muốn khôi phục cả Link Web App và Bảng tính Google Sheets về mặc định của hệ thống?")) {
            setDataUrl(DEFAULT_APP_SCRIPT_URL);
            setSheetInput(DEFAULT_SPREADSHEET_ID);
            DataStore.setAppScriptUrl(DEFAULT_APP_SCRIPT_URL);
            DataStore.setSpreadsheetId(DEFAULT_SPREADSHEET_ID);
            setIsSavingDataUrl(true);
            setDataUrlMsg({ type: 'info', text: 'Đang khôi phục về link dữ liệu mặc định...' });
            await DataStore.syncMasterData();
            setIsSavingDataUrl(false);
            setDataUrlMsg({ type: 'success', text: 'Đã khôi phục về link dữ liệu mặc định thành công!' });
            window.dispatchEvent(new CustomEvent('workload_updated'));
        }
    };

    const handleCopyScriptTemplate = () => {
        navigator.clipboard.writeText(SCRIPT_TEMPLATE);
        setCopiedScript(true);
        setTimeout(() => setCopiedScript(false), 3000);
    };

    // External Report Links State
    const [reportLinks, setReportLinks] = useState<ExternalReportLink[]>(() => DataStore.getExternalReportLinks());
    const [linkMsg, setLinkMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form state for adding/editing a link
    const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
    const [linkTitle, setLinkTitle] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [linkDesc, setLinkDesc] = useState('');
    const [linkIcon, setLinkIcon] = useState('globe');
    const [linkColor, setLinkColor] = useState('blue');
    const [linkImage, setLinkImage] = useState('');
    const [linkBadge, setLinkBadge] = useState('');
    const [showLinkForm, setShowLinkForm] = useState(false);

    const handleSaveLink = () => {
        setLinkMsg(null);
        if (!linkTitle.trim()) {
            setLinkMsg({ type: 'error', text: 'Vui lòng nhập tên / tiêu đề của liên kết.' });
            return;
        }
        if (!linkUrl.trim()) {
            setLinkMsg({ type: 'error', text: 'Vui lòng nhập đường dẫn web (URL).' });
            return;
        }

        let formattedUrl = linkUrl.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = 'https://' + formattedUrl;
        }

        if (editingLinkId) {
            DataStore.updateExternalReportLink(editingLinkId, {
                title: linkTitle.trim(),
                url: formattedUrl,
                description: linkDesc.trim(),
                icon: linkIcon,
                color: linkColor,
                imageUrl: linkImage.trim(),
                badge: linkBadge.trim()
            });
            setLinkMsg({ type: 'success', text: `Đã cập nhật liên kết "${linkTitle.trim()}" thành công!` });
        } else {
            DataStore.addExternalReportLink({
                title: linkTitle.trim(),
                url: formattedUrl,
                description: linkDesc.trim(),
                icon: linkIcon,
                color: linkColor,
                imageUrl: linkImage.trim(),
                badge: linkBadge.trim()
            });
            setLinkMsg({ type: 'success', text: `Đã thêm liên kết mới "${linkTitle.trim()}"! Liên kết đã sẵn sàng trên tab "Link báo cáo".` });
        }

        setReportLinks(DataStore.getExternalReportLinks());
        handleCancelLinkEdit();
        setTimeout(() => setLinkMsg(null), 4000);
    };

    const handleStartEditLink = (item: ExternalReportLink) => {
        setEditingLinkId(item.id);
        setLinkTitle(item.title);
        setLinkUrl(item.url);
        setLinkDesc(item.description || '');
        setLinkIcon(item.icon || 'globe');
        setLinkColor(item.color || 'blue');
        setLinkImage(item.imageUrl || '');
        setLinkBadge(item.badge || '');
        setShowLinkForm(true);
    };

    const handleCancelLinkEdit = () => {
        setEditingLinkId(null);
        setLinkTitle('');
        setLinkUrl('');
        setLinkDesc('');
        setLinkIcon('globe');
        setLinkColor('blue');
        setLinkImage('');
        setLinkBadge('');
        setShowLinkForm(false);
    };

    const handleDeleteLink = (id: string, title: string) => {
        if (confirm(`Bạn có chắc chắn muốn xóa liên kết "${title}" khỏi tab "Link báo cáo"?`)) {
            DataStore.removeExternalReportLink(id);
            setReportLinks(DataStore.getExternalReportLinks());
            setLinkMsg({ type: 'success', text: `Đã xóa liên kết "${title}".` });
            setTimeout(() => setLinkMsg(null), 3000);
        }
    };

    const handleMoveLink = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= reportLinks.length) return;
        const updated = [...reportLinks];
        const temp = updated[index];
        updated[index] = updated[newIndex];
        updated[newIndex] = temp;
        setReportLinks(updated);
        DataStore.setExternalReportLinks(updated);
    };

    const handleResetDefaultLinks = () => {
        if (confirm("Khôi phục danh sách về 5 liên kết mặc định ban đầu?")) {
            DataStore.resetExternalReportLinks();
            setReportLinks(DataStore.getExternalReportLinks());
            setLinkMsg({ type: 'success', text: 'Đã khôi phục 5 liên kết mặc định thành công!' });
            setTimeout(() => setLinkMsg(null), 3000);
        }
    };

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

    // Commendation Exclusion
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
            setConfig(JSON.parse(JSON.stringify(DEFAULT_RBAC)));
        }
    };

    const renderDynamicIcon = (iconKey?: string, className = "w-5 h-5") => {
        const found = ICON_PRESETS.find(i => i.id === iconKey);
        if (found) {
            const Comp = found.icon;
            return <Comp className={className} />;
        }
        return <Globe className={className} />;
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full animate-fade-in">
            {/* Top Header Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap gap-3 justify-between items-center bg-slate-50/70 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-inner text-white">
                        <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Cấu hình Hệ thống</h2>
                        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                            Quản lý liên kết, Phân quyền & Thiết lập nghiệp vụ
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button 
                        onClick={expandAllSections}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
                        title="Bung ra tất cả các mục"
                    >
                        Mở tất cả
                    </button>
                    <button 
                        onClick={collapseAllSections}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
                        title="Thu gọn tất cả các mục"
                    >
                        Thu gọn tất cả
                    </button>
                    <button 
                        onClick={handleReset}
                        className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Khôi phục mặc định</span>
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex items-center gap-1 sm:gap-2 px-3.5 py-1.5 bg-[#141414] hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-md"
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span>Lưu phân quyền</span>
                    </button>
                </div>
            </div>

            {/* Main Scrollable Content with Collapsible Accordion Sections */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {message && (
                    <div className={`p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                {/* 0. MỤC: CẤU HÌNH LINK DỮ LIỆU (GOOGLE APPS SCRIPT WEB APP) */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('data_source')}
                        className="w-full flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-emerald-50/60 via-slate-50/80 to-white hover:bg-emerald-50/80 transition-colors text-left cursor-pointer border-b border-transparent"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
                                <Database className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base font-bold text-slate-800">
                                        Cấu Hình Link Dữ Liệu (Google Sheets & Web App)
                                    </h3>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide ${
                                        dataUrl === DEFAULT_APP_SCRIPT_URL && sheetInput === DEFAULT_SPREADSHEET_ID
                                            ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    }`}>
                                        {dataUrl === DEFAULT_APP_SCRIPT_URL && sheetInput === DEFAULT_SPREADSHEET_ID ? 'Nguồn Mặc định' : 'Nguồn Tùy chỉnh'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Cập nhật đường link Web App và Bảng tính Google Sheets kết nối cơ sở dữ liệu hệ thống.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                                {openSections.data_source ? 'Thu gọn' : 'Bấm để mở'}
                            </span>
                            <div className={`p-1 rounded-lg bg-slate-200/60 text-slate-700 transition-transform duration-200 ${openSections.data_source ? 'rotate-180' : ''}`}>
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </button>

                    {openSections.data_source && (
                        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white space-y-4 animate-fade-in">
                            {/* Alert / Result message */}
                            {dataUrlMsg && (
                                <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 shadow-xs ${
                                    dataUrlMsg.type === 'success' 
                                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' 
                                        : dataUrlMsg.type === 'error'
                                        ? 'bg-rose-50 text-rose-900 border border-rose-300'
                                        : 'bg-blue-50 text-blue-900 border border-blue-300'
                                }`}>
                                    {dataUrlMsg.type === 'success' ? (
                                        <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                    ) : dataUrlMsg.type === 'error' ? (
                                        <AlertOctagon className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin mt-0.5 shrink-0" />
                                    )}
                                    <div className="flex-1">
                                        <div className="font-bold">{dataUrlMsg.text}</div>
                                        {dataUrlMsg.details && (
                                            <div className="text-[11px] opacity-80 mt-0.5 font-mono">{dataUrlMsg.details}</div>
                                        )}
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setDataUrlMsg(null)}
                                        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Main Input Form */}
                            <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-4">
                                {/* 1. Google Sheets Spreadsheet Link/ID */}
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                                        <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                            <Database className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Link hoặc ID Bảng Tính Google Sheets</span>
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                sheetInput === DEFAULT_SPREADSHEET_ID
                                                    ? 'bg-slate-200 text-slate-700'
                                                    : 'bg-emerald-100 text-emerald-800'
                                            }`}>
                                                {sheetInput === DEFAULT_SPREADSHEET_ID ? 'Mặc định' : 'Tùy chỉnh'}
                                            </span>
                                            <a
                                                href={`https://docs.google.com/spreadsheets/d/${sheetInput.includes('/d/') ? sheetInput.split('/d/')[1].split('/')[0] : sheetInput}/edit`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                                                title="Mở bảng tính Google Sheets trong tab mới"
                                            >
                                                <span>Mở Google Sheets</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={sheetInput}
                                            onChange={(e) => setSheetInput(e.target.value)}
                                            placeholder="https://docs.google.com/spreadsheets/d/.../edit hoặc ID bảng tính"
                                            className="w-full px-3.5 py-2.5 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-10 text-slate-800 shadow-inner"
                                        />
                                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Database className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>Dán đường link đầy đủ hoặc ID bảng tính (chứa các sheet: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">CongTac</code>, <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">CBCNV</code>, <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">Tiến độ</code>, <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">TUTI</code>, v.v.). Bảng tính cần chia sẻ "Bất kỳ ai có liên kết đều có thể xem".</span>
                                    </p>
                                </div>

                                {/* 2. Web App (Google Apps Script URL) */}
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                                        <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                            <Globe className="w-3.5 h-3.5 text-blue-600" />
                                            <span>Đường link Web App (Google Apps Script URL)</span>
                                        </label>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            dataUrl === DEFAULT_APP_SCRIPT_URL 
                                                ? 'bg-slate-200 text-slate-700' 
                                                : 'bg-emerald-100 text-emerald-800'
                                        }`}>
                                            {dataUrl === DEFAULT_APP_SCRIPT_URL ? 'Mặc định' : 'Tùy chỉnh'}
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="url"
                                            value={dataUrl}
                                            onChange={(e) => setDataUrl(e.target.value)}
                                            placeholder="https://script.google.com/macros/s/.../exec"
                                            className="w-full px-3.5 py-2.5 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-10 text-slate-800 shadow-inner"
                                        />
                                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Globe className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>Link phải kết thúc bằng <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">/exec</code> từ Google Apps Script của bảng tính để đồng bộ 2 chiều, ghi nhật ký, online.</span>
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSaveDataUrl}
                                            disabled={isSavingDataUrl || isTestingDataUrl}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                                        >
                                            {isSavingDataUrl ? (
                                                <>
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Đang lưu & đồng bộ...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-3.5 h-3.5" />
                                                    <span>Lưu & Đồng bộ dữ liệu</span>
                                                </>
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleTestDataUrl}
                                            disabled={isSavingDataUrl || isTestingDataUrl}
                                            className="px-3.5 py-2 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                        >
                                            {isTestingDataUrl ? (
                                                <>
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                                                    <span>Đang kiểm tra...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                                                    <span>Kiểm tra kết nối</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`Web App: ${dataUrl}\nGoogle Sheets: https://docs.google.com/spreadsheets/d/${sheetInput}/edit`);
                                                setDataUrlMsg({ type: 'info', text: 'Đã sao chép link Web App và Google Sheets vào bộ nhớ tạm.' });
                                                setTimeout(() => setDataUrlMsg(null), 3000);
                                            }}
                                            className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                            title="Sao chép link"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Sao chép link</span>
                                        </button>

                                        {(dataUrl !== DEFAULT_APP_SCRIPT_URL || sheetInput !== DEFAULT_SPREADSHEET_ID) && (
                                            <button
                                                type="button"
                                                onClick={handleResetDataUrl}
                                                disabled={isSavingDataUrl}
                                                className="px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                                title="Khôi phục nguồn dữ liệu mặc định"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                <span className="hidden sm:inline">Về mặc định</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Collapsible Deployment & Apps Script Guide */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                                <button
                                    type="button"
                                    onClick={() => setShowScriptGuide(prev => !prev)}
                                    className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-slate-700 font-bold cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-emerald-600" />
                                        <span>Hướng dẫn cách tạo Web App từ Google Sheets riêng</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showScriptGuide ? 'rotate-180' : ''}`} />
                                </button>
                                {showScriptGuide && (
                                    <div className="p-4 space-y-3 bg-white border-t border-slate-100 text-slate-600 leading-relaxed">
                                        <ol className="list-decimal list-inside space-y-1.5 text-[11px] sm:text-xs">
                                            <li>Mở bảng tính Google Sheets của đơn vị bạn.</li>
                                            <li>Chọn menu <span className="font-bold text-slate-800">Tiện ích mở rộng (Extensions)</span> &gt; <span className="font-bold text-slate-800">Apps Script</span>.</li>
                                            <li>Xóa toàn bộ mã mặc định và dán đoạn mã Google Apps Script của hệ thống.</li>
                                            <li>Bấm <span className="font-bold text-slate-800">Triển khai (Deploy)</span> &gt; <span className="font-bold text-slate-800">Triển khai mới (New deployment)</span>.</li>
                                            <li>Chọn loại: <span className="font-bold text-slate-800">Ứng dụng web (Web app)</span>.</li>
                                            <li>Mục <i>Ai có quyền truy cập (Who has access)</i>: Chọn <span className="font-bold text-emerald-700">Bất kỳ ai (Anyone)</span>.</li>
                                            <li>Bấm Triển khai và sao chép URL kết thúc bằng <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">/exec</code> dán vào ô bên trên rồi bấm <span className="font-bold text-emerald-700">Lưu & Đồng bộ dữ liệu</span>.</li>
                                        </ol>
                                        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleCopyScriptTemplate}
                                                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                            >
                                                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                                                <span>{copiedScript ? 'Đã sao chép mã Apps Script!' : 'Sao chép mã Apps Script mẫu'}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 1. MỤC: QUẢN LÝ LINK BÁO CÁO (THÊM / BỚT LIÊN KẾT) */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('links')}
                        className="w-full flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-blue-50/50 via-slate-50/80 to-white hover:bg-blue-50/80 transition-colors text-left cursor-pointer border-b border-transparent"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                                <Link2 className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-slate-800">
                                        Quản Lý Liên Kết Báo Cáo (Tab "Link Báo Cáo")
                                    </h3>
                                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-black tracking-wide">
                                        {reportLinks.length} liên kết
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Thêm, bớt, chỉnh sửa các link ứng dụng hiển thị tại tab Link báo cáo.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                                {openSections.links ? 'Thu gọn' : 'Bấm để mở'}
                            </span>
                            <div className={`p-1 rounded-lg bg-slate-200/60 text-slate-700 transition-transform duration-200 ${openSections.links ? 'rotate-180' : ''}`}>
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </button>

                    {openSections.links && (
                        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white space-y-4 animate-fade-in">
                            {linkMsg && (
                                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                                    linkMsg.type === 'success' 
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}>
                                    {linkMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />}
                                    <span>{linkMsg.text}</span>
                                </div>
                            )}

                            {/* Header Buttons for Links */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                <div className="text-xs text-slate-600">
                                    Khi bạn thêm hoặc xóa liên kết tại đây, tab <span className="font-bold text-slate-800">"Link báo cáo"</span> sẽ tự động cập nhật ngay lập tức.
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleResetDefaultLinks}
                                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all flex items-center gap-1.5"
                                        title="Khôi phục 5 link mặc định"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Khôi phục mặc định</span>
                                    </button>

                                    {!showLinkForm && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleCancelLinkEdit();
                                                setShowLinkForm(true);
                                            }}
                                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Thêm liên kết mới</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Form Thêm / Sửa liên kết */}
                            {showLinkForm && (
                                <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-blue-200 shadow-sm transition-all">
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                            {editingLinkId ? <Edit2 className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-blue-600" />}
                                            <span>{editingLinkId ? 'Chỉnh sửa liên kết' : 'Thêm liên kết mới vào Tab Link Báo Cáo'}</span>
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={handleCancelLinkEdit}
                                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
                                        {/* Tên ứng dụng */}
                                        <div className="lg:col-span-5">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                                Tên ứng dụng / Tiêu đề <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={linkTitle}
                                                onChange={e => setLinkTitle(e.target.value)}
                                                placeholder="VD: Quản lý trạm biến áp, Bản đồ lưới điện..."
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                        </div>

                                        {/* URL */}
                                        <div className="lg:col-span-7">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                                Địa chỉ liên kết web (URL) <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={linkUrl}
                                                    onChange={e => setLinkUrl(e.target.value)}
                                                    placeholder="https://quan-ly-tram-bien-ap.vercel.app/ hoặc dia-chi-web.vn"
                                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                                                />
                                                {linkUrl && (
                                                    <a
                                                        href={linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-blue-600 transition-colors"
                                                        title="Mở thử liên kết"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* Mô tả ngắn */}
                                        <div className="lg:col-span-12">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                                Mô tả ngắn chức năng ứng dụng
                                            </label>
                                            <input
                                                type="text"
                                                value={linkDesc}
                                                onChange={e => setLinkDesc(e.target.value)}
                                                placeholder="VD: Truy cập hệ thống quản lý chi tiết thông tin, sơ đồ và thông số vận hành..."
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                        </div>

                                        {/* Chọn Icon */}
                                        <div className="lg:col-span-6">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                                Biểu tượng (Icon)
                                            </label>
                                            <div className="grid grid-cols-5 gap-1.5">
                                                {ICON_PRESETS.map(preset => {
                                                    const Comp = preset.icon;
                                                    const isSelected = linkIcon === preset.id;
                                                    return (
                                                        <button
                                                            key={preset.id}
                                                            type="button"
                                                            onClick={() => setLinkIcon(preset.id)}
                                                            className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                                                                isSelected 
                                                                    ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-sm' 
                                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                            title={preset.label}
                                                        >
                                                            <Comp className="w-4 h-4" />
                                                            <span className="text-[9px] truncate max-w-full">{preset.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Chọn Màu Sắc & Huy Hiệu */}
                                        <div className="lg:col-span-6 space-y-2.5">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                                    Màu sắc điểm nhấn
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    {COLOR_PRESETS.map(c => (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            onClick={() => setLinkColor(c.id)}
                                                            className={`w-7 h-7 rounded-xl ${c.bg} transition-all flex items-center justify-center text-white ${
                                                                linkColor === c.id ? 'ring-2 ring-offset-2 ring-slate-800 scale-110 shadow-md' : 'opacity-80 hover:opacity-100'
                                                            }`}
                                                            title={c.label}
                                                        >
                                                            {linkColor === c.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                                    Huy hiệu / Tag nổi bật (Tùy chọn)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={linkBadge}
                                                    onChange={e => setLinkBadge(e.target.value)}
                                                    placeholder="VD: Mới, Nội bộ, Hot..."
                                                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Ảnh bìa tùy chọn */}
                                        <div className="lg:col-span-12">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                                Đường dẫn ảnh bìa (Tùy chọn - nếu bỏ trống sẽ dùng hình nền công nghệ phối màu)
                                            </label>
                                            <input
                                                type="text"
                                                value={linkImage}
                                                onChange={e => setLinkImage(e.target.value)}
                                                placeholder="https://images.unsplash.com/..."
                                                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono mb-1.5"
                                            />
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="text-[10px] text-slate-400 font-medium">Gợi ý ảnh nhanh:</span>
                                                {SUGGESTED_COVERS.map((cov, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setLinkImage(cov.url)}
                                                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors border border-slate-200"
                                                    >
                                                        {cov.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCancelLinkEdit}
                                            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                                        >
                                            Hủy bỏ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveLink}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                                        >
                                            <Save className="w-4 h-4" />
                                            <span>{editingLinkId ? 'Lưu thay đổi liên kết' : 'Xác nhận thêm liên kết'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Danh sách link hiện có */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    <span>Danh sách liên kết đang hoạt động ({reportLinks.length})</span>
                                    <span className="text-[11px] text-slate-400 font-normal lowercase">
                                        (Dùng mũi tên lên/xuống để đổi thứ tự hiển thị)
                                    </span>
                                </div>

                                {reportLinks.length === 0 ? (
                                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                        <FolderOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                                        <p className="text-xs font-bold text-slate-700">Chưa có liên kết nào</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Bấm "Thêm liên kết mới" hoặc "Khôi phục mặc định" để cấu hình.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {reportLinks.map((item, idx) => (
                                            <div 
                                                key={item.id || idx}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50/70 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-all"
                                            >
                                                <div className="flex items-start sm:items-center gap-3 min-w-0">
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className="text-[11px] font-mono font-bold text-slate-400 w-4 text-center">
                                                            {idx + 1}
                                                        </span>
                                                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-sm shrink-0">
                                                            {renderDynamicIcon(item.icon, "w-4 h-4 text-slate-800")}
                                                        </div>
                                                    </div>

                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs font-bold text-slate-900 truncate">
                                                                {item.title}
                                                            </span>
                                                            {item.badge && (
                                                                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-white text-[9px] font-bold uppercase tracking-wider">
                                                                    {item.badge}
                                                                </span>
                                                            )}
                                                            <a 
                                                                href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-0.5 text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-mono"
                                                            >
                                                                <span className="truncate max-w-[200px] sm:max-w-[320px]">{item.url}</span>
                                                                <ExternalLink className="w-3 h-3 shrink-0" />
                                                            </a>
                                                        </div>
                                                        {item.description && (
                                                            <p className="text-[11px] text-slate-500 truncate max-w-xl mt-0.5">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Thao tác nút bấm */}
                                                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMoveLink(idx, 'up')}
                                                        disabled={idx === 0}
                                                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-600 transition-colors"
                                                        title="Đẩy lên trên"
                                                    >
                                                        <MoveUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMoveLink(idx, 'down')}
                                                        disabled={idx === reportLinks.length - 1}
                                                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-600 transition-colors"
                                                        title="Đẩy xuống dưới"
                                                    >
                                                        <MoveDown className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStartEditLink(item)}
                                                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors"
                                                        title="Chỉnh sửa liên kết"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteLink(item.id, item.title)}
                                                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-colors"
                                                        title="Xóa liên kết"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. MỤC: QUYỀN TRUY CẬP TAB */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('tabs')}
                        className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-50/70 hover:bg-slate-100/80 transition-colors text-left cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-md shadow-slate-900/10 shrink-0">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-slate-800">
                                        Quyền Truy Cập Tab (Phân Quyền RBAC)
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                                        {TABS_INFO.length} Tabs
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Phân quyền hiển thị từng Tab trên thanh điều hướng cho các vai trò.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                                {openSections.tabs ? 'Thu gọn' : 'Bấm để mở'}
                            </span>
                            <div className={`p-1 rounded-lg bg-slate-200/60 text-slate-700 transition-transform duration-200 ${openSections.tabs ? 'rotate-180' : ''}`}>
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </button>

                    {openSections.tabs && (
                        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white animate-fade-in">
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
                                                                className="w-full flex justify-center hover:scale-110 transition-transform cursor-pointer"
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
                    )}
                </div>

                {/* 3. MỤC: CẤU HÌNH NĂNG SUẤT */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('productivity')}
                        className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-50/70 hover:bg-slate-100/80 transition-colors text-left cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
                                <CheckSquare className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800">
                                    Cấu Hình Năng Suất & Chốt Kế Hoạch
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Tính năng suất Thứ Bảy, Chủ Nhật, Ngày Nghỉ và quyền chốt tiến độ.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                                {openSections.productivity ? 'Thu gọn' : 'Bấm để mở'}
                            </span>
                            <div className={`p-1 rounded-lg bg-slate-200/60 text-slate-700 transition-transform duration-200 ${openSections.productivity ? 'rotate-180' : ''}`}>
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </button>

                    {openSections.productivity && (
                        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white animate-fade-in">
                            <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-4 space-y-3">
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
                    )}
                </div>

                {/* 4. MỤC: PHÂN QUYỀN CÔNG ĐOÀN */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('congdoan')}
                        className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-50/70 hover:bg-slate-100/80 transition-colors text-left cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-600/20 shrink-0">
                                <Award className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-slate-800">
                                        Phân Quyền Công Đoàn (Sinh Nhật & Tuyên Dương)
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                                        {congDoanLeaders.length} cán bộ
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Quyền công bố sự kiện sinh nhật đoàn viên và bảng vinh danh năng suất.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                                {openSections.congdoan ? 'Thu gọn' : 'Bấm để mở'}
                            </span>
                            <div className={`p-1 rounded-lg bg-slate-200/60 text-slate-700 transition-transform duration-200 ${openSections.congdoan ? 'rotate-180' : ''}`}>
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </button>

                    {openSections.congdoan && (
                        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white animate-fade-in space-y-3">
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Chỉ <span className="font-bold text-slate-700">Đội trưởng / Giám đốc</span> và <span className="font-bold text-slate-700">Tổ trưởng Công đoàn</span> (hoặc cán bộ được chỉ định dưới đây) mới có thẩm quyền bấm công bố chính thức các chương trình sinh nhật và bảng vinh danh năng suất.
                            </p>

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
                    )}
                </div>

                {/* 5. MỤC: LOẠI KHỎI TUYÊN DƯƠNG NĂNG SUẤT DO PHẠM LỖI */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('exclusions')}
                        className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-50/70 hover:bg-slate-100/80 transition-colors text-left cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-600/20 shrink-0">
                                <UserMinus className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-slate-800">
                                        Loại Khỏi Tuyên Dương Năng Suất (Do Phạm Lỗi / Kỷ Luật)
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                        {exclusions.length} trường hợp
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Đội trưởng loại cá nhân ra khỏi xét Top 3 tuyên dương trong tháng do vi phạm kỷ luật.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                                {openSections.exclusions ? 'Thu gọn' : 'Bấm để mở'}
                            </span>
                            <div className={`p-1 rounded-lg bg-slate-200/60 text-slate-700 transition-transform duration-200 ${openSections.exclusions ? 'rotate-180' : ''}`}>
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </button>

                    {openSections.exclusions && (
                        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white animate-fade-in space-y-4">
                            {exclMsg && (
                                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                                    exclMsg.type === 'success' 
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}>
                                    {exclMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />}
                                    <span>{exclMsg.text}</span>
                                </div>
                            )}

                            {/* Form Thêm Loại trừ */}
                            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 shadow-sm">
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                                    Thiết Lập Loại Trừ Khen Thưởng Nhân Sự Trong Tháng
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                                    <div className="lg:col-span-3">
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                            Tháng & Năm áp dụng
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                value={exclMonth}
                                                onChange={e => setExclMonth(Number(e.target.value))}
                                                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                            >
                                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                    <option key={m} value={m}>Tháng {m}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={exclYear}
                                                onChange={e => setExclYear(Number(e.target.value))}
                                                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                            >
                                                {[2024, 2025, 2026, 2027].map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-4">
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                            Chọn nhân sự vi phạm ({allMembers.length} nhân sự)
                                        </label>
                                        <select
                                            value={exclMemberName}
                                            onChange={e => setExclMemberName(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                        >
                                            <option value="">-- Chọn nhân sự cần loại trừ --</option>
                                            {allMembers.map(m => (
                                                <option key={m.name} value={m.name}>
                                                    {m.name} ({m.team || 'Đo xa'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

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
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200">
                                    <span className="text-[11px] text-slate-400 font-medium">Gợi ý lý do nhanh:</span>
                                    {PRESET_INFRACTION_REASONS.map((preset, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setExclReason(preset)}
                                            className="text-[10px] px-2 py-0.5 rounded-lg bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-600 transition-colors cursor-pointer border border-slate-200"
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

                            {/* Danh sách đã bị loại trừ */}
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        Danh Sách Nhân Sự Đang Bị Loại Trừ ({exclusions.length})
                                    </h4>

                                    <select
                                        value={exclFilterMonth}
                                        onChange={e => setExclFilterMonth(e.target.value)}
                                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none"
                                    >
                                        <option value="all">Xem tất cả các tháng</option>
                                        <option value="selected">Chỉ Tháng {exclMonth}/{exclYear}</option>
                                    </select>
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
                                            <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                                                <Check className="w-5 h-5 text-emerald-500 mx-auto mb-1 opacity-80" />
                                                <p className="text-xs font-semibold text-slate-700">
                                                    Không có nhân sự nào bị kỷ luật loại trừ khen thưởng.
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
                    )}
                </div>

                {/* 6. MỤC: QUYỀN THAO TÁC CHỨC NĂNG */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('actions')}
                        className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-50/70 hover:bg-slate-100/80 transition-colors text-left cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
                                <Lock className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800">
                                    Quyền Thao Tác Chức Năng (Functions)
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Nút Cài đặt, Chỉnh sửa báo cáo người khác, Cập nhật báo cáo hộ, Xem danh sách người dùng Online.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                                {openSections.actions ? 'Thu gọn' : 'Bấm để mở'}
                            </span>
                            <div className={`p-1 rounded-lg bg-slate-200/60 text-slate-700 transition-transform duration-200 ${openSections.actions ? 'rotate-180' : ''}`}>
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </button>

                    {openSections.actions && (
                        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white animate-fade-in">
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
                                                                className="w-full flex justify-center hover:scale-110 transition-transform cursor-pointer"
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
                    )}
                </div>

                {/* 7. MỤC: THÔNG TIN PHIÊN BẢN & ĐỒNG BỘ HỆ THỐNG */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('version')}
                        className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-50/70 hover:bg-slate-100/80 transition-colors text-left cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-amber-400 shadow-md shadow-slate-900/10 shrink-0">
                                <Info className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-slate-800">
                                        Phiên Bản Hệ Thống & Đồng Bộ Máy Chủ
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono font-bold text-[10px]">
                                        v{APP_VERSION}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Kiểm tra cập nhật phần mềm, xóa bộ nhớ đệm (Cache) và ép đồng bộ phiên bản mới.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                                {openSections.version ? 'Thu gọn' : 'Bấm để mở'}
                            </span>
                            <div className={`p-1 rounded-lg bg-slate-200/60 text-slate-700 transition-transform duration-200 ${openSections.version ? 'rotate-180' : ''}`}>
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </button>

                    {openSections.version && (
                        <div className="p-4 sm:p-5 border-t border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white animate-fade-in rounded-b-2xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-base text-white">Phiên bản Hệ thống Hiện Tại</h3>
                                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono font-black text-xs shadow-sm">
                                            v{APP_VERSION}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-300 mt-1">
                                        Cấu trúc phiên bản tự động: <span className="font-mono text-amber-300 font-bold">Năm.Tháng.Ngày.Số</span>.
                                    </p>
                                    <div className="text-xs font-mono text-slate-300 mt-2">
                                        <span className="text-slate-400">Lần cập nhật gần nhất:</span>{' '}
                                        <span className="text-white font-bold">{APP_VERSION_DETAILS.formattedTime}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={handleCheckVersion}
                                        disabled={isCheckingVer}
                                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-medium rounded-xl border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                        title="Kiểm tra xem máy chủ có bản mới hơn không"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isCheckingVer ? 'animate-spin text-amber-400' : 'text-slate-300'}`} />
                                        <span>{isCheckingVer ? 'Đang kiểm tra...' : 'Kiểm tra bản mới'}</span>
                                    </button>

                                    <button
                                        onClick={handleForceReload}
                                        className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                                        title="Xóa bộ nhớ đệm (Cache) của trình duyệt và tải lại ứng dụng mới nhất"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-yellow-100" />
                                        <span>Xóa Cache & Đồng bộ</span>
                                    </button>
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
                    )}
                </div>

            </div>
        </div>
    );
}
