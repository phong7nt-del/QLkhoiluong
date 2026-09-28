import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  ShieldAlert, 
  ArrowRight, 
  ExternalLink, 
  ClipboardCheck, 
  Gauge, 
  BookOpen, 
  Globe, 
  Database, 
  BarChart3, 
  FileText, 
  Layers, 
  Bell, 
  CheckCircle2, 
  Settings,
  Link2,
  FolderOpen
} from 'lucide-react';
import { DataStore, ExternalReportLink } from '../store/DataStore';

interface StationsProps {
  refreshToggle?: number;
}

export default function Stations({ refreshToggle }: StationsProps) {
  const [links, setLinks] = useState<ExternalReportLink[]>(() => DataStore.getExternalReportLinks());

  const reloadLinks = () => {
    setLinks(DataStore.getExternalReportLinks());
  };

  useEffect(() => {
    reloadLinks();

    const handleLinksChanged = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setLinks(e.detail);
      } else {
        reloadLinks();
      }
    };

    window.addEventListener('external_report_links_changed', handleLinksChanged);
    window.addEventListener('storage', reloadLinks);

    return () => {
      window.removeEventListener('external_report_links_changed', handleLinksChanged);
      window.removeEventListener('storage', reloadLinks);
    };
  }, [refreshToggle]);

  const renderIcon = (iconName?: string, className = "w-8 h-8 text-[#141414]") => {
    const key = (iconName || '').toLowerCase().trim();
    switch (key) {
      case 'zap':
      case 'power':
      case 'dien':
        return <Zap className={className} />;
      case 'shield':
      case 'shieldalert':
      case 'baove':
        return <ShieldAlert className={className} />;
      case 'clipboard':
      case 'clipboardcheck':
      case 'kiemtra':
        return <ClipboardCheck className={className} />;
      case 'gauge':
      case 'dongho':
      case 'tiendo':
        return <Gauge className={className} />;
      case 'book':
      case 'bookopen':
      case 'onthi':
      case 'hoc':
        return <BookOpen className={className} />;
      case 'globe':
      case 'web':
        return <Globe className={className} />;
      case 'database':
      case 'dulieu':
        return <Database className={className} />;
      case 'barchart':
      case 'chart':
      case 'analytics':
        return <BarChart3 className={className} />;
      case 'file':
      case 'filetext':
      case 'tailieu':
        return <FileText className={className} />;
      case 'bell':
        return <Bell className={className} />;
      case 'layers':
        return <Layers className={className} />;
      default:
        return <ExternalLink className={className} />;
    }
  };

  const getWatermarkColor = (color?: string) => {
    switch (color) {
      case 'red':
        return 'text-red-500/20';
      case 'emerald':
      case 'green':
        return 'text-emerald-500/20';
      case 'amber':
      case 'yellow':
        return 'text-amber-500/20';
      case 'purple':
        return 'text-purple-500/20';
      case 'indigo':
        return 'text-indigo-500/20';
      case 'cyan':
        return 'text-cyan-500/20';
      case 'rose':
        return 'text-rose-500/20';
      case 'blue':
      default:
        return 'text-blue-500/20';
    }
  };

  const getDefaultCoverGradient = (color?: string, idx = 0) => {
    const gradients = [
      'from-slate-900 via-slate-800 to-indigo-950',
      'from-slate-900 via-zinc-800 to-neutral-900',
      'from-slate-950 via-blue-950 to-slate-900',
      'from-zinc-900 via-stone-800 to-slate-900'
    ];
    return gradients[idx % gradients.length];
  };

  return (
    <div className="flex flex-col items-center justify-start p-4 sm:p-8 min-h-[500px] h-auto">
      
      <div className="text-center mb-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-700 text-xs font-bold uppercase tracking-wider mb-3">
          <Link2 className="w-3.5 h-3.5 text-amber-600" />
          <span>Hệ thống liên kết tích hợp ({links.length} ứng dụng)</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black mb-3 uppercase tracking-widest text-[#141414]">Liên Kết Báo Cáo</h2>
        <p className="text-[#141414]/70 max-w-xl mx-auto font-medium text-sm sm:text-base">
          Truy cập nhanh các ứng dụng phục vụ quản lý, báo cáo và xử lý công việc. (Bạn có thể thêm hoặc bớt liên kết tại tab <span className="font-bold text-[#141414]">Hệ thống</span>)
        </p>
      </div>

      {links.length === 0 ? (
        <div className="w-full max-w-md bg-white border-2 border-[#141414] shadow-[8px_8px_0_#141414] p-8 text-center rounded-2xl">
          <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 mb-1">Chưa có liên kết nào</h3>
          <p className="text-xs text-slate-500 mb-4">
            Bạn có thể chuyển sang tab "Hệ thống" để thêm các đường dẫn liên kết báo cáo hoặc khôi phục danh sách mặc định.
          </p>
          <button
            onClick={() => {
              DataStore.resetExternalReportLinks();
              reloadLinks();
            }}
            className="px-4 py-2 bg-[#141414] hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-md"
          >
            Khôi phục liên kết mặc định
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full max-w-[1500px] mx-auto relative">
          {links.map((link, idx) => {
            const formattedUrl = link.url.startsWith('http://') || link.url.startsWith('https://') 
              ? link.url 
              : `https://${link.url}`;

            return (
              <a 
                key={link.id || idx}
                href={formattedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col justify-between w-full bg-white border-2 border-[#141414] shadow-[8px_8px_0_#141414] overflow-hidden hover:-translate-y-1 hover:shadow-[12px_12px_0_#141414] transition-all duration-300 rounded-xl"
              >
                {/* Cover Image or Pattern */}
                <div className={`h-48 bg-gradient-to-br ${getDefaultCoverGradient(link.color, idx)} relative overflow-hidden flex items-center justify-center`}>
                  <div className={`absolute -right-4 -bottom-4 transform -rotate-12 ${getWatermarkColor(link.color)}`}>
                    {renderIcon(link.icon, "w-28 h-28 opacity-40")}
                  </div>

                  {link.imageUrl && (
                    <img 
                      src={link.imageUrl} 
                      className="absolute inset-0 w-full h-full object-cover opacity-45 mix-blend-overlay group-hover:scale-110 transition-transform duration-700"
                      alt={link.title}
                      onError={(e) => {
                        // Hide broken image gracefully
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}

                  {link.badge && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2 py-0.5 rounded-md bg-[#141414] text-white text-[10px] font-bold uppercase tracking-wider shadow">
                        {link.badge}
                      </span>
                    </div>
                  )}

                  <div className="relative z-10 bg-[#f5f4f2] p-4 rounded-xl shadow-lg border-2 border-[#141414] group-hover:-rotate-6 transition-transform">
                    {renderIcon(link.icon, "w-8 h-8 text-[#141414]")}
                  </div>
                </div>
                
                <div className="p-6 pb-16 relative flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="text-xl font-black text-[#141414] uppercase tracking-normal line-clamp-2">
                        {link.title}
                      </h3>
                      <ExternalLink className="w-5 h-5 text-[#141414]/40 group-hover:text-[#141414] transition-colors flex-shrink-0 mt-0.5" />
                    </div>
                    <p className="text-[#141414]/70 font-medium text-xs sm:text-sm line-clamp-3">
                      {link.description || 'Truy cập liên kết ứng dụng để quản lý và theo dõi thông tin.'}
                    </p>
                  </div>
                  
                  <div className="absolute bottom-6 left-6 inline-flex items-center gap-2 font-bold text-[#141414] group-hover:gap-4 transition-all uppercase text-xs tracking-wider">
                    <span>Truy cập</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
