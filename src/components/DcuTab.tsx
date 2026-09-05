import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DataStore } from '../store/DataStore';
import { Camera, MapPin, Search, SortAsc, SortDesc, Save, AlertCircle, CheckCircle2, Image as ImageIcon, ZoomIn, ZoomOut, X } from 'lucide-react';


const getDriveImageUrl = (url: string) => {
    if (!url) return '';
    try {
        if (url.includes('drive.google.com/uc?id=')) {
            const id = url.split('id=')[1]?.split('&')[0];
            if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
        }
        if (url.includes('drive.google.com/file/d/')) {
            const id = url.split('/d/')[1]?.split('/')[0];
            if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
        }
    } catch(e) {}
    return url;
};

export default function DcuTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Form states
  const [id, setId] = useState('');
  const [ten, setTen] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [toadoX, setToadoX] = useState('');
  const [toadoY, setToadoY] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Zoom Image State
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  const closeZoom = () => {
      setViewImage(null);
      setZoomLevel(1);
  };
  
  // Table states
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('stt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
     setLoading(true);
     const dcu = await DataStore.getDcu();
     setData(dcu);
     setLoading(false);
  };

  useEffect(() => {
     loadData();
  }, []);

  const handleGetLocation = () => {
      if (!navigator.geolocation) {
          setMessage({ type: 'error', text: 'Trình duyệt không hỗ trợ lấy tọa độ.' });
          return;
      }
      navigator.geolocation.getCurrentPosition(
          (position) => {
              setToadoX(position.coords.latitude.toString());
              setToadoY(position.coords.longitude.toString());
          },
          (error) => {
              setMessage({ type: 'error', text: 'Lỗi lấy tọa độ: ' + error.message });
          },
          { enableHighAccuracy: true }
      );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setImageFile(file);
          
          const reader = new FileReader();
          reader.onloadend = () => {
              setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!id || !ten) {
          setMessage({ type: 'error', text: 'Vui lòng nhập ID và Tên.' });
          return;
      }
      setIsSubmitting(true);
      setMessage(null);
      
      let imageUrl = '';
      if (imageFile) {
          try {
              const base64Str = imagePreview?.split(',')[1] || '';
              const ext = imageFile.name.split('.').pop() || 'jpg';
              const fileName = `${id}.${ext}`;
              imageUrl = await DataStore.uploadImageToDrive(base64Str, fileName, imageFile.type);
          } catch(err: any) {
              setMessage({ type: 'error', text: 'Lỗi upload ảnh. Mã lỗi: ' + (err.message || 'Chưa phân quyền Google Drive.') + ' Vui lòng vào Cài đặt Hệ thống và cấp quyền Drive cho App Script.' });
              setIsSubmitting(false);
              return;
          }
      }
      
      const newDcu = { id, ten, diaChi, toadoX,
          toadoY,
          hinhAnh: imageUrl,
          ghiChu
      };
      
      const success = await DataStore.addDcu(newDcu);
      if (success) {
          setMessage({ type: 'success', text: 'Đã lưu thông tin DCU thành công!' });
          setId('');
          setTen('');
          setDiaChi('');
          setToadoX('');
          setToadoY('');
          setGhiChu('');
          setImageFile(null);
          setImagePreview(null);
          loadData();
      } else {
          setMessage({ type: 'error', text: 'Lỗi khi lưu dữ liệu vào Google Sheets.' });
      }
      setIsSubmitting(false);
  };
  
  const handleSort = (col: string) => {
      if (sortCol === col) {
          setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      } else {
          setSortCol(col);
          setSortDir('asc');
      }
  };
  
  const filteredData = useMemo(() => {
      let filtered = data;
      if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(item => 
              (item.id || '').toLowerCase().includes(s) || 
              (item.ten || '').toLowerCase().includes(s) ||
              (item.ghiChu || '').toLowerCase().includes(s)
          );
      }
      
      return filtered.sort((a, b) => {
          let valA = a[sortCol] || '';
          let valB = b[sortCol] || '';
          
          if (sortCol === 'stt') {
              return sortDir === 'asc' ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
          }
          
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
  }, [data, search, sortCol, sortDir]);

  return (
    <div className="space-y-6">
      {/* Image Viewer Modal */}
      {viewImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
            <div className="absolute top-4 right-4 flex gap-4 z-50">
                <button onClick={handleZoomOut} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors">
                    <ZoomOut className="w-6 h-6" />
                </button>
                <button onClick={handleZoomIn} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors">
                    <ZoomIn className="w-6 h-6" />
                </button>
                <button onClick={closeZoom} className="bg-white/20 hover:bg-red-500/80 text-white p-2 rounded-full transition-colors ml-4">
                    <X className="w-6 h-6" />
                </button>
            </div>
            <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4">
                <img 
                    src={getDriveImageUrl(viewImage)} referrerPolicy="no-referrer" 
                    alt="Phóng to" 
                    style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s ease-out', cursor: zoomLevel > 1 ? 'grab' : 'default' }}
                    className="max-w-full max-h-[90vh] object-contain origin-center"
                />
            </div>
        </div>
      )}

      {/* Form and Table... */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase">1. Nhập thông tin DCU</h3>
        </div>
        <div className="p-4">
            {message && (
                <div className={`mb-4 p-3 rounded-lg border ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'} flex items-start gap-2`}>
                    {message.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                    <span className="text-sm font-bold leading-relaxed">{message.text}</span>
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID *</label>
                        <input type="text" value={id} onChange={e => setId(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-800" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên DCU *</label>
                        <input type="text" value={ten} onChange={e => setTen(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-800" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa chỉ</label>
                        <input type="text" value={diaChi} onChange={e => setDiaChi(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-800" />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tọa độ X (Vĩ độ)</label>
                        <input type="text" value={toadoX} onChange={e => setToadoX(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-800" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tọa độ Y (Kinh độ)</label>
                        <div className="flex gap-2">
                            <input type="text" value={toadoY} onChange={e => setToadoY(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-800" />
                            <button type="button" onClick={handleGetLocation} className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg border border-slate-200 transition-colors flex items-center justify-center">
                                <MapPin className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ghi chú</label>
                    <textarea value={ghiChu} onChange={e => setGhiChu(e.target.value)} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-800" />
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hình ảnh</label>
                    <div className="flex items-end gap-4">
                        <div className="w-32 h-32 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden flex items-center justify-center relative">
                            {imagePreview ? (
                                <img src={getDriveImageUrl(imagePreview)} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <ImageIcon className="w-8 h-8 text-slate-300" />
                            )}
                        </div>
                        <div>
                            <input 
                                type="file" 
                                accept="image/*" capture="environment" 
                                ref={fileInputRef} 
                                onChange={handleImageChange} 
                                className="hidden" 
                            />
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm transition-colors shadow-sm"
                            >
                                <Camera className="w-4 h-4" />
                                Lấy hình
                            </button>
                            <p className="text-xs text-slate-500 mt-2">Ảnh sẽ được lưu với tên ID của DCU.</p>
                        </div>
                    </div>
                </div>
                
                <div className="pt-2">
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        <span>{isSubmitting ? 'Đang lưu...' : 'Lưu Thông Tin'}</span>
                    </button>
                </div>
            </form>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                2. Danh sách DCU
                <span className="bg-slate-200 text-slate-700 py-0.5 px-2 rounded-full text-[10px]">{filteredData.length}</span>
            </h3>
            <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                    type="text"
                    placeholder="Lọc (ID, Tên, Ghi chú)..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full md:w-64 pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800"
                />
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                        <th className="px-4 py-3 border-b border-slate-200 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('stt')}>
                            <div className="flex items-center gap-1">STT {sortCol === 'stt' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}</div>
                        </th>
                        <th className="px-4 py-3 border-b border-slate-200 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('id')}>
                            <div className="flex items-center gap-1">ID {sortCol === 'id' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}</div>
                        </th>
                        <th className="px-4 py-3 border-b border-slate-200 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('ten')}>
                            <div className="flex items-center gap-1">Tên {sortCol === 'ten' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}</div>
                        </th>
                        <th className="px-4 py-3 border-b border-slate-200 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('diaChi')}>
                            <div className="flex items-center gap-1">Địa chỉ {sortCol === 'diaChi' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}</div>
                        </th>
                        <th className="px-4 py-3 border-b border-slate-200">Tọa độ</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-center">Hình ảnh</th>
                        <th className="px-4 py-3 border-b border-slate-200">Ghi chú</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                                    <span>Đang tải dữ liệu...</span>
                                </div>
                            </td>
                        </tr>
                    ) : filteredData.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-slate-500 italic">Không có dữ liệu DCU</td>
                        </tr>
                    ) : (
                        filteredData.map((row, idx) => (
                            <tr 
                                key={idx} 
                                onClick={(e) => {
                                    // Bỏ qua nếu click vào link hoặc hình ảnh
                                    if ((e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('button')) return;
                                    setId(row.id || '');
                                    setTen(row.ten || '');
                                    setDiaChi(row.diaChi || '');
                                    setToadoX(row.toadoX || '');
                                    setToadoY(row.toadoY || '');
                                    setGhiChu(row.ghiChu || '');
                                    setImagePreview(row.hinhAnh || null);
                                    setImageFile(null);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`hover:bg-blue-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                                title="Bấm để xem chi tiết trên form"
                            >
                                <td className="px-4 py-3 font-medium text-slate-700 border-b border-slate-100">{row.stt || (idx + 1)}</td>
                                <td className="px-4 py-3 font-bold text-slate-800 border-b border-slate-100">{row.id}</td>
                                <td className="px-4 py-3 text-slate-700 border-b border-slate-100">{row.ten}</td>
                                <td className="px-4 py-3 text-slate-700 border-b border-slate-100">{row.diaChi}</td>
                                <td className="px-4 py-3 text-slate-600 text-xs border-b border-slate-100">
                                    {row.toadoX && row.toadoY ? (
                                        <a href={`https://www.google.com/maps/search/?api=1&query=${row.toadoX},${row.toadoY}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {row.toadoX}, {row.toadoY}
                                        </a>
                                    ) : ''}
                                </td>
                                <td className="px-4 py-3 text-center border-b border-slate-100">
                                    {row.hinhAnh ? (
                                        <button onClick={() => setViewImage(row.hinhAnh)} className="inline-block">
                                            <div className="w-8 h-8 rounded bg-slate-200 overflow-hidden border border-slate-300 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all">
                                                <img src={getDriveImageUrl(row.hinhAnh)} alt="DCU" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            </div>
                                        </button>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-slate-600 border-b border-slate-100">{row.ghiChu}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
