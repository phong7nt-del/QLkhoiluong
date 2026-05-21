import { useState, useEffect } from "react";
import { ClipboardList, BarChart3, Database, TrendingUp, LogOut, User as UserIcon, CheckSquare, Settings, Activity, Menu, WifiOff } from "lucide-react";
import WorkloadForm from "./components/WorkloadForm";
import Analytics from "./components/Analytics";
import Stations from "./components/Stations";
import AnalysisTab from "./components/AnalysisTab";
import Login from "./components/Login";
import ProgressTab from "./components/ProgressTab";
import ConfigModal from "./components/ConfigModal";
import TutiTab from "./components/TutiTab";
import DisconnectRateTab from "./components/DisconnectRateTab";
import { DataStore, SheetMember } from "./store/DataStore";

export default function App() {
  const [activeTab, setActiveTab] = useState<"input" | "report" | "stations" | "analysis" | "progress" | "tuti" | "disconnect">("input");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [sessionUser, setSessionUser] = useState<SheetMember | null>(null);
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
      const unprocessed = tutiEntries.filter(e => !e.ketLuan || (e.ketLuan !== 'Đúng' && e.ketLuan !== 'Sai'));
      setTutiUnprocessedCount(unprocessed.length);
    }
  }, [refreshToggle, isManagement]);

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

  const syncData = async () => {
    await DataStore.syncMasterData();
    setRefreshToggle(prev => prev + 1);
  };

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

  if (!sessionUser) {
     return <Login onLoginSuccess={handleLogin} />;
  }

  const tabs: any[] = [
    { id: "input", icon: ClipboardList, label: "Cập nhật", color: "blue" },
    { id: "report", icon: BarChart3, label: "Báo cáo", color: "blue" },
    { id: "stations", icon: Database, label: "Trạm và Xử lý đấu tắt", color: "blue" },
    { id: "analysis", icon: TrendingUp, label: "Phân tích", color: "blue" },
    { id: "disconnect", icon: WifiOff, label: "Tỷ lệ mất kết nối", color: "red" },
  ];

  if (isManagement) {
    tabs.push({ id: "progress", icon: CheckSquare, label: "Tiến độ CV", color: "amber" });
    tabs.push({ id: "tuti", icon: Activity, label: "KT TU - TI", color: "indigo" });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center bg-grid-slate-100">
      <div className="w-full max-w-7xl flex-1 flex flex-col shadow-xl bg-white/90 backdrop-blur-sm min-h-screen relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-transparent pointer-events-none z-0" />
        
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 shrink-0 relative z-10">
          {/* Subtle gradient background element */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col items-center md:items-start gap-1 w-full md:w-1/4 z-10 shrink-0">
            <img 
              src="https://www.evnhcmc.vn/public/images/EVNHCMC2021.svg" 
              alt="EVNHCMC Logo" 
              className="h-8 md:h-10 object-contain drop-shadow-sm" 
            />
            <div className="text-[9px] sm:text-[11px] font-bold text-blue-700 tracking-wider uppercase mt-1">
              Công ty Điện lực Vũng Tàu
            </div>
          </div>
          
          <div className="flex-1 text-center z-10 w-full">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-600 uppercase flex flex-col">
              <span className="leading-tight">Hệ Thống Điều Hành</span>
              <span className="text-xs sm:text-sm md:text-lg font-bold tracking-widest text-slate-500 mt-0.5">& QUẢN TRỊ NĂNG SUẤT ĐỘI QLHTĐĐ</span>
            </h1>
          </div>
          
          <div className="w-full md:w-1/4 flex flex-row justify-center md:justify-end items-center gap-2 md:gap-3 z-10 shrink-0">
            <div className="flex items-center gap-2 md:gap-3 bg-white/60 backdrop-blur-sm px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-slate-200 shadow-sm transition-all hover:bg-white hover:shadow-md">
               <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white ring-2 ring-white/50 shadow-sm">
                  <UserIcon className="w-3 h-3 md:w-4 md:h-4" />
               </div>
               <div className="flex flex-col items-start leading-tight">
                 <span className="text-xs md:text-sm font-bold text-slate-800">{sessionUser.name}</span>
                 <span className="text-[9px] md:text-[10px] font-bold text-blue-600 uppercase tracking-wider">{sessionUser.team}</span>
               </div>
            </div>
            <button 
              onClick={() => setShowConfig(true)}
              className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-full transition-colors"
              title="Cấu hình hệ thống"
            >
              <Settings className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 md:p-2 rounded-full transition-all hover:scale-105"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-row relative z-10 overflow-hidden">
          
          {/* Vertical Sidebar */}
          <div className={`flex flex-col bg-white/80 backdrop-blur-xl border-r border-slate-200/60 shadow-[8px_0_30px_rgb(0,0,0,0.04)] z-20 transition-all duration-300 ease-in-out shrink-0 overflow-y-auto hide-scrollbar ${sidebarOpen ? 'w-48' : 'w-12 sm:w-16'}`}>
             <button 
                onClick={() => setSidebarOpen(!sidebarOpen)} 
                className="w-full flex items-center justify-center p-3 sm:p-4 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors border-b border-slate-100"
                title="Mở rộng / Thu gọn tab"
             >
                <Menu className="w-5 h-5 md:w-6 md:h-6" />
             </button>
             
             <div className="flex-1 flex flex-col gap-2 p-2">
                {tabs.map(tab => {
                   const isActive = activeTab === tab.id;
                   const activeColors = tab.color === 'blue' 
                      ? "text-blue-700 bg-blue-50/80 border-blue-200" 
                      : tab.color === 'amber'
                      ? "text-amber-700 bg-amber-50/80 border-amber-200"
                      : "text-indigo-700 bg-indigo-50/80 border-indigo-200";
                   
                   const idleColors = "text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-transparent";
                   
                   const Icon = tab.icon;

                   return (
                      <button
                         key={tab.id}
                         onClick={() => setActiveTab(tab.id as any)}
                         className={`relative flex items-center justify-center transition-all duration-300 rounded-xl border ${isActive ? activeColors : idleColors} ${sidebarOpen ? 'flex-row p-3 w-full justify-start gap-3' : 'flex-col py-4 w-full'}`}
                      >
                         <Icon className={`w-5 h-5 shrink-0 ${isActive ? '' : 'opacity-80'}`} />
                         
                         {sidebarOpen ? (
                            <span className="font-bold text-[13px] whitespace-nowrap">{tab.label}</span>
                         ) : (
                            <div className="mt-4 flex flex-col items-center justify-center h-24" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                               <span className="font-bold text-[11px] tracking-widest whitespace-nowrap uppercase">
                                  {tab.label}
                               </span>
                            </div>
                         )}

                         {/* Badges */}
                         {tab.id === 'progress' && taskStats.overdue > 0 && sidebarOpen && (
                            <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-[10px] font-black bg-red-100 border border-red-200 text-red-700 rounded-md shadow-sm">
                               {taskStats.overdue}
                            </span>
                         )}
                         {tab.id === 'progress' && taskStats.overdue > 0 && !sidebarOpen && (
                            <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[9px] font-black bg-red-500 text-white rounded-full shadow-sm">
                               {taskStats.overdue}
                            </span>
                         )}
                         {tab.id === 'tuti' && tutiUnprocessedCount > 0 && sidebarOpen && (
                            <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-[10px] font-black bg-red-100 border border-red-200 text-red-700 rounded-md shadow-sm">
                               {tutiUnprocessedCount}
                            </span>
                         )}
                         {tab.id === 'tuti' && tutiUnprocessedCount > 0 && !sidebarOpen && (
                            <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[9px] font-black bg-red-500 text-white rounded-full shadow-sm">
                               {tutiUnprocessedCount}
                            </span>
                         )}
                      </button>
                   );
                })}
             </div>
          </div>

          {/* Main Content Pane */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            <div className="flex-1 p-4 md:p-6 lg:p-8">
              <div className="max-w-6xl mx-auto h-full">
                {activeTab === "input" && (
                  <WorkloadForm onSaved={() => setRefreshToggle(prev => prev + 1)} refreshToggle={refreshToggle} />
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
                  <ProgressTab refreshToggle={refreshToggle} sessionUser={sessionUser} />
                )}
                {activeTab === "tuti" && isManagement && (
                  <TutiTab refreshToggle={refreshToggle} sessionUser={sessionUser} />
                )}
                {activeTab === "disconnect" && (
                  <DisconnectRateTab refreshToggle={refreshToggle} />
                )}
              </div>
            </div>

            {/* Footer */}
            <footer className="bg-slate-50 border-t border-slate-200 p-4 mt-auto">
              <div className="flex flex-col md:flex-row justify-between items-center text-[11px] font-mono font-medium text-slate-500 uppercase tracking-wider">
                <div className="md:w-1/3 text-center md:text-left mb-2 md:mb-0">
                   Version 2026.5.1
                </div>
                <div className="md:w-1/3 text-center mb-2 md:mb-0">
                  bản quyền thuộc PCVT @2026
                </div>
                <div className="md:w-1/3 text-center md:text-right">
                  Tác giả: Nguyễn Thành Phong
                </div>
              </div>
            </footer>
          </div>
        </main>
        
        {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
      </div>
    </div>
  );
}
