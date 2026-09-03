import React, { useState, useMemo } from 'react';
import { DataStore, XuLyDoXaEntry } from '../store/DataStore';
import { Save, FileDown, Search, Filter, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function XuLyDoXaView({ xuLyList, refreshData, setXuLyList }: { xuLyList: XuLyDoXaEntry[], refreshData: () => void, setXuLyList?: React.Dispatch<React.SetStateAction<XuLyDoXaEntry[]>> }) {
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
    tenKh: '',
    cachXl: '',
    ketQua: 'Xong',
    ghiChu: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [sortField, setSortField] = useState<keyof XuLyDoXaEntry | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    stt: '', loaiXl: '', maDd: '', tenKh: '', cachXl: '', nguoiXl: '', thoiGianXl: '', ketQua: '', ghiChu: ''
  });
  const [listMode, setListMode] = useState<'processed' | 'pending'>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [isImporting, setIsImporting] = useState(false);
  const [editingItem, setEditingItem] = useState<XuLyDoXaEntry | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { raw: false });
          
          const formattedData = data.map((row: any) => ({
              loaiXl: row['Loại xử lý'] || row['Loại XL'] || row['Loai XL'] || 'Trạm',
              nguoiXl: row['Người thực hiện'] || row['Người XL'] || row['Nguoi XL'] || currentUserName,
              thoiGianXl: row['Thời gian thực hiện'] || row['Thời gian XL'] || row['thời gian thực hiện'] || '',
              maDd: row['Mã điểm đo'] || row['Mã ĐĐ'] || row['Ma DD'] || row['Mã DD'] || '',
              tenKh: row['Tên khách hàng'] || row['Tên KH'] || row['Ten KH'] || '',
              cachXl: '',
              ketQua: 'Chưa',
              ghiChu: row['Ghi chú'] || row['Ghi chu'] || ''
          })).filter(r => r.maDd);
          
          if (formattedData.length > 0) {
              setIsImporting(true);
              const res = await DataStore.syncXuLyDoXaBulkToSheet(formattedData) as any;
              setIsImporting(false);
              let ok = false;
              let errMsg = "";
              if (res && res.ok !== undefined) {
                  ok = res.ok;
                  if (res.message === 'html_response' || (res.message && res.message.includes('Unknown action'))) {
                      errMsg = "Mã App Script chưa được cập nhật phiên bản mới nhất! Hãy vào Cài đặt -> Copy mã mới -> Dán vào App Script và bấm [Deploy -> New version].";
                  } else {
                      errMsg = res.message || "";
                  }
              } else {
                  ok = !!res;
              }
              if (ok) {
                  alert("Đã import " + formattedData.length + " dòng thành công!");
                  if (setXuLyList) {
                      setXuLyList(prev => [...formattedData, ...prev]);
                  }
                  refreshData();
              } else {
                  alert("Có lỗi khi import Excel! " + (errMsg || ""));
              }
          } else {
              alert("File Excel không có dữ liệu hợp lệ (Cột Mã điểm đo bị trống)!");
          }
      };
      reader.readAsBinaryString(file);
      e.target.value = '';
  };


  const now = new Date();
  const defaultThoiGian = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

  
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.maDd || !formData.cachXl) {
        alert("Vui lòng nhập mã điểm đo và hướng xử lý!");
        return;
    }
    
    setSaving(true);
    setSaveSuccess(false);
    
    const entry: XuLyDoXaEntry = {
        stt: formData.stt,
        loaiXl: formData.loaiXl || 'Trạm',
        nguoiXl: formData.nguoiXl || currentUserName,
        thoiGianXl: formData.thoiGianXl || defaultThoiGian,
        maDd: formData.maDd || '',
        cachXl: formData.cachXl || '',
        ketQua: formData.ketQua || 'Xong',
        ghiChu: formData.ghiChu || ''
    };
    
    let nextItem = null;
    if (editingItem) {
        const currentIndex = sortedAndFiltered.findIndex(item => item.maDd === editingItem.maDd && item.thoiGianXl === editingItem.thoiGianXl);
        if (currentIndex !== -1 && currentIndex + 1 < sortedAndFiltered.length) {
            nextItem = sortedAndFiltered[currentIndex + 1];
        }
    }
    
    setSaveError(null);
    let ok = false;
    let errMsg = "";
    if (editingItem) {
        try {
            const res = await DataStore.updateXuLyDoXaToSheet(entry) as any;
            if (res && res.ok !== undefined) {
                ok = res.ok;
                if (res.message === 'html_response' || (res.message && res.message.includes('Unknown action'))) {
                    errMsg = "Mã App Script chưa được cập nhật phiên bản mới nhất! Hãy vào Cài đặt -> Copy mã mới -> Dán vào App Script và bấm [Deploy -> New version].";
                } else if (res.message && res.message.includes("Unknown name")) {
                    errMsg = "Lỗi tiêu đề cột trên Google Sheet không khớp. Vui lòng kiểm tra lại.";
                } else {
                    errMsg = res.message || "";
                }
            } else {
                // Backward compatibility if it returns boolean
                ok = !!res;
                if (!ok) errMsg = "Lỗi không xác định từ máy chủ.";
            }
        } catch (err: any) {
            ok = false;
            errMsg = err.message || String(err);
        }
    } else {
        const res = await DataStore.syncXuLyDoXaToSheet(entry) as any;
        if (res && res.ok !== undefined) {
            ok = res.ok;
            if (res.message === 'html_response' || (res.message && res.message.includes('Unknown action'))) {
                errMsg = "Mã App Script chưa được cập nhật phiên bản mới nhất! Hãy vào Cài đặt -> Copy mã mới -> Dán vào App Script và bấm [Deploy -> New version].";
            } else {
                errMsg = res.message || "";
            }
        } else {
            ok = !!res;
            if (!ok) errMsg = "Lỗi không xác định từ máy chủ.";
        }
    }
    setSaving(false);
    
    if (ok) {
        setSaveSuccess(true);
        
        // Optimistic update to avoid stale cache from Google Sheets
        if (setXuLyList) {
            if (editingItem) {
                setXuLyList(prev => prev.map(item => item.maDd === entry.maDd ? { ...item, ...entry } : item));
            } else {
                setXuLyList(prev => [entry as XuLyDoXaEntry, ...prev]);
            }
        } else {
            refreshData(); // Only refresh if we can't do optimistic update
        }

        if (editingItem && nextItem) {
            setEditingItem(nextItem);
            setFormData({...nextItem, thoiGianXl: formData.thoiGianXl || defaultThoiGian});
        } else {
            setEditingItem(null);
            setFormData({ ...formData, stt: undefined, maDd: '', cachXl: '', ketQua: 'Xong', ghiChu: '' });
        }
        
        setTimeout(() => setSaveSuccess(false), 3000);
    } else {
        setSaveError("Có lỗi: " + errMsg);
    }
  };


  

  React.useEffect(() => { setCurrentPage(1); }, [listMode, columnFilters, sortField, sortDir, formData.thoiGianXl]);

  const sortedAndFiltered = useMemo(() => {
    let result = [...xuLyList];
    
    



    if (listMode === 'processed') {
        result = result.filter(item => String(item.ketQua).trim().toLowerCase() === 'xong');
    } else {
        result = result.filter(item => String(item.ketQua).trim().toLowerCase() !== 'xong');
    }

    Object.entries(columnFilters).forEach(([key, value]) => {
        if (value.trim() !== '') {
            const lower = value.toLowerCase();
            result = result.filter((item: any) => {
                const itemValue = String(item[key] || '').toLowerCase();
                return itemValue.includes(lower);
            });
        }
    });
    
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
  }, [xuLyList, columnFilters, sortField, sortDir, listMode, formData.thoiGianXl, defaultThoiGian]);

  const handleSort = (field: keyof XuLyDoXaEntry) => {
      if (sortField === field) {
          setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field);
          setSortDir('asc');
      }
  };
  
  const totalPages = Math.ceil(sortedAndFiltered.length / pageSize);
  const paginatedData = sortedAndFiltered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportExcel = () => {
      const wsData = sortedAndFiltered.map(item => ({
          'STT': item.stt,
          'Loại XL': item.loaiXl,
          'Người XL': item.nguoiXl,
          'Thời gian XL': item.thoiGianXl,
          'Mã DD': item.maDd,
          'Tên KH': item.tenKh,
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
      <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] p-4 sm:p-5">
         <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black uppercase text-[#141414]">Nhập thông tin xử lý điểm đo {editingItem ? `(Cập nhật)` : ''}</h2>
            {editingItem && <button type="button" onClick={() => { setEditingItem(null); setFormData({ loaiXl: 'Trạm', nguoiXl: currentUserName, thoiGianXl: defaultThoiGian, maDd: '', cachXl: '', ketQua: 'Xong', ghiChu: '' }); }} className="text-sm font-bold text-red-600 hover:underline">Hủy cập nhật</button>}
         </div>
         <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="lg:col-span-1">
                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Mã điểm đo</label>
                   <input type="text" value={formData.maDd} onChange={e => setFormData({...formData, maDd: e.target.value})} placeholder="" className="w-full px-3 py-1.5 text-sm border-2 border-slate-200 rounded focus:border-[#141414] outline-none text-[#141414] font-semibold" required />
                </div>
                
                <div className="lg:col-span-2">
                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Tên khách hàng</label>
                   <input type="text" value={formData.tenKh || ''} onChange={e => setFormData({...formData, tenKh: e.target.value})} placeholder="" className="w-full px-3 py-1.5 text-sm border-2 border-slate-200 rounded focus:border-[#141414] outline-none text-[#141414] font-medium" />
                </div>

                <div className="lg:col-span-1">
                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Loại xử lý</label>
                   <div className="flex gap-4 items-center h-[34px]">
                       <label className="flex items-center gap-1.5 cursor-pointer">
                           <input type="radio" name="loaiXl" value="Trạm" checked={formData.loaiXl === 'Trạm'} onChange={(e) => setFormData({...formData, loaiXl: e.target.value})} className="w-3.5 h-3.5 text-[#141414] focus:ring-[#141414]"/>
                           <span className="font-semibold text-slate-700 text-sm">Trạm</span>
                       </label>
                       <label className="flex items-center gap-1.5 cursor-pointer">
                           <input type="radio" name="loaiXl" value="Điện kế" checked={formData.loaiXl === 'Điện kế'} onChange={(e) => setFormData({...formData, loaiXl: e.target.value})} className="w-3.5 h-3.5 text-[#141414] focus:ring-[#141414]"/>
                           <span className="font-semibold text-slate-700 text-sm">Điện kế</span>
                       </label>
                   </div>
                </div>
                
                <div className="lg:col-span-1">
                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Hướng xử lý</label>
                   <select value={formData.cachXl} onChange={e => setFormData({...formData, cachXl: e.target.value})} className="w-full px-3 py-1.5 text-sm border-2 border-slate-200 rounded focus:border-[#141414] outline-none text-[#141414] font-semibold" required>
                       <option value="">-- Chọn hướng xử lý --</option>
                       {huongXuLyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                   </select>
                </div>
                
                <div className="lg:col-span-1">
                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Kết quả</label>
                   <select value={formData.ketQua} onChange={e => setFormData({...formData, ketQua: e.target.value})} className="w-full px-3 py-1.5 text-sm border-2 border-slate-200 rounded focus:border-[#141414] outline-none text-[#141414] font-semibold" required>
                       <option value="">-- Chọn kết quả --</option>
                       <option value="Xong">Xong</option>
                       <option value="Chưa">Chưa</option>
                   </select>
                </div>

                <div className="lg:col-span-1">
                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Người thực hiện</label>
                   <input type="text" value={formData.nguoiXl} onChange={e => setFormData({...formData, nguoiXl: e.target.value})} className="w-full px-3 py-1.5 text-sm border-2 border-slate-200 rounded focus:border-[#141414] outline-none text-[#141414] font-medium" />
                </div>
                
                <div className="lg:col-span-1">
                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Thời gian</label>
                   <input type="text" placeholder="DD/MM/YYYY" value={formData.thoiGianXl || defaultThoiGian} onChange={e => setFormData({...formData, thoiGianXl: e.target.value})} className="w-full px-3 py-1.5 text-sm border-2 border-slate-200 rounded focus:border-[#141414] outline-none text-[#141414] font-medium" />
                </div>
                
                <div className="md:col-span-2 lg:col-span-4">
                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Ghi chú</label>
                   <textarea rows={1} value={formData.ghiChu} onChange={e => setFormData({...formData, ghiChu: e.target.value})} className="w-full px-3 py-1.5 text-sm border-2 border-slate-200 rounded focus:border-[#141414] outline-none text-[#141414] font-medium resize-none" placeholder="Nhập ghi chú..."></textarea>
                </div>
            </div>
            
            <div className="flex gap-3 items-center pt-1">
                <button type="submit" disabled={saving || !!editingItem} className="flex items-center gap-2 bg-[#141414] text-white px-4 py-1.5 text-sm font-bold shadow-[2px_2px_0_#A0A0A0] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <Save className="w-4 h-4" /> {saving && !editingItem ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
                <button type="submit" disabled={saving || !editingItem} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 text-sm font-bold shadow-[2px_2px_0_#A0A0A0] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <Save className="w-4 h-4" /> {saving && editingItem ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
                {saveSuccess && <span className="text-green-600 font-bold text-sm">✓ {editingItem ? 'Cập nhật' : 'Đã lưu'} thành công!</span>}
                {saveError && <span className="text-red-600 font-bold text-sm bg-red-100 px-2 py-1">{saveError}</span>}
            </div>
         </form>
      </div>

      <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] flex flex-col">

          <div className="p-4 border-b border-[#141414] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#F5F4F2]">
             <div className="flex items-center gap-4">
                 <h3 className="font-black uppercase text-[#141414]">Danh sách</h3>
                 <div className="flex bg-slate-200 p-1 rounded-lg">
                     <button onClick={() => setListMode('pending')} className={`px-3 py-1 text-sm font-bold rounded-md transition-all ${listMode === 'pending' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}>Đang phân công</button>
                     <button onClick={() => setListMode('processed')} className={`px-3 py-1 text-sm font-bold rounded-md transition-all ${listMode === 'processed' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-600'}`}>Đã xử lý</button>
                 </div>
                 <span className="font-bold text-[#141414]">({sortedAndFiltered.length})</span>
             </div>
             
             <div className="flex items-center gap-3">
                 
                 
                 <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
                 <div className="relative group">
                     <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 bg-[#141414] text-white px-3 py-1.5 font-bold text-sm shadow-[2px_2px_0_#A0A0A0] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50">
                         <Upload className="w-4 h-4" /> {isImporting ? 'Đang Import...' : 'Import Excel'}
                     </button>
                     <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-slate-800 text-white text-xs p-3 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 whitespace-pre-wrap shadow-xl border border-slate-700">
Cấu trúc file Excel mẫu:
• Mã điểm đo (bắt buộc)
• Tên KH
• Loại xử lý
• Người thực hiện
• Thời gian thực hiện
• Ghi chú
                     </div>
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
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('tenKh')}>Tên KH {sortField === 'tenKh' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('cachXl')}>Cách XL {sortField === 'cachXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('nguoiXl')}>Người XL {sortField === 'nguoiXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('thoiGianXl')}>Thời gian XL {sortField === 'thoiGianXl' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('ketQua')}>Kết quả {sortField === 'ketQua' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                          <th className="px-4 py-3 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('ghiChu')}>Ghi chú {sortField === 'ghiChu' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                      </tr>
                      <tr className="bg-slate-800">
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1.5 text-sm bg-white text-slate-900 font-bold border-2 border-blue-200 focus:border-blue-500 rounded outline-none placeholder-slate-400" placeholder="Lọc..." value={columnFilters.stt} onChange={e => setColumnFilters({...columnFilters, stt: e.target.value})} /></th>
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1.5 text-sm bg-white text-slate-900 font-bold border-2 border-blue-200 focus:border-blue-500 rounded outline-none placeholder-slate-400" placeholder="Lọc..." value={columnFilters.loaiXl} onChange={e => setColumnFilters({...columnFilters, loaiXl: e.target.value})} /></th>
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1.5 text-sm bg-white text-slate-900 font-bold border-2 border-blue-200 focus:border-blue-500 rounded outline-none placeholder-slate-400" placeholder="Lọc..." value={columnFilters.maDd} onChange={e => setColumnFilters({...columnFilters, maDd: e.target.value})} /></th>
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1.5 text-sm bg-white text-slate-900 font-bold border-2 border-blue-200 focus:border-blue-500 rounded outline-none placeholder-slate-400" placeholder="Lọc..." value={columnFilters.tenKh} onChange={e => setColumnFilters({...columnFilters, tenKh: e.target.value})} /></th>
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1.5 text-sm bg-white text-slate-900 font-bold border-2 border-blue-200 focus:border-blue-500 rounded outline-none placeholder-slate-400" placeholder="Lọc..." value={columnFilters.cachXl} onChange={e => setColumnFilters({...columnFilters, cachXl: e.target.value})} /></th>
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1.5 text-sm bg-white text-slate-900 font-bold border-2 border-blue-200 focus:border-blue-500 rounded outline-none placeholder-slate-400" placeholder="Lọc..." value={columnFilters.nguoiXl} onChange={e => setColumnFilters({...columnFilters, nguoiXl: e.target.value})} /></th>
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1.5 text-sm bg-white text-slate-900 font-bold border-2 border-blue-200 focus:border-blue-500 rounded outline-none placeholder-slate-400" placeholder="Lọc..." value={columnFilters.thoiGianXl} onChange={e => setColumnFilters({...columnFilters, thoiGianXl: e.target.value})} /></th>
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1.5 text-sm bg-white text-slate-900 font-bold border-2 border-blue-200 focus:border-blue-500 rounded outline-none placeholder-slate-400" placeholder="Lọc..." value={columnFilters.ketQua} onChange={e => setColumnFilters({...columnFilters, ketQua: e.target.value})} /></th>
                          <th className="px-2 py-2"><input type="text" className="w-full px-2 py-1.5 text-sm bg-white text-slate-900 font-bold border-2 border-blue-200 focus:border-blue-500 rounded outline-none placeholder-slate-400" placeholder="Lọc..." value={columnFilters.ghiChu} onChange={e => setColumnFilters({...columnFilters, ghiChu: e.target.value})} /></th>
                      </tr>
                  </thead>
                  <tbody>
                      {paginatedData.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => { setEditingItem(row); setFormData(row); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                              <td className="px-4 py-2 font-medium">{(currentPage - 1) * pageSize + idx + 1}</td>
                              <td className="px-4 py-2">{row.loaiXl}</td>
                              <td className="px-4 py-2 font-bold text-red-600">{row.maDd}</td>
                              <td className="px-4 py-2">{row.tenKh}</td>
                              <td className="px-4 py-2">{row.cachXl}</td>
                              <td className="px-4 py-2">{row.nguoiXl}</td>
                              <td className="px-4 py-2 whitespace-nowrap">{row.thoiGianXl}</td>
                              <td className="px-4 py-2 font-bold">{row.ketQua}</td>
                              <td className="px-4 py-2">{row.ghiChu}</td>
                          </tr>
                      ))}
                      {sortedAndFiltered.length === 0 && (
                          <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500 font-medium">Không có dữ liệu</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
          {totalPages > 1 && (
             <div className="p-4 border-t border-[#141414] flex justify-between items-center bg-white">
                 <span className="text-sm font-medium text-slate-600">Trang {currentPage} / {totalPages}</span>
                 <div className="flex gap-2">
                     <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-100 border border-slate-300 rounded text-sm font-bold disabled:opacity-50">Trước</button>
                     <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-100 border border-slate-300 rounded text-sm font-bold disabled:opacity-50">Sau</button>
                 </div>
             </div>
          )}
      </div>
    </div>
  );
}
