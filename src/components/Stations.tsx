import { useState, useMemo } from 'react';
import { DataStore, Station } from '../store/DataStore';
import { Search, Database, ChevronRight, Hash } from 'lucide-react';

export default function Stations({ refreshToggle }: { refreshToggle: number }) {
  const allStations = useMemo(() => DataStore.getStations(), [refreshToggle]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  // Group stations by Area/Team and filter by search
  const filteredStationsByArea = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    
    // Default group if area is missing
    const groups: Record<string, Station[]> = {};
    
    allStations.forEach(st => {
       const area = st.area || 'Khác';
       
       if (term) {
         const matchCode = st.id.toLowerCase().includes(term);
         const matchName = st.name.toLowerCase().includes(term);
         // Also search within details
         const matchDetails = Object.values(st.details).some(v => String(v).toLowerCase().includes(term));
         
         if (!matchCode && !matchName && !matchDetails && !area.toLowerCase().includes(term)) return;
       }
       
       if (!groups[area]) groups[area] = [];
       groups[area].push(st);
    });
    
    return groups;
  }, [allStations, searchTerm]);

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-16rem)] min-h-[500px]">
      
      {/* Danh sách Trạm BA */}
      <div className="md:w-1/3 flex flex-col border border-[#141414] bg-white shadow-[4px_4px_0_#141414] overflow-hidden">
         <div className="bg-[#141414] text-[#E4E3E0] p-4 flex items-center gap-2 border-b border-[#141414]">
            <Database className="w-5 h-5 text-white" />
            <h2 className="font-black uppercase tracking-widest text-sm">Danh Sách Trạm</h2>
         </div>
         
         <div className="p-3 border-b border-[#141414] bg-[#F5F4F2]">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Tìm mã trạm, tên trạm..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-[#141414] text-sm focus:outline-none focus:ring-1 focus:ring-[#141414] bg-white font-mono"
              />
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#141414]/50" />
            </div>
         </div>
         
         <div className="flex-1 overflow-y-auto bg-white p-2 space-y-4">
            {Object.keys(filteredStationsByArea).length === 0 ? (
               <div className="p-4 flex flex-col items-center justify-center text-[#141414]/50 text-sm h-full">
                  <span>Không tìm thấy trạm nào.</span>
                  {allStations.length === 0 && <span className="mt-2 text-xs">Vui lòng cập nhật mã cấu hình mới và tải lại dữ liệu.</span>}
               </div>
            ) : (
               Object.keys(filteredStationsByArea).sort().map(area => (
                 <div key={area} className="space-y-1">
                    <h3 className="text-[10px] font-black uppercase text-[#141414] opacity-50 px-2 py-1 bg-[#F5F4F2] border-y border-[#141414]/10">
                      Khu vực: {area} ({filteredStationsByArea[area].length})
                    </h3>
                    <ul className="space-y-1">
                       {filteredStationsByArea[area].map(st => (
                          <li key={st.id + st.name}>
                             <button
                               onClick={() => setSelectedStation(st)}
                               className={`w-full text-left px-3 py-2 text-sm flex flex-col gap-1 transition-colors group border-l-2 ${selectedStation?.id === st.id ? 'bg-[#141414] text-white border-white/50' : 'hover:bg-[#F5F4F2] text-[#141414] border-transparent'}`}
                             >
                                <div className="font-bold flex justify-between items-center w-full">
                                   <span className="truncate pr-2">{st.name}</span>
                                   <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${selectedStation?.id === st.id ? 'text-white translate-x-1' : 'text-transparent group-hover:text-[#141414]'}`} />
                                </div>
                                <div className={`text-[10px] font-mono ${selectedStation?.id === st.id ? 'text-gray-400' : 'text-gray-500'}`}>
                                   #{st.id} {st.type ? `- ${st.type}` : ''}
                                </div>
                             </button>
                          </li>
                       ))}
                    </ul>
                 </div>
               ))
            )}
         </div>
      </div>
      
      {/* Chi tiết Trạm BA */}
      <div className="md:w-2/3 border border-[#141414] bg-white shadow-[4px_4px_0_#141414] flex flex-col overflow-hidden">
         {!selectedStation ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#141414]/50">
               <Database className="w-12 h-12 mb-4 opacity-20" />
               <p className="font-mono text-sm uppercase tracking-widest">Chọn trạm để xem chi tiết</p>
            </div>
         ) : (
            <div className="flex-1 overflow-y-auto">
               <div className="bg-[#141414] text-[#E4E3E0] p-6 lg:p-8">
                  <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-widest opacity-60 mb-2">
                     <Hash className="w-3 h-3" /> Trạm / {selectedStation.area}
                  </div>
                  <h2 className="text-2xl font-black">{selectedStation.name}</h2>
                  <div className="flex gap-4 mt-4 flex-wrap">
                     {selectedStation.id && (
                        <div className="bg-white/10 px-3 py-1 font-mono text-sm border border-white/20">
                           Mã: {selectedStation.id}
                        </div>
                     )}
                     {selectedStation.type && (
                        <div className="bg-white/10 px-3 py-1 font-mono text-sm border border-white/20">
                           Loại: {selectedStation.type}
                        </div>
                     )}
                  </div>
               </div>
               
               <div className="p-6 lg:p-8">
                  <h3 className="font-bold uppercase tracking-widest mb-6 border-b-2 border-[#141414] pb-2 inline-block">Thông Số Kỹ Thuật</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 font-mono text-sm">
                     {Object.entries(selectedStation.details)
                        // Filter out empty headers or general fields that are already displayed at the top if we want
                        .filter(([key]) => key.trim() !== '')
                        .map(([key, value]) => (
                        <div key={key} className="flex flex-col border-b border-[#141414]/10 pb-2">
                           <span className="text-[#141414]/50 text-[10px] uppercase mb-1">{key}</span>
                           <span className="font-bold text-[#141414] break-words">{value || '-'}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         )}
      </div>

    </div>
  );
}
