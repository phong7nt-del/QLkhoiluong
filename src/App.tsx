import { useState, useEffect } from "react";
import { ClipboardList, BarChart3, Database, TrendingUp, LogOut, User as UserIcon, CheckSquare, XSquare } from "lucide-react";
import WorkloadForm from "./components/WorkloadForm";
import Analytics from "./components/Analytics";
import Stations from "./components/Stations";
import AnalysisTab from "./components/AnalysisTab";
import Login from "./components/Login";
import ProgressTab from "./components/ProgressTab";
import { DataStore, SheetMember } from "./store/DataStore";

export default function App() {
  const [activeTab, setActiveTab] = useState<"input" | "report" | "stations" | "analysis" | "progress">("input");
  const [refreshToggle, setRefreshToggle] = useState(0);
  const [sessionUser, setSessionUser] = useState<SheetMember | null>(null);
  const isPhong = sessionUser?.name ? sessionUser.name.normalize('NFC').toLowerCase().replace(/\s+/g, '') === 'nguyễnthànhphong' : false;

  const [taskStats, setTaskStats] = useState({ overdue: 0, warning: 0, ok: 0 });

  useEffect(() => {
    if (isPhong) {
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
  }, [refreshToggle, isPhong]);

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
            const _isPhong = parsedUser?.name ? parsedUser.name.normalize('NFC').toLowerCase().replace(/\s+/g, '') === 'nguyễnthànhphong' : false;
            if (_isPhong && !sessionStorage.getItem('task_stats_shown')) {
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
     const _isPhong = user?.name ? user.name.normalize('NFC').toLowerCase().replace(/\s+/g, '') === 'nguyễnthànhphong' : false;
     if (_isPhong) {
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center">
      <div className="w-full max-w-7xl flex-1 flex flex-col shadow-xl bg-white min-h-screen">
        
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0 relative overflow-hidden">
          {/* Subtle gradient background element */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col items-center md:items-start gap-1 w-full md:w-1/4 z-10">
            <img 
              src="https://www.evnhcmc.vn/public/images/EVNHCMC2021.svg" 
              alt="EVNHCMC Logo" 
              className="h-10 object-contain drop-shadow-sm" 
            />
            <div className="text-[11px] font-bold text-blue-700 tracking-wide uppercase mt-1">
              Công ty Điện lực Vũng Tàu
            </div>
          </div>
          
          <div className="flex-1 text-center z-10">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-800 to-blue-600 uppercase">
              Hệ Thống Quản Lý Năng Suất Đội QLHTĐĐ
            </h1>
          </div>
          
          <div className="w-full md:w-1/4 flex flex-col md:flex-row justify-center md:justify-end items-center gap-3 z-10">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
               <UserIcon className="w-4 h-4 text-blue-600" />
               <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">{sessionUser.name}</span>
               <div className="w-px h-4 bg-slate-300 mx-1"></div>
               <span className="text-xs font-bold text-slate-500 uppercase">{sessionUser.team}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col relative">


          
          <div className="bg-slate-50/80 border-b border-gray-200 sticky top-0 z-20 backdrop-blur-md">
            <div className="flex px-4 md:px-8 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setActiveTab("input")}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "input"
                    ? "text-blue-600 border-blue-600 bg-blue-50/50"
                    : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100/50"
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                Cập nhật
              </button>
              <button
                onClick={() => setActiveTab("report")}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "report"
                    ? "text-blue-600 border-blue-600 bg-blue-50/50"
                    : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100/50"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Báo cáo
              </button>
              <button
                onClick={() => setActiveTab("stations")}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "stations"
                    ? "text-blue-600 border-blue-600 bg-blue-50/50"
                    : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100/50"
                }`}
              >
                <Database className="w-4 h-4" />
                Trạm BA
              </button>
              <button
                onClick={() => setActiveTab("analysis")}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "analysis"
                    ? "text-blue-600 border-blue-600 bg-blue-50/50"
                    : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100/50"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Phân tích
              </button>
              {isPhong && (
                <button
                  onClick={() => setActiveTab("progress")}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${
                    activeTab === "progress"
                      ? "text-blue-600 border-blue-600 bg-blue-50/50"
                      : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100/50"
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  Tiến độ CV
                </button>
              )}
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
              {activeTab === "progress" && isPhong && (
                <ProgressTab refreshToggle={refreshToggle} />
              )}
            </div>
          </div>

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
