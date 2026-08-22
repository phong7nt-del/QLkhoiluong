const fs = require('fs');
let code = fs.readFileSync('src/components/Analytics.tsx', 'utf8');

code = code.replace(
    `const [detailViewMode, setDetailViewMode] = useState<'grouped' | 'list'>('grouped');`,
    `const [detailViewMode, setDetailViewMode] = useState<'grouped' | 'list' | 'by_workgroup'>('grouped');`
);

const buttonsTarget = `             <div className="flex gap-2">
                <button 
                  onClick={() => setDetailViewMode('grouped')}
                  className={\`text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest transition-all border \${detailViewMode === 'grouped' ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#141414]/20 hover:border-[#141414]'}\`}
                >
                  Dạng nhóm
                </button>
                <button 
                  onClick={() => setDetailViewMode('list')}
                  className={\`text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest transition-all border \${detailViewMode === 'list' ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#141414]/20 hover:border-[#141414]'}\`}
                >
                  Dạng bảng
                </button>
             </div>`;

const buttonsRepl = `             <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => setDetailViewMode('grouped')}
                  className={\`text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest transition-all border \${detailViewMode === 'grouped' ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#141414]/20 hover:border-[#141414]'}\`}
                >
                  Dạng nhóm cá nhân
                </button>
                <button 
                  onClick={() => setDetailViewMode('list')}
                  className={\`text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest transition-all border \${detailViewMode === 'list' ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#141414]/20 hover:border-[#141414]'}\`}
                >
                  Dạng bảng
                </button>
                {filterMode === 'day' && (
                  <button 
                    onClick={() => setDetailViewMode('by_workgroup')}
                    className={\`text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest transition-all border \${detailViewMode === 'by_workgroup' ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#141414]/20 hover:border-[#141414]'}\`}
                  >
                    Theo tổ nhóm
                  </button>
                )}
             </div>`;
             
if (code.includes(buttonsTarget)) {
    code = code.replace(buttonsTarget, buttonsRepl);
    console.log('Replaced buttons!');
} else {
    console.log('Could not find buttonsTarget');
}

const renderTarget = `          ) : detailViewMode === 'list' ? (
             <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] overflow-x-auto">`;

const renderRepl = `          ) : (detailViewMode === 'by_workgroup' && filterMode === 'day') ? (
             <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                   <thead className="bg-[#141414] text-[#E4E3E0]">
                      <tr className="text-[10px] font-mono uppercase tracking-widest">
                         <th className="py-3 px-4 border-b border-[#141414] whitespace-nowrap w-12 text-center">STT</th>
                         <th className="py-3 px-4 border-b border-[#141414] whitespace-nowrap">Ngày</th>
                         <th className="py-3 px-4 border-b border-[#141414] whitespace-nowrap">Thành viên trong nhóm</th>
                         <th className="py-3 px-4 border-b border-[#141414]">Khu vực / Tổ</th>
                         <th className="py-3 px-4 border-b border-[#141414]">Nội dung công việc</th>
                      </tr>
                   </thead>
                   <tbody className="font-sans text-xs">
                      {filteredEntries.sort((a, b) => b.timestamp - a.timestamp).map((e, i) => {
                         const displayDate = e.date.includes('-') ? e.date.split('-').reverse().join('/') : e.date;
                         return (
                         <tr key={e.id} className={\`border-b border-[#141414]/10 hover:bg-[#E4E3E0]/30 transition-colors \${i % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'}\`}>
                            <td className="py-3 px-4 border-r border-[#141414]/10 align-top text-center font-bold opacity-60">{i + 1}</td>
                            <td className="py-3 px-4 border-r border-[#141414]/10 align-top whitespace-nowrap font-mono">{displayDate}</td>
                            <td className="py-3 px-4 border-r border-[#141414]/10 align-top font-bold">
                               <div className="flex flex-col gap-1">
                                 {e.members?.map(m => <span key={m}>{m}</span>)}
                               </div>
                            </td>
                            <td className="py-3 px-4 border-r border-[#141414]/10 align-top opacity-70">{e.team}</td>
                            <td className="py-3 px-4 align-top">
                               <div className="whitespace-pre-wrap leading-relaxed space-y-1 relative group">
                                  {renderContentWithQuota(e.content, e.members?.length || 1, e.date)}
                                  <button 
                                     onClick={() => alert("Để xóa nội dung tác nghiệp này, vui lòng xóa trực tiếp ô dữ liệu tương ứng trên Google Sheets để đảm bảo nhất quán.")}
                                     title="Thông tin xoá"
                                     className="absolute top-0 right-0 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white border border-red-200 hover:bg-red-50"
                                  >
                                     <Trash2 className="w-3 h-3" />
                                  </button>
                               </div>
                            </td>
                         </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
          ) : detailViewMode === 'list' ? (
             <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] overflow-x-auto">`;

if (code.includes(renderTarget)) {
    code = code.replace(renderTarget, renderRepl);
    console.log('Replaced renderTarget!');
} else {
    console.log('Could not find renderTarget');
}

// In case detailViewMode === 'by_workgroup' and they switch to filterMode !== 'day', maybe we should effect reset?
// Actually if filterMode !== 'day' and detailViewMode === 'by_workgroup', the code falls back to the default map (grouped by day/person).
// Because we used ternary `detailViewMode === 'by_workgroup' && filterMode === 'day'`
// So it will just gracefully fallback to `allDates.map` which is fine, but the button won't be visible.

fs.writeFileSync('src/components/Analytics.tsx', code, 'utf8');
