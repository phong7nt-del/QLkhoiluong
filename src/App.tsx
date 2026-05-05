import { useState, useEffect } from "react";
import { ClipboardList, BarChart3, Database, Settings as SettingsIcon } from "lucide-react";
import WorkloadForm from "./components/WorkloadForm";
import Analytics from "./components/Analytics";
import Settings from "./components/Settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<"input" | "report" | "config">("input");
  const [refreshToggle, setRefreshToggle] = useState(0);

  // Expose an event for components to trigger a global refresh
  useEffect(() => {
    const handleRefresh = () => setRefreshToggle(prev => prev + 1);
    window.addEventListener('workload_updated', handleRefresh);
    return () => window.removeEventListener('workload_updated', handleRefresh);
  }, []);

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans p-4 sm:p-8">
      <div className="max-w-6xl mx-auto border-[4px] sm:border-[8px] lg:border-[12px] border-[#141414] bg-[#E4E3E0] flex flex-col min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-4rem)] shadow-[8px_8px_0_rgba(20,20,20,0.2)]">
        <header className="bg-[#D6D4D1] border-b border-[#141414] p-6 lg:p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#141414] p-2">
              <Database className="w-5 h-5 text-[#E4E3E0]" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase whitespace-nowrap">
              Quản Lý Khối Lượng
            </h1>
          </div>
          <div className="text-[10px] font-mono opacity-50 uppercase tracking-widest hidden sm:block text-right">
            System Status<br/>
            <span className="text-green-700 font-bold flex items-center gap-2 justify-end mt-1">
              <span className="w-2 h-2 rounded-full bg-green-600 block"></span>
              ONLINE
            </span>
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
              onClick={() => setActiveTab("config")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
                activeTab === "config"
                  ? "bg-[#141414] text-[#E4E3E0]"
                  : "text-[#141414] hover:bg-[#F5F4F2]"
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              03. Cấu hình
            </button>
          </div>

          <div className="flex-1">
            {activeTab === "input" && (
              <WorkloadForm onSaved={() => setRefreshToggle(prev => prev + 1)} />
            )}
            {activeTab === "report" && (
              <Analytics refreshToggle={refreshToggle} />
            )}
            {activeTab === "config" && (
              <Settings />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
