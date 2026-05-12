import { useState, useEffect } from "react";
import { ClipboardList, BarChart3, Database, TrendingUp, LogOut, User as UserIcon, CheckSquare, XSquare, Settings } from "lucide-react";
import WorkloadForm from "./components/WorkloadForm";
import Analytics from "./components/Analytics";
import Stations from "./components/Stations";
import AnalysisTab from "./components/AnalysisTab";
import Login from "./components/Login";
import ProgressTab from "./components/ProgressTab";
import ConfigModal from "./components/ConfigModal";
import { DataStore, SheetMember } from "./store/DataStore";

export default function App() {
  const [activeTab, setActiveTab] = useState<"input" | "report" | "stations" | "analysis" | "progress">("input");
  const [refreshToggle, setRefreshToggle] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [sessionUser, setSessionUser] = useState<SheetMember | null>(null);
  const roleStr = sessionUser?.role ? sessionUser.role.toLowerCase() : '';
  const isManagement = ['đội trưởng', 'đội phó', 'tổ trưởng', 'tổ phó'].some(r => roleStr.includes(r));
  const isDoiTruong = roleStr.includes('đội trưởng');

  const [taskStats, setTaskStats] = useState({ overdue: 0, warning: 0, ok: 0 });

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
            const parsedUser = JSON.parse(storedUser);
            setSessionUser(parsedUser);
            const _roleStr = parsedUser?.role ? parsedUser.role.toLowerCase() : '';
            const _isManagement = ['đội trưởng', 'đội phó', 'tổ trưởng', 'tổ phó'].some(r => _roleStr.includes(r));
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
     const _isManagement = ['đội trưởng', 'đội phó', 'tổ trưởng', 'tổ phó'].some(r => _roleStr.includes(r));
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center bg-grid-slate-100">
      <div className="w-full max-w-7xl flex-1 flex flex-col shadow-xl bg-white/90 backdrop-blur-sm min-h-screen relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-transparent pointer-events-none z-0" />
        
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0 relative z-10">
          {/* Subtle gradient background element */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col items-center md:items-start gap-1 w-full md:w-1/4 z-10 shrink-0">
            <img 
              src="https://www.evnhcmc.vn/public/images/EVNHCMC2021.svg" 
              alt="EVNHCMC Logo" 
              className="h-10 object-contain drop-shadow-sm" 
            />
            <div className="text-[10px] sm:text-[11px] font-bold text-blue-700 tracking-wider uppercase mt-1">
              Công ty Điện lực Vũng Tàu
            </div>
          </div>
          
          <div className="flex-1 text-center z-10 w-full">
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-600 uppercase flex flex-col">
              <span className="leading-tight">Hệ Thống Điều Hành</span>
              <span className="text-base sm:text-lg font-bold tracking-widest text-slate-500 mt-0.5">& QUẢN TRỊ NĂNG SUẤT ĐỘI QLHTĐĐ</span>
            </h1>
          </div>
          
          <div className="w-full md:w-1/4 flex flex-row justify-center md:justify-end items-center gap-3 z-10 shrink-0">
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200 shadow-sm transition-all hover:bg-white hover:shadow-md">
               <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white ring-2 ring-white/50 shadow-sm">
                  <UserIcon className="w-4 h-4" />
               </div>
               <div className="flex flex-col items-start leading-tight">
                 <span className="text-sm font-bold text-slate-800">{sessionUser.name}</span>
                 <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{sessionUser.team}</span>
               </div>
            </div>
            {/* {isManagement && (
              <button 
                onClick={() => setShowConfig(true)}
                className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-full transition-colors"
                title="Cấu hình hệ thống"
              >
                <Settings className="w-4 h-4" />
              </button>
            )} */}
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all hover:scale-105"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col relative z-10">


          
          <div className="bg-transparent sticky top-0 z-20 pt-4 pb-2 px-4 md:px-8">
            <div className="flex overflow-x-auto hide-scrollbar gap-2 justify-start sm:justify-center">
               <div className="bg-white/80 backdrop-blur-xl p-1.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 flex items-center gap-1">
                <button
                  onClick={() => setActiveTab("input")}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold tracking-wide transition-all rounded-xl whitespace-nowrap ${
                    activeTab === "input"
                      ? "text-blue-700 bg-blue-50 shadow-sm border border-blue-100/50"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <ClipboardList className={`w-4 h-4 transition-colors ${activeTab === "input" ? "text-blue-600" : "text-slate-400"}`} />
                  Cập nhật
                </button>
                <button
                  onClick={() => setActiveTab("report")}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold tracking-wide transition-all rounded-xl whitespace-nowrap ${
                    activeTab === "report"
                      ? "text-blue-700 bg-blue-50 shadow-sm border border-blue-100/50"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <BarChart3 className={`w-4 h-4 transition-colors ${activeTab === "report" ? "text-blue-600" : "text-slate-400"}`} />
                  Báo cáo
                </button>
                <button
                  onClick={() => setActiveTab("stations")}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold tracking-wide transition-all rounded-xl whitespace-nowrap ${
                    activeTab === "stations"
                      ? "text-blue-700 bg-blue-50 shadow-sm border border-blue-100/50"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <Database className={`w-4 h-4 transition-colors ${activeTab === "stations" ? "text-blue-600" : "text-slate-400"}`} />
                  Trạm BA
                </button>
                <button
                  onClick={() => setActiveTab("analysis")}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold tracking-wide transition-all rounded-xl whitespace-nowrap ${
                    activeTab === "analysis"
                      ? "text-blue-700 bg-blue-50 shadow-sm border border-blue-100/50"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <TrendingUp className={`w-4 h-4 transition-colors ${activeTab === "analysis" ? "text-blue-600" : "text-slate-400"}`} />
                  Phân tích
                </button>
                {isManagement && (
                  <button
                    onClick={() => setActiveTab("progress")}
                    className={`flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-bold tracking-wide transition-all rounded-xl whitespace-nowrap ${
                      activeTab === "progress"
                        ? "text-amber-700 bg-amber-50 shadow-sm border border-amber-200/50"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <CheckSquare className={`w-4 h-4 mr-0.5 transition-colors ${activeTab === "progress" ? "text-amber-600" : "text-slate-400"}`} />
                    Tiến độ CV
                    {taskStats.overdue > 0 && (
                       <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black bg-red-100 border border-red-200 text-red-700 rounded-md shadow-sm">
                          {taskStats.overdue}
                       </span>
                    )}
                    {taskStats.warning > 0 && (
                       <span className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-md shadow-sm border ${taskStats.overdue > 0 ? 'ml-0.5' : 'ml-1'} bg-amber-100 border-amber-300 text-amber-700`}>
                          {taskStats.warning}
                       </span>
                    )}
                  </button>
                )}
               </div>
            </div>
          </div>

          <div className="flex-1 p-4 md:p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
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
            </div>
          </div>

          {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}

          {/* Footer */}
          <footer className="bg-slate-50 border-t border-slate-200 p-4 mt-auto">
            <div className="flex flex-col md:flex-row justify-between items-center text-[11px] font-mono font-medium text-slate-500 uppercase tracking-wider">
              <div className="md:w-1/3">
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
        </main>
      </div>
    </div>
  );
}
