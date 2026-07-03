import React, { useState, useMemo } from 'react';
import { DataStore } from '../store/DataStore';
import { Search } from 'lucide-react';

export default function SearchTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [matchType, setMatchType] = useState<'exact' | 'approx'>('exact');
  const [hasSearched, setHasSearched] = useState(false);
  
  const khuVucList = DataStore.getKhuVuc();
  
  const searchResults = useMemo(() => {
    if (!hasSearched || !searchTerm.trim()) return [];
    
    const term = searchTerm.trim().toLowerCase();
    
    return khuVucList.filter(item => {
      const maDdo = String(item.MA_DDO || '').toLowerCase();
      const soTbiKey = Object.keys(item).find(k => k.toLowerCase().includes('tbi') || k.toLowerCase().includes('n0'));
      const soTbi = soTbiKey ? String(item[soTbiKey] || '').toLowerCase() : '';
      
      if (matchType === 'exact') {
        return maDdo === term || soTbi === term;
      } else {
        return maDdo.includes(term) || (soTbi && soTbi.includes(term));
      }
    });
  }, [khuVucList, searchTerm, matchType, hasSearched]);

  const columns = useMemo(() => {
    if (searchResults.length === 0) return [];
    
    const keys = new Set<string>();
    searchResults.forEach(res => {
      Object.keys(res).forEach(k => {
        if (k !== 'MA_DDO' && k !== 'TO_QL') {
           keys.add(k);
        }
      });
    });
    return Array.from(keys);
  }, [searchResults]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
  };

  return (
    <div className="space-y-6">
      <div className="border border-[#141414] bg-white p-6 shadow-[4px_4px_0_#141414] lg:py-8 lg:px-10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#141414] mb-6 flex items-center gap-2">
          <Search className="w-5 h-5" />
          Tìm kiếm thông tin
        </h2>

        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="Nhập mã điểm đo..." 
              className="w-full border-2 border-[#141414] p-3 text-sm font-bold outline-none focus:bg-blue-50"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHasSearched(false);
              }}
            />
          </div>
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold">
              <input 
                type="radio" 
                name="matchType" 
                value="exact" 
                checked={matchType === 'exact'}
                onChange={() => { setMatchType('exact'); setHasSearched(false); }}
                className="w-4 h-4 accent-[#141414]"
              />
              Chính xác
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold">
              <input 
                type="radio" 
                name="matchType" 
                value="approx" 
                checked={matchType === 'approx'}
                onChange={() => { setMatchType('approx'); setHasSearched(false); }}
                className="w-4 h-4 accent-[#141414]"
              />
              Gần đúng
            </label>
            <button 
              type="submit"
              className="bg-[#141414] text-white px-6 py-3 text-sm font-bold uppercase tracking-widest hover:bg-black transition-colors"
            >
              Tìm kiếm
            </button>
          </div>
        </form>

        {hasSearched && searchTerm.trim() && (
          <div className="mt-8">
            <div className="mb-4 text-sm font-bold">
              Tìm thấy: {searchResults.length} kết quả
            </div>
            
            {searchResults.length > 0 && (
              <div className="overflow-x-auto border border-[#141414] bg-white shadow-[4px_4px_0_#141414]">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#141414] text-white">
                    <tr>
                      <th className="px-4 py-3 font-bold border-r border-white/20">STT</th>
                      {columns.map(col => (
                        <th key={col} className="px-4 py-3 font-bold border-r border-white/20">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141414]/10">
                    {searchResults.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-center font-bold border-r border-[#141414]/10">
                          {idx + 1}
                        </td>
                        {columns.map(col => {
                          const val = row[col];
                          const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val || '');
                          return (
                            <td key={col} className="px-4 py-3 border-r border-[#141414]/10">
                              {displayVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
