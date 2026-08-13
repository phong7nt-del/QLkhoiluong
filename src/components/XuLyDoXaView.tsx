import React, { useState, useMemo } from 'react';
import { DataStore, XuLyDoXaEntry } from '../store/DataStore';
import { Save, FileDown, Search, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function XuLyDoXaView({ xuLyList, refreshData }: { xuLyList: XuLyDoXaEntry[], refreshData: () => void }) {
  const currentUserStr = sessionStorage.getItem('workload_user_session');
  let currentUserName = '';
  if (currentUserStr) {
    try { currentUserName = JSON.parse(currentUserStr).name; } catch(e){}
  }
  
  const [formData, setFormData] = useState<Partial<XuLyDoXaEntry>>({
    loaiXl: 'Trạm',
    nguoiXl: currentUserName,
    thoiGianXl: '',
    maDd: '',
    cachXl: '',
    ketQua: 'Xong',
    ghiChu: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [sortField, setSortField] = useState<keyof XuLyDoXaEntry | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterText, setFilterText] = useState('');

  const now = new Date();
  const localYYYY = now.getFullYear();
  const localMM = (now.getMonth() + 1).toString().padStart(2, '0');
  const localDD = now.getDate().toString().padStart(2, '0');
  const defaultThoiGian = `${localYYYY}-${localMM}-${localDD}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.maDd || !formData.cachXl) {
        alert("Vui lòng nhập mã điểm đo và hướng xử lý!");
        return;
    }
    
    setSaving(true);
    setSaveSuccess(false);
    
    const entry: XuLyDoXaEntry = {
        loaiXl: formData.loaiXl || 'Trạm',
        nguoiXl: formData.nguoiXl || currentUserName,
        thoiGianXl: formData.thoiGianXl || defaultThoiGian,
        maDd: formData.maDd || '',
        cachXl: formData.cachXl || '',
        ketQua: formData.ketQua || 'Xong',
        ghiChu: formData.ghiChu || ''
    };
    
    const ok = await DataStore.syncXuLyDoXaToSheet(entry);
    setSaving(false);
    
    if (ok) {
        setSaveSuccess(true);
        setFormData({ ...formData, maDd: '', cachXl: '', ghiChu: '' });
        refreshData();
        setTimeout(() => setSaveSuccess(false), 3000);
    } else {
        alert("Có lỗi xảy ra khi lưu!");
    }
  };
  
  const sortedAndFiltered = useMemo(() => {
    let result = [...xuLyList];
    if (filterText) {
        const lower = filterText.toLowerCase();
        result = result.filter(item => 
           (item.maDd?.toLowerCase().includes(lower)) ||
           (item.cachXl?.toLowerCase().includes(lower)) ||
           (item.nguoiXl?.toLowerCase().includes(lower)) ||
           (item.loaiXl?.toLowerCase().includes(lower)) ||
           (item.ghiChu?.toLowerCase().includes(lower)) ||
           (item.ketQua?.toLowerCase().includes(lower))
        );
    }
    
    if (sortField) {
        result.sort((a, b) => {
            let aVal = String(a[sortField] || '');
            let bVal = String(b[sortField] || '');
            
            if (sortField === 'stt') {
                const aNum = Number(a.stt) || 0;
                const bNum = Number(b.stt) || 0;
                return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
            }
            
            return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });
    } else {
        // default sort by STT desc
        result.sort((a,b) => (Number(b.stt) || 0) - (Number(a.stt) || 0));
    }
    return result;
  }, [xuLyList, filterText, sortField, sortDir]);

  const handleSort = (field: keyof XuLyDoXaEntry) => {
      if (sortField === field) {
          setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field);
          setSortDir('asc');
      }
  };
  
  const exportExcel = () => {
      const wsData = sortedAndFiltered.map(item => ({
          'STT': item.stt,
          'Loại XL': item.loaiXl,
          'Người XL': item.nguoiXl,
          'Thời gian XL': item.thoiGianXl,
          'Mã DD': item.maDd,
          'Cách XL': item.cachXl,
          'Kết quả': item.ketQua,
          'Ghi chú': item.ghiChu
      }));
      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "XuLyDoXa");
      XLSX.writeFile(wb, "XuLyDoXa.xlsx");
  };

  const huongXuLyOptions = [
      'Kiểm tra sai trạm', 'Reset nguồn', 'thay modem', 'Reset modem', 'Thay DCU', 'Thay sim', 'Thay Điện kế', 'Xử lý Nhiễu', 'chưa xử lý được', 'Khác'
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] p-6">
         <h2 className="text-xl font-black uppercase mb-4 text-[#141414]">Nhập thông tin xử lý điểm đo</h2>
         <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Loại xử lý</label>
                   <div className="flex gap-4 items-center h-[42px]">
                       <label className="flex items-center gap-2 cursor-pointer">
                           <input type="radio" name="loaiXl" value="Trạm" checked={formData.loaiXl === 'Trạm'} onChange={(e) => setFormData({...formData, loaiXl: e.target.value})} className="w-4 h-4 text-[#141414] focus:ring-[#141414]"/>
                           <span className="font-medium text-slate-700">Trạm</span>
                       </label>
                       <label className="flex items-center gap-2 cursor-pointer">
                           <input type="radio" name="loaiXl" value="Điện kế" checked={formData.loaiXl === 'Điện kế'} onChange={(e) => setFormData({...formData, loaiXl: e.target.value})} className="w-4 h-4 text-[#141414] focus:ring-[#141414]"/>
                           <span className="font-medium text-slate-700">Điện kế</span>
                       </label>
                   </div>
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Người thực hiện</label>
                   <input type="text" value={formData.nguoiXl} onChange={e => setFormData({...formData, nguoiXl: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" />
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Thời gian thực hiện</label>
                   <input type="date" value={formData.thoiGianXl || defaultThoiGian} onChange={e => setFormData({...formData, thoiGianXl: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" />
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Nhập mã điểm đo</label>
                   <input type="text" value={formData.maDd} onChange={e => setFormData({...formData, maDd: e.target.value})} placeholder="" className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" required />
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Hướng xử lý</label>
                   <select value={formData.cachXl} onChange={e => setFormData({...formData, cachXl: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" required>
                       <option value="">-- Chọn hướng xử lý --</option>
                       {huongXuLyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                   </select>
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Kết quả xử lý</label>
                   <select value={formData.ketQua} onChange={e => setFormData({...formData, ketQua: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" required>
                       <option value="Xong">Xong</option>
                       <option value="Chưa">Chưa</option>
                   </select>
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Ghi chú</label>
                   <input type="text" value={formData.ghiChu} onChange={e => setFormData({...formData, ghiChu: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#141414] outline-none text-[#141414] font-medium" />
                </div>
            </div>
            
            <div className="flex gap-4 items-center">
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[#141414] text-white px-6 py-2.5 font-bold shadow-[2px_2px_0_#A0A0A0] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50">
                    <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
                {saveSuccess && <span className="text-green-600 font-bold text-sm">✓ Đã lưu thành công!</span>}
            </div>
         </form>
      </div>

      <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] flex flex-col">
          <div className="p-4 border-b border-[#141414] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#F5F4F2]">
             <h3 className="font-black uppercase text-[#141414]">Danh sách đã xử lý ({sortedAndFiltered.length})</h3>
             
             <div className="flex items-center gap-3">
                 <div className="relative">
                     <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input type="text" placeholder="Tìm kiếm..." value={filterText} onChange={e => setFilterText(e.target.value)} className="pl-9 pr-4 py-1.5 border-2 border-slate-200 rounded-lg text-sm focus:border-[#141414] outline-none" />
                 </div>
                 <button onClick={exportExcel} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 font-bold text-sm shadow-[2px_2px_0_#A0A0A0] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
                     <FileDown className="w-4 h-4" /> Xuất Excel
                 </button>
             </div>
          </div>
          
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-[#141414] text-white uppercase text-xs">
                      <tr>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('stt')}>STT {sortField === 'stt' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('loaiXl')}>Loại XL {sortField === 'loaiXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('maDd')}>Mã ĐĐ {sortField === 'maDd' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('cachXl')}>Cách XL {sortField === 'cachXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('nguoiXl')}>Người XL {sortField === 'nguoiXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('thoiGianXl')}>Thời gian XL {sortField === 'thoiGianXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('ketQua')}>Kết quả {sortField === 'ketQua' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3">Ghi chú</th>
                      </tr>
                  </thead>
                  <tbody>
                      {sortedAndFiltered.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-2 font-medium">{row.stt}</td>
                              <td className="px-4 py-2">{row.loaiXl}</td>
                              <td className="px-4 py-2 font-bold text-red-600">{row.maDd}</td>
                              <td className="px-4 py-2">{row.cachXl}</td>
                              <td className="px-4 py-2">{row.nguoiXl}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{row.thoiGianXl}</td>
                              <td className="px-4 py-2 font-bold">{row.ketQua}</td>
                              <td className="px-4 py-2">{row.ghiChu}</td>
                          </tr>
                      ))}
                      {sortedAndFiltered.length === 0 && (
                          <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-medium">Không có dữ liệu</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
}
