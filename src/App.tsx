import { useState, useEffect } from "react";
import { ClipboardList, BarChart3, Settings as SettingsIcon, RefreshCw, Database, TrendingUp } from "lucide-react";
import WorkloadForm from "./components/WorkloadForm";
import Analytics from "./components/Analytics";
import Stations from "./components/Stations";
import AnalysisTab from "./components/AnalysisTab";
import ConfigModal from "./components/ConfigModal";
import { DataStore } from "./store/DataStore";

export default function App() {
  const [activeTab, setActiveTab] = useState<"input" | "report" | "stations" | "analysis">("input");
  const [refreshToggle, setRefreshToggle] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Initial Sync from URL & refresh listener
  useEffect(() => {
    const handleRefresh = () => setRefreshToggle(prev => prev + 1);
    window.addEventListener('workload_updated', handleRefresh);
    
    syncData();

    return () => window.removeEventListener('workload_updated', handleRefresh);
  }, []);

  const syncData = async () => {
    setIsSyncing(true);
    await DataStore.syncMasterData();
    setIsSyncing(false);
    setRefreshToggle(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans p-4 sm:p-8">
      <div className="max-w-6xl mx-auto border-[4px] sm:border-[8px] lg:border-[12px] border-[#141414] bg-[#E4E3E0] flex flex-col min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-4rem)] shadow-[8px_8px_0_rgba(20,20,20,0.2)]">
        <header className="bg-[#D6D4D1] border-b border-[#141414] p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
            <div className="bg-[#141414] p-2">
              <Database className="w-5 h-5 text-[#E4E3E0]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tighter uppercase whitespace-nowrap">
              Quản Lý Khối Lượng
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-center md:justify-end">
            <div className="text-[10px] font-mono opacity-50 uppercase tracking-widest hidden lg:block text-right">
              System Status<br/>
              <span className="text-green-700 font-bold flex items-center gap-2 justify-end mt-1">
                <span className="w-2 h-2 rounded-full bg-green-600 block"></span>
                ONLINE
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button 
                onClick={() => setShowConfig(true)}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 border border-[#141414] bg-transparent text-[#141414] hover:bg-[#141414] hover:text-white transition-colors"
                title="Cấu hình Google Script"
              >
                <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button 
                onClick={syncData}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 border-2 border-[#141414] bg-[#141414] text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-transform hover:-translate-y-1 shadow-[4px_4px_0_#141414]"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Đang Tải...' : 'Tải Dữ Liệu'}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col p-6 lg:p-8">
          <div className="flex border border-[#141414] w-fit mb-8 bg-white overflow-hidden shadow-[4px_4px_0_#141414] flex-wrap">
            <button
              onClick={() => setActiveTab("input")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
                activeTab === "input"
                  ? "bg-[#141414] text-[#E4E3E0]"
                  : "text-[#141414] hover:bg-[#F5F4F2]"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              01. Cập nhật
            </button>
            <div className="w-px bg-[#141414] hidden sm:block"></div>
            <button
              onClick={() => setActiveTab("report")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
                activeTab === "report"
                  ? "bg-[#141414] text-[#E4E3E0]"
                  : "text-[#141414] hover:bg-[#F5F4F2]"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              02. Báo cáo
            </button>
            <div className="w-px bg-[#141414] hidden sm:block"></div>
            <button
              onClick={() => setActiveTab("stations")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
                activeTab === "stations"
                  ? "bg-[#141414] text-[#E4E3E0]"
                  : "text-[#141414] hover:bg-[#F5F4F2]"
              }`}
            >
              <Database className="w-4 h-4" />
              03. Trạm BA
            </button>
            <div className="w-px bg-[#141414] hidden sm:block"></div>
            <button
              onClick={() => setActiveTab("analysis")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
                activeTab === "analysis"
                  ? "bg-[#141414] text-[#E4E3E0]"
                  : "text-[#141414] hover:bg-[#F5F4F2]"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              04. Phân tích
            </button>
          </div>

          <div className="flex-1">
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
          </div>
        </main>
      </div>

      {showConfig && (
        <ConfigModal onClose={() => {
          setShowConfig(false);
          setRefreshToggle(prev => prev + 1); // trigger reload to pick up new teams/members
        }} />
      )}
    </div>
  );
}
