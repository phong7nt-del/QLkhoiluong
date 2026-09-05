import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DataStore } from '../store/DataStore';
import * as XLSX from 'xlsx';
import { Fingerprint, Map, Navigation, FileText, Camera, MapPin, Search, SortAsc, SortDesc, Save, AlertCircle, CheckCircle2, Image as ImageIcon, ZoomIn, ZoomOut, X, Upload, ListTodo, CheckSquare, Edit } from 'lucide-react';


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
  const [listType, setListType] = useState<'chua_phan_cong' | 'da_phan_cong'>('chua_phan_cong');
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
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

  
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsImporting(true);
      setMessage(null);
      
      const reader = new FileReader();
      reader.onload = async (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = XLSX.utils.sheet_to_json(ws);
              
              const importData = data.map((row: any) => {
                  const getVal = (keys: string[]) => {
                      const k = Object.keys(row).find(key => keys.includes(key.toLowerCase().trim()));
                      return k ? String(row[k]) : '';
                  };
                  return {
                      id: getVal(['id', 'mã', 'ma']),
                      ten: getVal(['tên', 'ten', 'tên dcu']),
                      diaChi: getVal(['địa chỉ', 'dia chi', 'diachi']),
                      user: getVal(['user', 'người thực hiện', 'người cập nhật', 'nhân viên', 'người được giao', 'nguoi thuc hien', 'nguoi cap nhat'])
                  };
              }).filter(item => item.id);
              
              if (importData.length === 0) {
                  setMessage({ type: 'error', text: 'Không tìm thấy dữ liệu hợp lệ. Vui lòng đảm bảo file có cột ID.' });
                  setIsImporting(false);
                  return;
              }
              
              const success = await DataStore.importDcu(importData);
              if (success) {
                  setMessage({ type: 'success', text: `Đã import thành công ${importData.length} DCU.` });
                  loadData();
              } else {
                  setMessage({ type: 'error', text: 'Lỗi khi import dữ liệu.' });
              }
          } catch (err: any) {
              setMessage({ type: 'error', text: 'Lỗi đọc file: ' + err.message });
          }
          setIsImporting(false);
      };
      reader.readAsBinaryString(file);
      e.target.value = '';
  };

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
      
      
      const sessionUser = JSON.parse(localStorage.getItem('sessionUser') || '{}');
      const currentName = sessionUser.name || sessionUser.email || '';
      const newDcu = { id, ten, diaChi, 
          toadoX: formatCoord(toadoX),
          toadoY: formatCoord(toadoY),
          hinhAnh: imageUrl,
          ghiChu,
          user: currentName
      };
      
      let success = false;
      if (isUpdateMode) {
          success = await DataStore.updateDcu(newDcu);
      } else {
          success = await DataStore.addDcu(newDcu);
      }
      
      if (success) {
          setMessage({ type: 'success', text: isUpdateMode ? 'Đã cập nhật DCU thành công!' : 'Đã lưu thông tin DCU thành công!' });
          
          if (isUpdateMode) {
             const currentIndex = filteredData.findIndex(d => d.id === id);
             if (currentIndex >= 0 && currentIndex < filteredData.length - 1) {
                 const nextItem = filteredData[currentIndex + 1];
                 setId(nextItem.id || '');
                 setTen(nextItem.ten || '');
                 setDiaChi(nextItem.diaChi || '');
                 setToadoX(nextItem.toadoX || '');
                 setToadoY(nextItem.toadoY || '');
                 setGhiChu(nextItem.ghiChu || '');
                 setImagePreview(nextItem.hinhAnh || null);
                 setImageFile(null);
             } else {
                 setId(''); setTen(''); setDiaChi(''); setToadoX(''); setToadoY(''); setGhiChu(''); setImageFile(null); setImagePreview(null);
                 setIsUpdateMode(false);
             }
          } else {
             setId(''); setTen(''); setDiaChi(''); setToadoX(''); setToadoY(''); setGhiChu(''); setImageFile(null); setImagePreview(null);
          }
          
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
  
  const formatCoord = (val: any) => {
      if (!val) return '';
      let s = String(val).replace(/,/g, '.').replace(/\s/g, '');
      let parts = s.split('.');
      if (parts.length > 2) {
          return parts[0] + '.' + parts.slice(1).join('');
      }
      return s;
  };

  const { userSpecificData, filteredData } = useMemo(() => {
      const sessionUser = JSON.parse(localStorage.getItem('sessionUser') || '{}');
      const roleStr = String(sessionUser.role || '').toLowerCase();
      const isManagement = ['tổ trưởng', 'tổ phó', 'đội trưởng', 'đội phó', 'phó giám đốc', 'giám đốc', 'admin', 'quản trị'].some(role => roleStr.includes(role));

      const normalizeStr = (s) => {
          return String(s || '')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd').replace(/Đ/g, 'D')
              .toLowerCase()
              .replace(/\s+/g, '');
      };
      
      let currentUserName = normalizeStr(sessionUser.name || '');
      if (!currentUserName) {
          const emailPrefix = (sessionUser.email || '').split('@')[0];
          currentUserName = normalizeStr(emailPrefix);
      }

      const userSpecificData = data.filter(d => {
          if (!isManagement && currentUserName) {
              const assigneeName = normalizeStr(d.user || '');
              if (!assigneeName) return false;
              if (assigneeName !== currentUserName && !assigneeName.includes(currentUserName) && !currentUserName.includes(assigneeName)) {
                  return false;
              }
          }
          return true;
      });

      let filtered = userSpecificData.filter(d => {
          const hasCoords = !!d.toadoX && !!d.toadoY;
          if (listType === 'chua_phan_cong') {
              return !hasCoords;
          }
          return hasCoords;
      });

      if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(item => 
              (item.id || '').toLowerCase().includes(s) || 
              (item.ten || '').toLowerCase().includes(s) ||
              (item.ghiChu || '').toLowerCase().includes(s)
          );
      }
      
      const sorted = filtered.sort((a, b) => {
          let valA = a[sortCol] || '';
          let valB = b[sortCol] || '';
          
          if (sortCol === 'stt') {
              return sortDir === 'asc' ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
          }
          
          if (typeof valA === 'string') valA = valA.toLowerCase();
          if (typeof valB === 'string') valB = valB.toLowerCase();
          
          if (valA < valB) return sortDir === 'asc' ? -1 : 1;
          if (valA > valB) return sortDir === 'asc' ? 1 : -1;
          return 0;
      });

      return { userSpecificData, filteredData: sorted };
  }, [data, search, sortCol, sortDir, listType]);

  
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full"><h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">{isUpdateMode ? <><Edit className="w-4 h-4 text-blue-600" /> Cập nhật DCU (Đã phân công)</> : '1. Nhập thông tin DCU'}</h3>
     {isUpdateMode && <button type="button" onClick={() => { setIsUpdateMode(false); setId(''); setTen(''); setDiaChi(''); setToadoX(''); setToadoY(''); setGhiChu(''); setImagePreview(null); setImageFile(null); }} className="text-xs text-blue-600 hover:underline">Hủy cập nhật / Thêm mới</button>}</div>
        </div>
        <div className="p-4">
            {message && (
                <div className={`mb-4 p-3 rounded-lg border ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'} flex items-start gap-2`}>
                    {message.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                    <span className="text-sm font-bold leading-relaxed">{message.text}</span>
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Group 1: Thông tin cơ bản */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5"/> Thông tin cơ bản</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">ID *</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Fingerprint className="h-4 w-4 text-slate-400" />
                                </div>
                                <input type="text" value={id} onChange={e => setId(e.target.value)} required disabled={isUpdateMode} className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 disabled:opacity-60 disabled:bg-slate-100 transition-shadow placeholder-slate-300" placeholder="Mã DCU..." />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Tên DCU *</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                </div>
                                <input type="text" value={ten} onChange={e => setTen(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 transition-shadow placeholder-slate-300" placeholder="Tên trạm..." />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Địa chỉ</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Map className="h-4 w-4 text-slate-400" />
                                </div>
                                <input type="text" value={diaChi} onChange={e => setDiaChi(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 transition-shadow placeholder-slate-300" placeholder="Số nhà, đường, phường/xã, quận/huyện..." />
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Group 2: Định vị & Hình ảnh */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5"/> Định vị tọa độ & Hình ảnh</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Tọa độ X (Vĩ độ)</label>
                                <input type="text" value={toadoX} onChange={e => setToadoX(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 transition-shadow placeholder-slate-300" placeholder="VD: 10.762622" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Tọa độ Y (Kinh độ)</label>
                                <div className="flex gap-2">
                                    <input type="text" value={toadoY} onChange={e => setToadoY(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 transition-shadow placeholder-slate-300" placeholder="VD: 106.660172" />
                                    <button type="button" onClick={handleGetLocation} className="shrink-0 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg border border-blue-200 transition-colors flex items-center justify-center font-medium shadow-sm gap-1.5" title="Lấy tọa độ hiện tại">
                                        <MapPin className="w-4 h-4" /> <span className="text-xs hidden sm:inline">Lấy tọa độ</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Hình ảnh minh chứng</label>
                            <div className="flex items-start gap-4">
                                <div className="w-28 h-28 bg-white border-2 border-dashed border-slate-300 rounded-xl overflow-hidden flex items-center justify-center relative shadow-sm group">
                                    {imagePreview ? (
                                        <>
                                            <img src={getDriveImageUrl(imagePreview)} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            <button type="button" onClick={() => {setImagePreview(null); setImageFile(null);}} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-center text-slate-400">
                                            <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                            <span className="text-[10px] font-medium">Trống</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2 flex-1">
                                    <label className="cursor-pointer bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm">
                                        <Camera className="w-4 h-4" />
                                        <span>Tải ảnh lên</span>
                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
                                    </label>
                                    <p className="text-[10px] text-slate-500 leading-tight">Hỗ trợ định dạng JPG, PNG, WEBP. Ảnh sẽ được tự động tối ưu hóa kích thước.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Group 3: Ghi chú */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Ghi chú</label>
                    <textarea value={ghiChu} onChange={e => setGhiChu(e.target.value)} rows={2} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 transition-shadow resize-none placeholder-slate-300" placeholder="Các thông tin bổ sung khác..." />
                </div>
                
                <div className="pt-2 flex justify-end">
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-8 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg"
                    >
                        {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        <span>{isSubmitting ? 'Đang lưu...' : (isUpdateMode ? 'Lưu cập nhật' : 'Lưu Thông Tin')}</span>
                    </button>
                </div>
            </form>
        </div>
      </div>
      
      
        <div className="flex border-b border-[#141414]/20 bg-white shadow-sm overflow-x-auto mb-4">
            <button 
                onClick={() => { setListType('chua_phan_cong'); setCurrentPage(1); }}
                className={`px-6 py-3.5 font-extrabold uppercase tracking-widest text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                    listType === 'chua_phan_cong' 
                    ? 'bg-[#141414] text-white' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
                <ListTodo size={16} />
                Danh sách đang phân công ({userSpecificData.filter(d => !d.toadoX || !d.toadoY).length})
            </button>
            <button 
                onClick={() => { setListType('da_phan_cong'); setCurrentPage(1); }}
                className={`px-6 py-3.5 font-extrabold uppercase tracking-widest text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                    listType === 'da_phan_cong' 
                    ? 'bg-[#141414] text-white' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
                <CheckSquare size={16} />
                Danh sách đã xử lý ({userSpecificData.filter(d => !!d.toadoX && !!d.toadoY).length})
            </button>
        </div>

<div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
<div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
<h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
2. Danh sách DCU
                <span className="bg-slate-200 text-slate-700 py-0.5 px-2 rounded-full text-[10px]">{filteredData.length}</span>
            </h3>
            <div className="flex items-center gap-2">
      <label className="cursor-pointer bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors whitespace-nowrap">
          <Upload className="w-4 h-4" />
          Import 
          {isImporting && <span className="ml-1 animate-pulse">...</span>}
          <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImport} disabled={isImporting} />
      </label>
      <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                    type="text"
                    placeholder="Lọc (ID, Tên, Ghi chú)..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                    className="w-full md:w-64 pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800"
                />
            </div>
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
                        paginatedData.map((row, idx) => (
                            <tr 
                                key={idx} 
                                onClick={(e) => {
                                    // Bỏ qua nếu click vào link hoặc hình ảnh
                                    if ((e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('button')) return;
                                    setId(row.id || '');
     if (listType === 'chua_phan_cong') setIsUpdateMode(true);
     else setIsUpdateMode(false);
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
                                title={listType === 'chua_phan_cong' ? "Bấm để cập nhật" : "Bấm để xem chi tiết"}
                            >
                                <td className="px-4 py-3 font-medium text-slate-700 border-b border-slate-100">{row.stt || ((currentPage - 1) * rowsPerPage + idx + 1)}</td>
                                <td className="px-4 py-3 font-bold text-slate-800 border-b border-slate-100">{row.id}</td>
                                <td className="px-4 py-3 text-slate-700 border-b border-slate-100">{row.ten}</td>
                                <td className="px-4 py-3 text-slate-700 border-b border-slate-100">
        <div className="flex flex-col gap-1">
            <span>{row.diaChi}</span>
            {row.toadoX && row.toadoY ? (
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${formatCoord(row.toadoX)},${formatCoord(row.toadoY)}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 font-medium text-xs hover:underline flex items-center gap-1 inline-flex w-fit bg-blue-50 px-2 py-0.5 rounded">
                    <MapPin className="w-3 h-3" /> Chỉ đường
                </a>
            ) : null}
        </div>
    </td>
    <td className="px-4 py-3 text-slate-600 text-xs border-b border-slate-100">
        {row.toadoX && row.toadoY ? (
            <a href={`https://www.google.com/maps/search/?api=1&query=${formatCoord(row.toadoX)},${formatCoord(row.toadoY)}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {formatCoord(row.toadoX)}, {formatCoord(row.toadoY)}
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
        
        {totalPages > 1 && (
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                    Hiển thị {((currentPage - 1) * rowsPerPage) + 1} - {Math.min(currentPage * rowsPerPage, filteredData.length)} / {filteredData.length}
                </span>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded border border-slate-200 bg-white text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Trước
                    </button>
                    <span className="px-3 py-1 text-sm font-medium text-slate-700">
                        {currentPage} / {totalPages}
                    </span>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded border border-slate-200 bg-white text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Sau
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
