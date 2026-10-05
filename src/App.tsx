import React, { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";
import { ClipboardList, BarChart3, Database, TrendingUp, LogOut, User as UserIcon, CheckSquare, Settings, Activity, Menu, WifiOff, ChevronUp, ChevronDown, KeyRound, Search, Package, Gift, Award, Users, X, ShieldAlert, FolderTree } from "lucide-react";
import WorkloadForm from "./components/WorkloadForm";
import Analytics from "./components/Analytics";
import Stations from "./components/Stations";
import AnalysisTab from "./components/AnalysisTab";
import SearchTab from "./components/SearchTab";
import Login from "./components/Login";
import ProgressTab from "./components/ProgressTab";
import ConfigModal from "./components/ConfigModal";
import SystemTab from "./components/SystemTab";
import TutiTab from "./components/TutiTab";
import SangTaiTab from "./components/SangTaiTab";
import DisconnectRateTab from "./components/DisconnectRateTab";
import WarehouseTab from "./components/WarehouseTab";
import PlanProgressTab from "./components/PlanProgressTab";
import BirthdayTab from "./components/BirthdayTab";
import KthtddTab from "./components/KthtddTab";
import ChangePasswordModal from "./components/ChangePasswordModal";
import { DataStore, SheetMember, OnlineStats } from "./store/DataStore";
import { PermissionStore } from './store/PermissionStore';
import { APP_VERSION } from './version';
import { VersionUpdateBanner, VersionSyncButton } from './components/VersionUpdateBanner';

export type SeasonTheme = ReturnType<typeof getSeasonTheme>;

export const getSeasonTheme = () => {
  const month = new Date().getMonth() + 1;
  // Mùa Xuân: 2, 3, 4
  // Mùa Hạ: 5, 6, 7
  // Mùa Thu: 8, 9, 10
  // Mùa Đông: 11, 12, 1
  if (month >= 2 && month <= 4) return { 
     season: 'spring', 
     gradient: 'from-emerald-50 via-teal-50 to-cyan-50',
     headerImg: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=2000&auto=format&fit=crop',
     overlay: 'from-emerald-900/90 via-teal-800/90 to-[#005a9c]/80',
     accent: 'text-emerald-500',
     footerBg: 'bg-emerald-900',
     footerText: 'text-emerald-100',
     footerAccent: 'text-emerald-300',
     status: {
       overdue: { bg: 'bg-pink-100/80', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]' },
       near: { bg: 'bg-yellow-100/80', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' },
       ok: { bg: 'bg-emerald-100/80', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' }
     }
  };
  if (month >= 5 && month <= 7) return { 
     season: 'summer', 
     gradient: 'from-orange-50 via-amber-50 to-blue-50',
     headerImg: 'https://images.unsplash.com/photo-1548345680-f5475ea90f05?q=80&w=2000&auto=format&fit=crop',
     overlay: 'from-[#f47920]/90 via-orange-800/90 to-[#005a9c]/80',
     accent: 'text-orange-400',
     footerBg: 'bg-orange-900',
     footerText: 'text-orange-100',
     footerAccent: 'text-orange-300',
     status: {
       overdue: { bg: 'bg-red-100/80', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' },
       near: { bg: 'bg-orange-100/80', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]' },
       ok: { bg: 'bg-cyan-100/80', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]' }
     }
  };
  if (month >= 8 && month <= 10) return { 
     season: 'autumn', 
     gradient: 'from-yellow-50 via-orange-50 to-red-50',
     headerImg: 'https://images.unsplash.com/photo-1501430654243-c934cec2e1c0?q=80&w=2000&auto=format&fit=crop',
     overlay: 'from-amber-900/90 via-[#f47920]/80 to-[#005a9c]/80',
     accent: 'text-amber-400',
     footerBg: 'bg-amber-900',
     footerText: 'text-amber-100',
     footerAccent: 'text-amber-300',
     status: {
       overdue: { bg: 'bg-orange-100/80', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]' },
       near: { bg: 'bg-amber-100/80', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' },
       ok: { bg: 'bg-teal-100/80', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]' }
     }
  };
  return { 
     season: 'winter', 
     gradient: 'from-slate-50 via-blue-50 to-indigo-50',
     headerImg: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=2000&auto=format&fit=crop',
     overlay: 'from-[#005a9c]/90 via-[#004b87]/90 to-slate-900/80',
     accent: 'text-blue-400',
     footerBg: 'bg-[#004b87]',
     footerText: 'text-blue-100',
     footerAccent: 'text-blue-300',
     status: {
       overdue: { bg: 'bg-indigo-100/80', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' },
       near: { bg: 'bg-slate-200/80', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.6)]' },
       ok: { bg: 'bg-blue-100/80', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' }
     }
  };
};

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"input" | "report" | "stations" | "analysis" | "progress" | "tuti" | "disconnect" | "sangtai" | "warehouse" | "kthtdd" | "plan_progress" | "birthday" | "search" | "system">("input");
  const [refreshToggle, setRefreshToggle] = useState(0);

  useEffect(() => {
    DataStore.initDB().then(() => {
      setDbReady(true);
      DataStore.syncMasterData().then(() => setRefreshToggle(prev => prev + 1));
    });
  }, []);

  const [showConfig, setShowConfig] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const theme = getSeasonTheme();
  const [sessionUser, setSessionUser] = useState<SheetMember | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollGroup, setShowScrollGroup] = useState(false);
  const [onlineStats, setOnlineStats] = useState<OnlineStats | null>(null);
  const [isOnlineOpen, setIsOnlineOpen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const onlineContainerRef = useRef<HTMLDivElement>(null);
  const headerOnlineRef = useRef<HTMLButtonElement | HTMLDivElement>(null);
  const onlineTooltipRef = useRef<HTMLDivElement>(null);
  const lastPingTimeRef = useRef<number>(0);
  const onlineHoverTimeoutRef = useRef<any>(null);

  const updateTooltipPos = (targetElem: HTMLElement | null, isFromHeader = false) => {
    if (!targetElem) return;
    const rect = targetElem.getBoundingClientRect();
    if (isFromHeader) {
      const top = Math.min(rect.bottom + 8, window.innerHeight - 340);
      const left = Math.max(12, Math.min(rect.left - 100, window.innerWidth - 300));
      setTooltipPos({ top, left });
    } else {
      let left = rect.right + 10;
      let top = Math.max(10, Math.min(rect.top - 20, window.innerHeight - 340));
      if (left + 290 > window.innerWidth) {
        left = Math.max(10, window.innerWidth - 300);
        top = Math.max(10, rect.top - 240);
      }
      setTooltipPos({ top, left });
    }
  };

  const openOnlineTooltip = (elem: HTMLElement | null, isFromHeader = false) => {
    if (onlineHoverTimeoutRef.current) clearTimeout(onlineHoverTimeoutRef.current);
    updateTooltipPos(elem, isFromHeader);
    setIsOnlineOpen(true);
    refreshOnlineIfStale();
  };

  const closeOnlineTooltipWithDelay = () => {
    if (onlineHoverTimeoutRef.current) clearTimeout(onlineHoverTimeoutRef.current);
    onlineHoverTimeoutRef.current = setTimeout(() => {
      setIsOnlineOpen(false);
    }, 280);
  };

  const cancelCloseOnlineTooltip = () => {
    if (onlineHoverTimeoutRef.current) clearTimeout(onlineHoverTimeoutRef.current);
  };

  const toggleOnlineTooltip = (elem: HTMLElement | null, isFromHeader = false) => {
    if (onlineHoverTimeoutRef.current) clearTimeout(onlineHoverTimeoutRef.current);
    if (isOnlineOpen) {
      setIsOnlineOpen(false);
    } else {
      updateTooltipPos(elem, isFromHeader);
      setIsOnlineOpen(true);
      refreshOnlineIfStale();
    }
  };

  const refreshOnlineIfStale = () => {
    const now = Date.now();
    if (now - lastPingTimeRef.current > 15000 && sessionUser) {
      lastPingTimeRef.current = now;
      const username = sessionUser.name || sessionUser.email || 'unknown';
      DataStore.pingOnline(username).then(stats => {
        if (stats) setOnlineStats(stats);
      });
    }
  };

  const onlineUsersList = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const addName = (rawName?: string) => {
      const name = String(rawName || '').trim();
      if (!name || name === 'unknown' || name === 'undefined' || name === 'null') return;
      if (!seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push(name);
      }
    };

    // Current logged in user first
    if (sessionUser?.name) {
      addName(sessionUser.name);
    } else if (sessionUser?.email) {
      addName(sessionUser.email);
    }

    // Backend returned online users (realtime from Apps Script CacheService)
    if (onlineStats?.onlineUsers && Array.isArray(onlineStats.onlineUsers) && onlineStats.onlineUsers.length > 0) {
      onlineStats.onlineUsers.forEach(u => addName(u));
    }

    // Locally registered users across tabs/sessions
    DataStore.getLocalOnlineUsers().forEach(u => addName(u));

    // Target count based on onlineCount
    const targetCount = onlineStats?.onlineCount ? Math.max(onlineStats.onlineCount, 1) : 1;

    // If targetCount > list.length: supplement with users who submitted workloads today or recently
    if (list.length < targetCount) {
      try {
        const nowStr = format(new Date(), 'yyyy-MM-dd');
        const allEntries = DataStore.getEntries();
        // Today entries
        allEntries
          .filter(e => e.date === nowStr)
          .forEach(e => {
            let mbrs = e.members || (e as any).workGroup || [];
            if (typeof mbrs === 'string') mbrs = [mbrs];
            if (Array.isArray(mbrs)) {
              mbrs.forEach(m => {
                if (list.length < targetCount) addName(m);
              });
            }
          });

        // Recent entries
        if (list.length < targetCount) {
          allEntries.slice(0, 50).forEach(e => {
            let mbrs = e.members || (e as any).workGroup || [];
            if (typeof mbrs === 'string') mbrs = [mbrs];
            if (Array.isArray(mbrs)) {
              mbrs.forEach(m => {
                if (list.length < targetCount) addName(m);
              });
            }
          });
        }
      } catch (err) {
        // ignore
      }
    }

    // If still less than onlineCount (due to legacy script not yet redeployed):
    if (list.length < targetCount) {
      const missingCount = targetCount - list.length;
      for (let k = 1; k <= missingCount; k++) {
        addName(`Người dùng trực tuyến #${list.length + 1}`);
      }
    }

    return list.length > 0 ? list : [sessionUser?.name || 'Người dùng hiện tại'];
  }, [onlineStats, sessionUser]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'app_online_users_registry') {
        const users = DataStore.getLocalOnlineUsers();
        if (users.length > 0) {
          setOnlineStats(prev => prev ? { ...prev, onlineUsers: Array.from(new Set([...(prev.onlineUsers || []), ...users])) } : prev);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const onlineFormattedText = useMemo(() => {
    return onlineUsersList.map((name, idx) => `${idx + 1} -> ${name}`).join('\n');
  }, [onlineUsersList]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inSidebarOnline = onlineContainerRef.current && onlineContainerRef.current.contains(target);
      const inHeaderOnline = headerOnlineRef.current && headerOnlineRef.current.contains(target);
      const inTooltip = onlineTooltipRef.current && onlineTooltipRef.current.contains(target);
      if (!inSidebarOnline && !inHeaderOnline && !inTooltip) {
        setIsOnlineOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOnlineOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (sessionUser) {
      const username = sessionUser.name || sessionUser.email || 'unknown';
      DataStore.pingOnline(username).then(stats => {
        if (stats) setOnlineStats(stats);
      });

      const interval = setInterval(() => {
        DataStore.pingOnline(username).then(stats => {
          if (stats) setOnlineStats(stats);
        });
      }, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [sessionUser]);
  
  const handleScroll = () => {
    if (scrollRef.current) {
        setShowScrollGroup(scrollRef.current.scrollTop > 100);
    }
  };

  const scrollToTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToBottom = () => scrollRef.current?.scrollTo({ top: scrollRef.current?.scrollHeight, behavior: 'smooth' });

  const [permissionsVersion, setPermissionsVersion] = useState(0);

  useEffect(() => {
    const handlePermissionsUpdated = () => {
      setPermissionsVersion(v => v + 1);
    };
    window.addEventListener('permissions_updated', handlePermissionsUpdated);
    return () => window.removeEventListener('permissions_updated', handlePermissionsUpdated);
  }, []);

  const roleStr = useMemo(() => {
    let r = sessionUser?.role || (sessionUser as any)?.chucDanh || (sessionUser as any)?.chucVu || '';
    const rawName = sessionUser?.name || '';
    const normName = rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();

    if (normName) {
      const members = DataStore.getMembers();
      const found = members.find(m => {
        const mNorm = String(m.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();
        return mNorm === normName;
      });
      if (found) {
        const fRole = found.role || (found as any).chucDanh || (found as any).chucVu || '';
        if (fRole) {
          r = r ? `${r}, ${fRole}` : fRole;
        }
      }
    }

    if (normName.includes('nguyen thanh phong') || normName.includes('thanh phong') || (sessionUser as any)?.email?.includes('phong7nt')) {
      const normR = r.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
      if (!normR.includes('doi truong')) {
        r = r ? `${r}, Đội trưởng` : 'Đội trưởng';
      }
    }

    return r;
  }, [sessionUser, refreshToggle]);

  const canViewOnlineUsers = useMemo(() => {
    return PermissionStore.hasActionAccess('view_online_users', roleStr);
  }, [roleStr, permissionsVersion]);

  const displayOnlineCount = useMemo(() => {
    if (onlineStats?.onlineCount) {
      return Math.max(onlineStats.onlineCount, onlineUsersList.length);
    }
    return Math.max(1, onlineUsersList.length);
  }, [onlineStats, onlineUsersList]);

  const displayTotalLogins = useMemo(() => {
    return onlineStats?.totalLogins || 1;
  }, [onlineStats]);

  // Fallback vars (deprecated by PermissionStore but kept for backwards compatibility in other parts)
  const isManagement = ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'].some(r => roleStr.toLowerCase().includes(r));
  const isDoiTruong = ['đội trưởng', 'giám đốc'].some(r => roleStr.toLowerCase().includes(r));

  const [taskStats, setTaskStats] = useState({ overdue: 0, warning: 0, ok: 0 });
  const [tutiUnprocessedCount, setTutiUnprocessedCount] = useState(0);

  useEffect(() => {
    if (sessionUser) {
       const members = DataStore.getMembers();
       const normName = String(sessionUser.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();
       const freshMember = members.find(m => {
         const mNorm = String(m.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();
         return mNorm === normName;
       });
       if (freshMember && (freshMember.role !== sessionUser.role || !sessionUser.role)) {
           const updated = { ...sessionUser, ...freshMember };
           sessionStorage.setItem('workload_user_session', JSON.stringify(updated));
           setSessionUser(updated);
       }
    }
  }, [refreshToggle, sessionUser?.name]);

  useEffect(() => {
    if (isManagement) {
      const today = new Date();
      today.setHours(0,0,0,0);
      let overdue = 0, warning = 0, ok = 0;
      const tasks = DataStore.getTasks().filter(t => t.status.toLowerCase() !== 'xong');
      
      tasks.forEach(t => {
          if (!t.deadline) { overdue++; return; }
          const parts = t.deadline.split('/');
          if (parts.length === 3) {
              const dDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
              const diffDays = Math.ceil((dDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays > 3) ok++;
              else if (diffDays >= 1) warning++;
              else overdue++;
          } else {
              overdue++;
          }
      });
      setTaskStats({ overdue, warning, ok });
      
      // Calculate tuti stats
      const tutiEntries = DataStore.getTutiEntries();
      const unprocessed = tutiEntries.filter(e => {
        if (e.ketLuan && e.ketLuan.trim().length > 0) return false;
        if (e.kiemTraTU && e.kiemTraTU.trim().length > 0) return false;
        if (e.kiemTraTI && e.kiemTraTI.trim().length > 0) return false;
        if (e.khac && e.khac.trim().length > 0) return false;
        if (e.nguoiKiemTra && e.nguoiKiemTra.trim().length > 0 && e.ngayCapNhat && e.ngayCapNhat.trim().length > 0) return false;
        return true;
      });
      setTutiUnprocessedCount(unprocessed.length);
    }
  }, [refreshToggle, isManagement]);

  const syncData = async () => {
    await DataStore.syncMasterData();
    setRefreshToggle(prev => prev + 1);
  };

  // Initial Sync from URL & refresh listener
  useEffect(() => {
    const handleRefresh = () => setRefreshToggle(prev => prev + 1);
    window.addEventListener('workload_updated', handleRefresh);
    
    // Check session
    const storedUser = sessionStorage.getItem('workload_user_session');
    if (storedUser) {
        try {
            let parsedUser = JSON.parse(storedUser);
            // Re-sync with DataStore in case role was updated
            const members = DataStore.getMembers();
            const freshMember = members.find(m => m.name === parsedUser.name);
            if (freshMember && freshMember.role !== parsedUser.role) {
                parsedUser = { ...parsedUser, ...freshMember };
                sessionStorage.setItem('workload_user_session', JSON.stringify(parsedUser));
            }

            setSessionUser(parsedUser);
            const _roleStr = parsedUser?.role ? parsedUser.role.toLowerCase() : '';
            const _isManagement = ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'].some(r => _roleStr.includes(r));
            if (_isManagement && !sessionStorage.getItem('task_stats_shown')) {
                showTaskAlert();
                sessionStorage.setItem('task_stats_shown', 'true');
            }
        } catch(e) {}
    }

    if (storedUser) {
       syncData(); // Only sink data directly if logged in. Otherwise Login component does it.
    }

    return () => window.removeEventListener('workload_updated', handleRefresh);
  }, []);

  const showTaskAlert = () => {
      const today = new Date();
      today.setHours(0,0,0,0);
      let overdue = 0, warning = 0, ok = 0;
      const tasks = DataStore.getTasks().filter(t => t.status.toLowerCase() !== 'xong');
      
      tasks.forEach(t => {
          if (!t.deadline) { overdue++; return; }
          const parts = t.deadline.split('/');
          if (parts.length === 3) {
              const dDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
              const diffDays = Math.ceil((dDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays > 3) ok++;
              else if (diffDays >= 1) warning++;
              else overdue++;
          } else {
              overdue++;
          }
      });
      setTimeout(() => {
          alert(`TIẾN ĐỘ CÔNG VIỆC:
- Số lượng Quá hạn: ${overdue}
- Sắp quá hạn (1-3 ngày): ${warning}
- Còn hạn: ${ok}`);
      }, 500);
  };

  const handleLogin = (user: SheetMember) => {
     sessionStorage.setItem('workload_user_session', JSON.stringify(user));
     setSessionUser(user);
     if (window.innerWidth < 768) setIsSidebarOpen(false);
     const _roleStr = user?.role ? user.role.toLowerCase() : '';
     const _isManagement = ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'].some(r => _roleStr.includes(r));
     if (_isManagement) {
         showTaskAlert();
         sessionStorage.setItem('task_stats_shown', 'true');
     }
     setRefreshToggle(prev => prev + 1);

     const username = user.name || user.email || 'unknown';
     DataStore.logInAction(username).then(stats => {
         if (stats) setOnlineStats(stats);
     });
  };

  const handleLogout = () => {
     sessionStorage.removeItem('workload_user_session');
     setSessionUser(null);
  };

  if (!dbReady) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!sessionUser) {
     return <Login onLoginSuccess={handleLogin} />;
  }

  const allTabs = [
    { id: "input", icon: ClipboardList, label: "Cập nhật", color: "blue" },
    { id: "report", icon: BarChart3, label: "Báo cáo", color: "blue" },
    { id: "stations", icon: Database, label: "Link báo cáo", color: "blue" },
    { id: "analysis", icon: TrendingUp, label: "Phân tích", color: "blue" },
    { id: "disconnect", icon: WifiOff, label: "Đo xa", color: "red" },
    { id: "search", icon: Search, label: "Tìm kiếm", color: "green" },
    { id: "progress", icon: CheckSquare, label: "Tiến độ CV", color: "amber" },
    { id: "tuti", icon: Activity, label: "TU - TI", color: "indigo" },
    { id: "plan_progress", icon: TrendingUp, label: "Tiến độ kế hoạch", color: "blue" },
    { id: "kthtdd", icon: FolderTree, label: "Kiện toàn HTDD", color: "teal" },
    { id: "birthday", icon: Award, label: "Công Đoàn", color: "rose" },
    { id: "sangtai", icon: Database, label: "KT sang tải", color: "amber" },
    { id: "warehouse", icon: Package, label: "Kho VTTB", color: "amber" },
    { id: "system", icon: Settings, label: "Hệ thống", color: "slate" }
  ];

    const tabs = allTabs.filter(tab => PermissionStore.hasTabAccess(tab.id, roleStr));

  const members = DataStore.getMembers();
  const today = new Date();
  const currDay = today.getDate();
  const currMonth = today.getMonth() + 1;
  const todayBirthdaysCount = members.filter(m => {
     if (!m.sinhNhat) return false;
     const parts = String(m.sinhNhat).split('/');
     if (parts.length >= 2) {
         return parseInt(parts[0], 10) === currDay && parseInt(parts[1], 10) === currMonth;
     }
     return false;
  }).length;


  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} text-slate-800 font-sans flex flex-col items-center bg-grid-slate-100`}>
      <div className="w-full max-w-7xl flex-1 flex flex-col shadow-xl bg-white/90 backdrop-blur-sm min-h-screen relative overflow-hidden">
        <VersionUpdateBanner />
        <div className="absolute inset-0 bg-white/40 pointer-events-none z-0" />
        
        {/* Header */}
        <header className="relative px-4 py-8 md:px-8 md:py-10 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0 z-10 overflow-hidden shadow-lg border-b border-white/20">
          {/* Seasonal Background */}
          <div className="absolute inset-0 z-0">
             <img src={theme.headerImg} className="w-full h-full object-cover object-center" alt="Seasonal Header" />
             <div className={`absolute inset-0 bg-gradient-to-r ${theme.overlay} mix-blend-multiply`}></div>
             <div className="absolute inset-0 bg-[#005a9c]/20 backdrop-blur-[2px]"></div>
          </div>
          
          <div className="flex flex-row items-center gap-3 w-full md:w-1/4 z-10 shrink-0 select-none">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl backdrop-blur-md transition-all border border-white/20 shadow-sm self-start mt-2"
              title="Hiện/Ẩn Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center md:items-start gap-2">
              <div className="bg-white/95 backdrop-blur-md p-2 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-white/40 inline-block">
                <img 
                  src="https://www.evnhcmc.vn/public/images/EVNHCMC2021.svg" 
                  alt="EVNHCMC Logo" 
                  className="h-8 md:h-10 object-contain" 
                />
              </div>
              <div className="text-[10px] sm:text-xs font-black text-white tracking-widest uppercase mt-0 drop-shadow-md whitespace-nowrap">
                Công ty Điện lực Vũng Tàu
              </div>
            </div>
          </div>
          
          <div className="flex-1 text-center z-10 w-full drop-shadow-xl">
            <h1 className="text-xl sm:text-2xl md:text-4xl font-display font-black tracking-tight text-white uppercase flex flex-col">
              <span className="leading-tight drop-shadow-lg">HỆ THỐNG ĐIỀU HÀNH</span>
              <span className={`text-xs sm:text-sm md:text-lg font-bold tracking-widest ${theme.accent} mt-1 drop-shadow-lg`}>& QUẢN TRỊ ĐỘI QLHTĐĐ</span>
            </h1>
          </div>
          
          <div className="w-full md:w-1/4 flex flex-row justify-center md:justify-end items-center gap-3 z-10 shrink-0">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-lg transition-all hover:bg-white/20">
               <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#005a9c] shadow-inner">
                  <UserIcon className="w-4 h-4" />
               </div>
               <div className="flex flex-col items-start leading-tight">
                 <span className="text-xs md:text-sm font-bold text-white drop-shadow-md">{sessionUser.name}</span>
                 <span className={`text-[10px] font-black ${theme.accent} uppercase tracking-wider drop-shadow-md`}>{sessionUser.team}</span>
               </div>
            </div>
            {!isSidebarOpen && (
              <div
                ref={headerOnlineRef}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOnlineTooltip(headerOnlineRef.current, true);
                }}
                onMouseEnter={() => openOnlineTooltip(headerOnlineRef.current, true)}
                onMouseLeave={closeOnlineTooltipWithDelay}
                title="Bấm để xem thông tin người dùng trực tuyến"
                className="flex items-center gap-2 bg-emerald-500/25 hover:bg-emerald-500/40 text-white border border-emerald-400/40 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md transition-all shadow-sm select-none cursor-pointer"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
                </span>
                <span>Online: {displayOnlineCount}</span>
                <span className="opacity-40">|</span>
                <span className="text-[11px] font-medium text-emerald-100">Login: {displayTotalLogins}</span>
              </div>
            )}
            <VersionSyncButton variant="pill" className="hidden sm:inline-flex" />
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="text-white hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors border border-transparent hover:border-white/30 backdrop-blur-md"
              title="Đổi mật khẩu"
            >
              <KeyRound className="w-5 h-5" />
            </button>
            {PermissionStore.hasActionAccess('config_system', roleStr) && (
            <button 
              onClick={() => setShowConfig(true)}
              className="text-white hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors border border-transparent hover:border-white/30 backdrop-blur-md"
              title="Cấu hình hệ thống"
            >
              <Settings className="w-5 h-5" />
            </button>
            )}
            <button 
              onClick={handleLogout}
              className="text-white hover:text-red-300 hover:bg-white/20 p-2 rounded-full transition-all hover:scale-105 border border-transparent hover:border-white/30 backdrop-blur-md"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden z-20">
          {/* Vertical Navigation Tabs */}
          <div className={`transition-all duration-300 ease-in-out bg-slate-200/50 shadow-inner overflow-y-auto hide-scrollbar z-10 shrink-0 py-3 relative border-slate-300 ${isSidebarOpen ? 'w-24 md:w-32 opacity-100 border-r' : 'w-0 opacity-0 px-0'}`}>
             <div className="flex flex-col space-y-2 min-h-max w-full pl-2 pr-0 relative z-20">
                {tabs.map(tab => {
                   const isActive = activeTab === tab.id;
                   const Icon = tab.icon;

                   return (
                      <button
                         key={tab.id}
                         onClick={() => { setActiveTab(tab.id as any); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                         className={`relative flex flex-col xl:flex-row items-center xl:items-start xl:justify-start gap-1.5 xl:gap-2.5 py-3 px-2 xl:px-4 text-sm font-bold transition-all group rounded-l-2xl ${
                           isActive 
                             ? `text-[#005a9c] bg-white z-20 -mr-[1px]` 
                             : `text-slate-500 hover:text-[#005a9c] hover:bg-white/60 z-10 -mr-[1px]`
                         }`}
                         style={{
                           boxShadow: isActive ? '-8px 6px 12px -6px rgba(0,0,0,0.12)' : 'none'
                         }}
                      >
                         {tab.id === 'birthday' && todayBirthdaysCount > 0 && (
                            <span className="absolute top-1 right-2 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-bounce shadow-md z-30 pointer-events-none">
                                {todayBirthdaysCount}
                            </span>
                         )}
                         {/* Tech/Digital Indicator for Active Tab */}
                         {isActive && (
                            <>
                                {/* Glowing left edge for 'digital' feel */}
                                <div className="absolute left-[3px] top-1/2 -translate-y-1/2 h-1/2 w-[3px] bg-[#f47920] rounded-full shadow-[0_0_8px_#f47920]"></div>
                                
                                {/* Fluid Curves (SVG) */}
                                <svg className="absolute -top-[16px] right-0 w-[16px] h-[16px] text-white z-20" fill="currentColor" viewBox="0 0 20 20">
                                   <path d="M20 20V0C20 11 11 20 0 20H20Z" />
                                </svg>
                                <svg className="absolute -bottom-[16px] right-0 w-[16px] h-[16px] text-white z-20" fill="currentColor" viewBox="0 0 20 20">
                                   <path d="M20 0V20C20 9 11 0 0 0H20Z" />
                                </svg>
                            </>
                         )}

                         <Icon className={`w-5 h-5 shrink-0 xl:mt-0.5 transition-transform duration-300 ${isActive ? 'text-[#f47920] scale-110 drop-shadow' : 'text-slate-400 group-hover:text-[#f47920] group-hover:scale-110'}`} />
                         
                         <span 
                           className={`uppercase text-[10px] xl:text-xs xl:text-left leading-tight text-center transition-all ${isActive ? 'drop-shadow-sm' : ''}`}
                         >
                           {tab.label}
                         </span>
                         
                         {/* Badges */}
                         {tab.id === 'progress' && taskStats.overdue > 0 && (
                            <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1 h-4 min-w-[16px] text-[10px] font-black bg-[#ed1c24] text-white rounded-full shadow-sm">
                               {taskStats.overdue}
                            </span>
                         )}
                         {tab.id === 'tuti' && tutiUnprocessedCount > 0 && (
                            <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1 h-4 min-w-[16px] text-[10px] font-black bg-[#ed1c24] text-white rounded-full shadow-sm">
                               {tutiUnprocessedCount}
                            </span>
                         )}
                      </button>
                   );
                })}
             </div>
             
             {/* Online Stats inside sidebar */}
             {isSidebarOpen && (
                <div ref={onlineContainerRef} className="mt-auto pt-6 pb-2 px-3 flex flex-col gap-2 relative z-20">
                   <div 
                      onClick={(e) => {
                         e.stopPropagation();
                         toggleOnlineTooltip(onlineContainerRef.current, false);
                      }}
                      onMouseEnter={() => openOnlineTooltip(onlineContainerRef.current, false)}
                      onMouseLeave={closeOnlineTooltipWithDelay}
                      role="button"
                      tabIndex={0}
                      title="Bấm để xem danh sách trực tuyến"
                      className="bg-white/80 hover:bg-white hover:border-emerald-300 hover:shadow-lg backdrop-blur-md shadow-[0_4px_12px_rgb(0,0,0,0.05)] border border-slate-200/50 rounded-xl p-3 flex flex-col gap-2 text-center transition-all select-none cursor-pointer group"
                   >
                      <div className="flex flex-col items-center">
                         <span className="flex items-center gap-1.5 text-[10px] text-slate-500 group-hover:text-emerald-700 uppercase font-black tracking-wider mb-0.5 transition-colors">
                            <span className="relative flex h-2 w-2">
                               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                               <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
                            </span>
                            Online
                         </span>
                         <span className="font-black text-slate-800 text-lg group-hover:text-emerald-600 transition-colors leading-none">{displayOnlineCount}</span>
                      </div>
                      <div className="border-t border-slate-200/60 pt-2 flex flex-col items-center">
                         <span className="text-slate-400 uppercase tracking-widest text-[9px] mb-0.5">Tổng Login</span>
                         <span className="font-bold text-slate-700 leading-none">{displayTotalLogins}</span>
                      </div>
                   </div>
                </div>
             )}
          </div>

          <main className="flex-1 flex flex-col relative z-20 bg-white min-w-0">
             <div className="flex-1 overflow-hidden flex flex-col relative">
          
          {/* Main Content Pane */}
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 flex flex-col min-w-0 overflow-y-auto scroll-smooth"
          >
            <div className={`flex-1 ${activeTab === 'birthday' ? 'p-2 md:p-4' : 'p-4 md:p-6 lg:p-8'} relative`}>
              <div className={`${activeTab === 'birthday' ? 'max-w-7xl' : 'max-w-6xl'} mx-auto h-full`}>
                {activeTab === "input" && (
                  <WorkloadForm onSaved={() => setRefreshToggle(prev => prev + 1)} refreshToggle={refreshToggle} isManagement={isManagement} />
                )}
                {activeTab === "report" && (
                  <Analytics refreshToggle={refreshToggle} sessionUser={sessionUser} />
                )}
                {activeTab === "stations" && (
                  <Stations refreshToggle={refreshToggle} />
                )}
                {activeTab === "analysis" && (
                  <AnalysisTab refreshToggle={refreshToggle} />
                )}
                {activeTab === "progress" && (
                  <ProgressTab refreshToggle={refreshToggle} sessionUser={sessionUser} theme={theme} />
                )}
                {activeTab === "plan_progress" && (
                  <PlanProgressTab refreshToggle={refreshToggle} />
                )}
                {activeTab === "tuti" && (
                  <TutiTab refreshToggle={refreshToggle} sessionUser={sessionUser} />
                )}
                {activeTab === "disconnect" && (
                  <DisconnectRateTab refreshToggle={refreshToggle} />
                )}
                {activeTab === "sangtai" && (
                  <SangTaiTab />
                )}
                {activeTab === "search" && (
                  <SearchTab />
                )}
                {activeTab === "warehouse" && (
                  <WarehouseTab />
                )}
                {activeTab === "birthday" && (
                  <BirthdayTab sessionUser={sessionUser} />
                )}
                {activeTab === "kthtdd" && (
                  <KthtddTab sessionUser={sessionUser} refreshToggle={refreshToggle} />
                )}
                {activeTab === "system" && (
                  <SystemTab />
                )}
              </div>
            </div>

            {/* Footer */}
            <footer className={`${theme.footerBg} p-4 mt-auto shrink-0 z-10 border-t border-white/10`}>
              <div className={`flex flex-col md:flex-row justify-between items-center text-[10px] sm:text-[11px] font-medium ${theme.footerText} uppercase tracking-wider gap-2`}>
                <div className={`text-center md:text-left ${theme.footerAccent} font-bold flex items-center justify-center md:justify-start gap-1.5`}>
                   <span>Mùa {theme.season === 'summer' ? 'Hạ' : theme.season === 'spring' ? 'Xuân' : theme.season === 'autumn' ? 'Thu' : 'Đông'}</span>
                   <span className="opacity-50">•</span>
                   <span className="opacity-90">Phiên bản</span>
                   <VersionSyncButton variant="pill" showText={false} className="!py-0.5 !px-2 !text-[10px] bg-black/20 hover:bg-black/30 border-black/10" />
                </div>
                <div className="text-center opacity-80">
                  Bản quyền thuộc EVN PCVT @2026
                </div>
                <div className="text-center md:text-right opacity-80">
                  Tác giả: Nguyễn Thành Phong
                </div>
              </div>
            </footer>
          </div>

          {/* Floating Scroll Controls */}
          {showScrollGroup && (
             <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
                <button 
                  onClick={scrollToTop}
                  className={`p-3 rounded-full bg-white/90 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.1)] border border-slate-200 text-[#005a9c] hover:bg-[#005a9c] hover:text-white transition-all duration-300 hover:scale-110`}
                  title="Cuộn lên đầu trang"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button 
                  onClick={scrollToBottom}
                  className={`p-3 rounded-full bg-white/90 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.1)] border border-slate-200 text-[#005a9c] hover:bg-[#005a9c] hover:text-white transition-all duration-300 hover:scale-110`}
                  title="Cuộn xuống cuối trang"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
             </div>
          )}
          </div>
        </main>
        </div>
        
        {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
        {showPasswordModal && sessionUser && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} sessionUser={sessionUser} />}

        {/* Online Users Tooltip Overlay */}
        {isOnlineOpen && (
          <div
            ref={onlineTooltipRef}
            style={{ 
              top: tooltipPos.top, 
              left: tooltipPos.left 
            }}
            onMouseEnter={cancelCloseOnlineTooltip}
            onMouseLeave={closeOnlineTooltipWithDelay}
            className="fixed z-50 w-72 md:w-80 bg-white/98 backdrop-blur-xl rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.2)] border border-emerald-300/80 p-3.5 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 transition-all select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                </span>
                <span className="text-xs font-black text-slate-800 tracking-wide uppercase">
                  {canViewOnlineUsers ? `Danh sách Online (${onlineUsersList.length})` : `Người dùng trực tuyến (${displayOnlineCount})`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOnlineOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {canViewOnlineUsers ? (
              /* Online List formatted: STT -> Tên người dùng */
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 max-h-64 overflow-y-auto space-y-1 font-mono text-xs select-text shadow-inner">
                {onlineUsersList.map((user, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-white hover:shadow-xs transition-colors group/item"
                  >
                    <span className="font-bold text-emerald-600 bg-emerald-100/80 border border-emerald-200/70 px-1.5 py-0.5 rounded text-[11px] shrink-0 select-none">
                      {idx + 1} -&gt;
                    </span>
                    <span className="font-semibold text-slate-800 break-words flex-1 group-hover/item:text-emerald-800">
                      {user}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* Notice for users without permission */
              <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Quyền truy cập hạn chế</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800/90">
                  Hiện có <b>{displayOnlineCount}</b> người dùng đang hoạt động ({displayTotalLogins} lượt đăng nhập).
                  <br />
                  Chỉ <b>Đội trưởng</b> (hoặc cấp được phân quyền trong tab Hệ thống) mới có quyền xem danh sách họ tên chi tiết.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
