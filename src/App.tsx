import { useState, useEffect, useRef } from "react";
import { ClipboardList, BarChart3, Database, TrendingUp, LogOut, User as UserIcon, CheckSquare, Settings, Activity, Menu, WifiOff, ChevronUp, ChevronDown, KeyRound, Search, Package } from "lucide-react";
import WorkloadForm from "./components/WorkloadForm";
import Analytics from "./components/Analytics";
import Stations from "./components/Stations";
import AnalysisTab from "./components/AnalysisTab";
import SearchTab from "./components/SearchTab";
import Login from "./components/Login";
import ProgressTab from "./components/ProgressTab";
import ConfigModal from "./components/ConfigModal";
import TutiTab from "./components/TutiTab";
import SangTaiTab from "./components/SangTaiTab";
import DisconnectRateTab from "./components/DisconnectRateTab";
import WarehouseTab from "./components/WarehouseTab";
import PlanProgressTab from "./components/PlanProgressTab";
import ChangePasswordModal from "./components/ChangePasswordModal";
import { DataStore, SheetMember } from "./store/DataStore";

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
  const [activeTab, setActiveTab] = useState<"input" | "report" | "stations" | "analysis" | "progress" | "tuti" | "disconnect" | "sangtai" | "warehouse">("input");
  const [refreshToggle, setRefreshToggle] = useState(0);

  useEffect(() => {
    DataStore.initDB().then(() => {
      setDbReady(true);
      DataStore.syncMasterData().then(() => setRefreshToggle(prev => prev + 1));
    });
  }, []);

  const [showConfig, setShowConfig] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const theme = getSeasonTheme();
  const [sessionUser, setSessionUser] = useState<SheetMember | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollGroup, setShowScrollGroup] = useState(false);
  
  const handleScroll = () => {
    if (scrollRef.current) {
        setShowScrollGroup(scrollRef.current.scrollTop > 100);
    }
  };

  const scrollToTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToBottom = () => scrollRef.current?.scrollTo({ top: scrollRef.current?.scrollHeight, behavior: 'smooth' });

  const roleStr = sessionUser?.role ? sessionUser.role.toLowerCase() : '';
  const isManagement = ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'].some(r => roleStr.includes(r));
  const isDoiTruong = ['đội trưởng', 'giám đốc'].some(r => roleStr.includes(r));

  const [taskStats, setTaskStats] = useState({ overdue: 0, warning: 0, ok: 0 });
  const [tutiUnprocessedCount, setTutiUnprocessedCount] = useState(0);

  useEffect(() => {
    if (sessionUser) {
       const members = DataStore.getMembers();
       const freshMember = members.find(m => m.name === sessionUser.name);
       if (freshMember && freshMember.role !== sessionUser.role) {
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
          alert(`TIẾN ĐỘ CÔNG VIỆC:\n- Số lượng Quá hạn: ${overdue}\n- Sắp quá hạn (1-3 ngày): ${warning}\n- Còn hạn: ${ok}`);
      }, 500);
  };

  const handleLogin = (user: SheetMember) => {
     sessionStorage.setItem('workload_user_session', JSON.stringify(user));
     setSessionUser(user);
     const _roleStr = user?.role ? user.role.toLowerCase() : '';
     const _isManagement = ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'].some(r => _roleStr.includes(r));
     if (_isManagement) {
         showTaskAlert();
         sessionStorage.setItem('task_stats_shown', 'true');
     }
     setRefreshToggle(prev => prev + 1);
  };

  const handleLogout = () => {
     sessionStorage.removeItem('workload_user_session');
     setSessionUser(null);
  };

  if (!dbReady) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!sessionUser) {
     return <Login onLoginSuccess={handleLogin} />;
  }

  const tabs: any[] = [
    { id: "input", icon: ClipboardList, label: "Cập nhật", color: "blue" },
    { id: "report", icon: BarChart3, label: "Báo cáo", color: "blue" },
    { id: "stations", icon: Database, label: "Link báo cáo", color: "blue" },
    { id: "analysis", icon: TrendingUp, label: "Phân tích", color: "blue" },
    { id: "disconnect", icon: WifiOff, label: "Đo xa", color: "red" },
    { id: "search", icon: Search, label: "Tìm kiếm", color: "green" },
      ];

  if (isManagement) {
    tabs.push({ id: "progress", icon: CheckSquare, label: "Tiến độ CV", color: "amber" });
    tabs.push({ id: "tuti", icon: Activity, label: "KT TU - TI", color: "indigo" });
    tabs.push({ id: "plan_progress", icon: TrendingUp, label: "Tiến độ kế hoạch", color: "blue" });
  }
  tabs.push({ id: "sangtai", icon: Database, label: "KT sang tải", color: "amber" });
  if (isDoiTruong) {
    tabs.push({ id: "warehouse", icon: Package, label: "Kho VTTB", color: "amber" });
  }


  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} text-slate-800 font-sans flex flex-col items-center bg-grid-slate-100`}>
      <div className="w-full max-w-7xl flex-1 flex flex-col shadow-xl bg-white/90 backdrop-blur-sm min-h-screen relative overflow-hidden">
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
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="text-white hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors border border-transparent hover:border-white/30 backdrop-blur-md"
              title="Đổi mật khẩu"
            >
              <KeyRound className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowConfig(true)}
              className="text-white hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors border border-transparent hover:border-white/30 backdrop-blur-md"
              title="Cấu hình hệ thống"
            >
              <Settings className="w-5 h-5" />
            </button>
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
                         onClick={() => setActiveTab(tab.id as any)}
                         className={`relative flex flex-col xl:flex-row items-center xl:items-start xl:justify-start gap-1.5 xl:gap-2.5 py-3 px-2 xl:px-4 text-sm font-bold transition-all group rounded-l-2xl ${
                           isActive 
                             ? `text-[#005a9c] bg-white z-20 -mr-[1px]` 
                             : `text-slate-500 hover:text-[#005a9c] hover:bg-white/60 z-10 -mr-[1px]`
                         }`}
                         style={{
                           boxShadow: isActive ? '-8px 6px 12px -6px rgba(0,0,0,0.12)' : 'none'
                         }}
                      >
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
          </div>

          <main className="flex-1 flex flex-col relative z-20 bg-white min-w-0">
             <div className="flex-1 overflow-hidden flex flex-col relative">
          
          {/* Main Content Pane */}
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 flex flex-col min-w-0 overflow-y-auto scroll-smooth"
          >
            <div className="flex-1 p-4 md:p-6 lg:p-8 relative">
              <div className="max-w-6xl mx-auto h-full">
                {activeTab === "input" && (
                  <WorkloadForm onSaved={() => setRefreshToggle(prev => prev + 1)} refreshToggle={refreshToggle} isManagement={isManagement} />
                )}
                {activeTab === "report" && (
                  <Analytics refreshToggle={refreshToggle} />
                )}
                {activeTab === "stations" && (
                  <Stations refreshToggle={refreshToggle} />
                )}
                {activeTab === "analysis" && (
                  <AnalysisTab refreshToggle={refreshToggle} />
                )}
                {activeTab === "progress" && isManagement && (
                  <ProgressTab refreshToggle={refreshToggle} sessionUser={sessionUser} theme={theme} />
                )}
                {activeTab === "plan_progress" && isManagement && (
                  <PlanProgressTab refreshToggle={refreshToggle} />
                )}
                {activeTab === "tuti" && isManagement && (
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
              </div>
            </div>

            {/* Footer */}
            <footer className={`${theme.footerBg} p-4 mt-auto shrink-0 z-10 border-t border-white/10`}>
              <div className={`flex flex-col md:flex-row justify-between items-center text-[10px] sm:text-[11px] font-medium ${theme.footerText} uppercase tracking-wider gap-2`}>
                <div className={`text-center md:text-left ${theme.footerAccent} font-bold`}>
                   Mùa {theme.season === 'summer' ? 'Hạ' : theme.season === 'spring' ? 'Xuân' : theme.season === 'autumn' ? 'Thu' : 'Đông'} • Phiên bản 2026.5.1
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
      </div>
    </div>
  );
}
