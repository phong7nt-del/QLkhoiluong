import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DataStore } from '../store/DataStore';
import * as XLSX from 'xlsx';
import {
  Fingerprint,
  Map,
  Navigation,
  FileText,
  Camera,
  MapPin,
  Search,
  SortAsc,
  SortDesc,
  Save,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  X,
  Upload,
  ListTodo,
  CheckSquare,
  Edit,
  Trash2,
  Mic,
  MicOff,
  RefreshCw
} from 'lucide-react';

// Nén ảnh chụp DCU siêu nhẹ (~35-50KB) nhưng vẫn cực kỳ sắc nét mọi chi tiết thông số
export const compressImageFile = (
  file: File | Blob,
  maxWidth = 960,
  maxHeight = 960,
  quality = 0.65
): Promise<{ base64: string; sizeKb: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL('image/jpeg', quality);
        const sizeKb = Math.round((base64.length * 0.75) / 1024);
        resolve({ base64, sizeKb });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

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
  
  // Image & Drive upload states (Tối ưu hóa ảnh nhỏ nhất & lưu Drive siêu tốc)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageSizeKb, setImageSizeKb] = useState<number | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadedDriveUrl, setUploadedDriveUrl] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPromiseRef = useRef<Promise<string> | null>(null);

  // GPS Location state
  const [isLocating, setIsLocating] = useState(false);

  // Voice Input for Ghi chú (Nhập bằng giọng nói)
  const [isListeningGhiChu, setIsListeningGhiChu] = useState(false);
  const [speechGhiChuError, setSpeechGhiChuError] = useState('');
  const recognitionGhiChuRef = useRef<any>(null);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

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
          setMessage({ type: 'error', text: 'Trình duyệt không hỗ trợ lấy tọa độ GPS.' });
          return;
      }
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
          (position) => {
              setIsLocating(false);
              setToadoX(position.coords.latitude.toFixed(6));
              setToadoY(position.coords.longitude.toFixed(6));
          },
          (error) => {
              setIsLocating(false);
              setMessage({ type: 'error', text: 'Lỗi lấy tọa độ GPS: ' + error.message });
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
  };

  // Tối ưu hóa ảnh chụp DCU: Nén siêu nhỏ (~35-50KB) nhưng sắc nét & Tải lên Google Drive siêu tốc chạy ngầm < 1s
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          try {
              setIsUploadingImage(true);
              setMessage(null);
              // Nén ảnh chất lượng cao, kích thước nhẹ ~35-50KB
              const { base64, sizeKb } = await compressImageFile(file, 960, 960, 0.65);
              setImagePreview(base64);
              setImageSizeKb(sizeKb);
              setImageFile(file);

              // Đẩy lên Google Drive tức thì ở chế độ nền (người dùng không cần chờ khi bấm Lưu)
              const currentId = id.trim() || `DCU_${Date.now()}`;
              const fileName = `DCU_${currentId}.jpg`;
              const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
              const p = DataStore.uploadImageToDrive(base64Data, fileName, 'image/jpeg');
              uploadPromiseRef.current = p;

              const driveUrl = await p;
              setUploadedDriveUrl(driveUrl);
              setIsUploadingImage(false);
          } catch(err: any) {
              console.error('Lỗi nén hoặc upload ảnh DCU:', err);
              setIsUploadingImage(false);
              setMessage({
                  type: 'error',
                  text: 'Lỗi upload ảnh lên Google Drive: ' + (err.message || 'Không thể upload ảnh.')
              });
          }
      }
  };

  const handleClearImage = () => {
      setImageFile(null);
      setImagePreview(null);
      setImageSizeKb(null);
      setUploadedDriveUrl('');
      uploadPromiseRef.current = null;
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Nhập phần ghi chú bằng giọng nói (Web Speech API tiếng Việt)
  const toggleVoiceGhiChu = () => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
          alert('Trình duyệt chưa hỗ trợ nhận diện giọng nói tiếng Việt. Vui lòng dùng Chrome hoặc Edge trên điện thoại/máy tính.');
          return;
      }

      if (isListeningGhiChu) {
          try {
              recognitionGhiChuRef.current?.stop();
          } catch (e) {}
          setIsListeningGhiChu(false);
      } else {
          setSpeechGhiChuError('');
          try {
              const recognition = new SpeechRecognition();
              recognition.lang = 'vi-VN';
              recognition.continuous = false;
              recognition.interimResults = false;

              recognition.onstart = () => {
                  setIsListeningGhiChu(true);
                  setSpeechGhiChuError('');
              };

              recognition.onresult = (event: any) => {
                  const transcript = event.results?.[0]?.[0]?.transcript || '';
                  if (transcript) {
                      setGhiChu(prev => {
                          const trimmed = (prev || '').trim();
                          return trimmed ? `${trimmed}; ${transcript.trim()}` : transcript.trim();
                      });
                  }
                  setIsListeningGhiChu(false);
              };

              recognition.onerror = (event: any) => {
                  if (event.error === 'not-allowed') {
                      setSpeechGhiChuError('Vui lòng cấp quyền micro cho trình duyệt để nói.');
                  } else if (event.error !== 'no-speech') {
                      setSpeechGhiChuError(`Lỗi nhận diện: ${event.error}`);
                  }
                  setIsListeningGhiChu(false);
              };

              recognition.onend = () => {
                  setIsListeningGhiChu(false);
              };

              recognitionGhiChuRef.current = recognition;
              recognition.start();
          } catch (e: any) {
              console.warn('Lỗi bật nhận diện giọng nói ghi chú:', e);
              setIsListeningGhiChu(false);
          }
      }
  };

  const handleResetForm = () => {
      setId('');
      setTen('');
      setDiaChi('');
      setToadoX('');
      setToadoY('');
      setGhiChu('');
      handleClearImage();
      setIsUpdateMode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!id || !ten) {
          setMessage({ type: 'error', text: 'Vui lòng nhập Mã ID và Tên DCU.' });
          return;
      }
      setIsSubmitting(true);
      setMessage(null);
      
      let imageUrl = uploadedDriveUrl || '';
      // Nếu ảnh đang upload ngầm, chờ kết quả
      if (!imageUrl && uploadPromiseRef.current) {
          try {
              imageUrl = await uploadPromiseRef.current;
          } catch(err: any) {
              console.warn('Lỗi chờ uploadPromiseRef:', err);
          }
      }
      
      // Dự phòng nếu chưa kịp upload
      if (!imageUrl && imagePreview && imageFile) {
          try {
              const currentId = id.trim() || `DCU_${Date.now()}`;
              const fileName = `DCU_${currentId}.jpg`;
              const base64Data = imagePreview.includes(',') ? imagePreview.split(',')[1] : imagePreview;
              imageUrl = await DataStore.uploadImageToDrive(base64Data, fileName, 'image/jpeg');
          } catch(err: any) {
              setMessage({ type: 'error', text: 'Lỗi upload ảnh lên Google Drive: ' + (err.message || 'Chưa phân quyền Google Drive.') });
              setIsSubmitting(false);
              return;
          }
      }
      
      const sessionUser = JSON.parse(sessionStorage.getItem('workload_user_session') || '{}');
      const currentName = sessionUser.name || sessionUser.email || '';
      const newDcu = { 
          id, 
          ten, 
          diaChi, 
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
          setMessage({ type: 'success', text: isUpdateMode ? '✓ Đã cập nhật DCU thành công!' : '✓ Đã lưu thông tin DCU thành công!' });
          
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
                 setUploadedDriveUrl(nextItem.hinhAnh || '');
                 setImageSizeKb(null);
                 setImageFile(null);
                 uploadPromiseRef.current = null;
             } else {
                 handleResetForm();
             }
          } else {
             handleResetForm();
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

  const sessionUserObj = JSON.parse(sessionStorage.getItem('workload_user_session') || '{}');
  const roleString = String(sessionUserObj.role || '').toLowerCase();
  const canDelete = true; // Cho phép người dùng thao tác xóa trên danh sách DCU
  
  const getDcuKey = (row: any, idx: number = 0) => {
      if (row.id != null && String(row.id).trim() !== '') {
          return `id_${String(row.id).trim().toLowerCase()}`;
      }
      if (row.stt != null && String(row.stt).trim() !== '') {
          return `stt_${String(row.stt).trim()}`;
      }
      return `row_${idx}`;
  };

  const handleDeleteSelected = async () => {
      if (listType !== 'chua_phan_cong') {
          setMessage({ type: 'error', text: 'Chỉ cho phép xóa trong danh sách Đang phân công. Không được xóa danh sách Đã xử lý!' });
          return;
      }
      if (selectedIds.length === 0) return;
      if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} dòng đang chọn trong danh sách Đang phân công? Sau khi xóa, các dòng trong sheet DCU sẽ được dồn lên và đánh lại STT tự động.`)) return;
      
      // Kiểm tra an toàn: không cho phép xóa DCU đã có dữ liệu xử lý (có tọa độ)
      const hasProcessed = selectedIds.some(idKey => {
          let found = filteredData.find((r, i) => getDcuKey(r, i) === idKey) || data.find((r, i) => getDcuKey(r, i) === idKey);
          return found && !!found.toadoX && !!found.toadoY;
      });
      if (hasProcessed) {
          setMessage({ type: 'error', text: 'Không được phép xóa các DCU trong danh sách Đã xử lý!' });
          return;
      }

      setIsDeletingBulk(true);
      const toDeletePayload: any[] = [];
      selectedIds.forEach(idKey => {
          let found = filteredData.find((r, i) => getDcuKey(r, i) === idKey);
          if (!found) {
              found = data.find((r, i) => getDcuKey(r, i) === idKey);
          }
          if (found) {
              toDeletePayload.push({ stt: found.stt, id: found.id });
          } else if (idKey.startsWith('id_')) {
              toDeletePayload.push({ id: idKey.replace('id_', '') });
          } else if (idKey.startsWith('stt_')) {
              toDeletePayload.push({ stt: idKey.replace('stt_', '') });
          } else {
              toDeletePayload.push({ id: idKey });
          }
      });

      const success = await DataStore.deleteDcuBulk(toDeletePayload);
      if (success) {
          setMessage({ type: 'success', text: `Đã xóa thành công ${selectedIds.length} dòng DCU. Dữ liệu đã được cập nhật lại.` });
          setSelectedIds([]);
          await loadData();
      } else {
          setMessage({ type: 'error', text: 'Lỗi khi xóa dữ liệu DCU trên Google Sheets.' });
      }
      setIsDeletingBulk(false);
  };

  const { userSpecificData, filteredData } = useMemo(() => {
      const sessionUser = JSON.parse(sessionStorage.getItem('workload_user_session') || '{}');
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

      {/* Form Nhập Thông Tin DCU (Tối ưu giao diện hài hòa, siêu gọn gàng, ít chiếm diện tích nhất) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-sky-50/40 border-b border-slate-200/80 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#005a9c]/10 text-[#005a9c] flex items-center justify-center font-bold shrink-0">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                {isUpdateMode ? (
                  <>
                    <Edit className="w-3.5 h-3.5 text-blue-600" />
                    <span>Cập nhật DCU: <span className="font-mono text-[#005a9c]">{id}</span></span>
                  </>
                ) : (
                  <span>1. Thông tin trạm & thiết bị DCU</span>
                )}
              </h3>
              <span className="text-[10px] text-slate-500">
                {isUpdateMode ? `Đang chỉnh sửa: ${ten || 'Chưa có tên'}` : 'Nhập thông tin vị trí, tọa độ GPS, ghi chú giọng nói và ảnh chụp DCU'}
              </span>
            </div>
          </div>

          {isUpdateMode && (
            <button
              type="button"
              onClick={handleResetForm}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer w-fit"
            >
              <X className="w-3.5 h-3.5" />
              <span>Hủy cập nhật / Thêm mới</span>
            </button>
          )}
        </div>

        <div className="p-3.5 sm:p-4">
          {message && (
            <div className={`mb-3 p-2.5 rounded-xl border text-xs font-bold flex items-start gap-2 ${
              message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {message.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
              <span className="leading-relaxed">{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Lưới bố trí 2 cột: Thông tin (8 phần) + Ảnh DCU (4 phần) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
              {/* Cột trái: Thông tin trạm & tọa độ (8 cột) */}
              <div className="lg:col-span-8 space-y-2">
                {/* Dòng 1: ID DCU (col-4) + Tên DCU (col-8) */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Mã ID DCU <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <Fingerprint className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        value={id}
                        onChange={e => setId(e.target.value)}
                        required
                        disabled={isUpdateMode}
                        placeholder="VD: DCU_01..."
                        className="w-full bg-slate-50/70 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-[#005a9c] focus:ring-1 focus:ring-[#005a9c] outline-none disabled:bg-slate-100 disabled:opacity-60 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-8">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tên trạm / Tên DCU <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        value={ten}
                        onChange={e => setTen(e.target.value)}
                        required
                        placeholder="VD: Trạm Biến Áp Tân Định..."
                        className="w-full bg-slate-50/70 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#005a9c] focus:ring-1 focus:ring-[#005a9c] outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Dòng 2: Địa chỉ trạm */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Địa chỉ trạm / Vị trí lắp đặt
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <Map className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={diaChi}
                      onChange={e => setDiaChi(e.target.value)}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                      className="w-full bg-slate-50/70 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-[#005a9c] focus:ring-1 focus:ring-[#005a9c] outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Dòng 3: Tọa độ GPS X & Y + Nút lấy GPS hiện tại */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tọa độ X (Vĩ độ)
                    </label>
                    <input
                      type="text"
                      value={toadoX}
                      onChange={e => setToadoX(e.target.value)}
                      placeholder="VD: 10.762622"
                      className="w-full bg-slate-50/70 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:bg-white focus:border-[#005a9c] focus:ring-1 focus:ring-[#005a9c] outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tọa độ Y (Kinh độ)
                    </label>
                    <input
                      type="text"
                      value={toadoY}
                      onChange={e => setToadoY(e.target.value)}
                      placeholder="VD: 106.660172"
                      className="w-full bg-slate-50/70 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:bg-white focus:border-[#005a9c] focus:ring-1 focus:ring-[#005a9c] outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={isLocating}
                      className="w-full bg-sky-50 hover:bg-sky-100 text-[#005a9c] border border-sky-200 rounded-lg px-2.5 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Lấy tọa độ GPS thiết bị hiện tại"
                    >
                      {isLocating ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#005a9c]" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-[#005a9c]" />
                      )}
                      <span>{isLocating ? 'Đang định vị...' : 'Lấy GPS hiện tại'}</span>
                    </button>
                  </div>
                </div>

                {/* Dòng 4: Ghi chú + Nhập bằng giọng nói (Voice Input) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span>Ghi chú</span>
                    </label>
                    <button
                      type="button"
                      onClick={toggleVoiceGhiChu}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        isListeningGhiChu
                          ? 'bg-rose-500 text-white animate-pulse shadow-xs ring-2 ring-rose-300'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                      title={isListeningGhiChu ? 'Đang lắng nghe... bấm để dừng' : 'Bấm để nói nội dung ghi chú'}
                    >
                      {isListeningGhiChu ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                      <span>{isListeningGhiChu ? 'Đang nghe...' : 'Nói ghi chú'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={ghiChu}
                      onChange={e => setGhiChu(e.target.value)}
                      placeholder="Ghi chú về thiết bị DCU, tủ điện, sim, vị trí gắn... (hoặc bấm 'Nói ghi chú')"
                      className="w-full bg-slate-50/70 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-[#005a9c] focus:ring-1 focus:ring-[#005a9c] outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  {speechGhiChuError && (
                    <p className="text-[10px] text-rose-500 mt-1 font-medium">{speechGhiChuError}</p>
                  )}
                </div>
              </div>

              {/* Cột phải: Ảnh minh chứng DCU (Tối ưu nén siêu nhẹ ~35-50KB & lưu Drive < 1s) */}
              <div className="lg:col-span-4 bg-slate-50/70 rounded-xl p-2.5 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-[#005a9c]" />
                      <span>Ảnh chụp DCU</span>
                    </span>
                    {imageSizeKb ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        Đã nén: {imageSizeKb} KB
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Nén ~35-50KB</span>
                    )}
                  </div>

                  {/* Khung ảnh & 2 nút Chụp ảnh / Tải ảnh */}
                  <div className="flex items-center gap-2.5">
                    {/* Khung ảnh xem trước */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-slate-200 bg-white overflow-hidden relative group shrink-0 flex items-center justify-center shadow-2xs">
                      {imagePreview ? (
                        <>
                          <img
                            src={getDriveImageUrl(imagePreview)}
                            alt="Ảnh DCU"
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setViewImage(imagePreview)}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewImage(imagePreview)}
                              className="p-1 bg-white/90 hover:bg-white rounded-md text-slate-800 shadow-xs cursor-pointer"
                              title="Phóng to ảnh"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleClearImage}
                              className="p-1 bg-rose-600 hover:bg-rose-700 rounded-md text-white shadow-xs cursor-pointer"
                              title="Xóa ảnh"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-1 text-center select-none">
                          <ImageIcon className="w-5 h-5 stroke-1 mb-0.5 text-slate-300" />
                          <span className="text-[9px] text-slate-400 font-medium">Chưa có ảnh</span>
                        </div>
                      )}
                    </div>

                    {/* 2 nút Thao tác Chụp & Tải ảnh */}
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="w-full py-1.5 px-2 bg-[#005a9c] hover:bg-[#004b87] text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                        title="Bật máy ảnh chụp trực tiếp DCU"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Chụp ảnh</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
                        title="Chọn ảnh có sẵn từ máy"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Chọn ảnh</span>
                      </button>

                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Trạng thái tải lên Google Drive */}
                <div className="mt-2 text-[10px] leading-tight">
                  {isUploadingImage ? (
                    <span className="text-blue-600 font-semibold flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Đang nén & gửi Drive...
                    </span>
                  ) : uploadedDriveUrl ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Đã lưu Drive {imageSizeKb ? `(${imageSizeKb} KB)` : ''}
                    </span>
                  ) : (
                    <span className="text-slate-500">Tự động nén siêu nhẹ & lưu Drive tức thì.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Thanh nút bấm hành động cuối form */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Làm mới ô nhập
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-[#005a9c] hover:bg-[#004b87] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isSubmitting ? 'Đang lưu...' : (isUpdateMode ? 'Lưu cập nhật DCU' : 'Lưu Thông Tin DCU')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
      
      
        <div className="flex border-b border-[#141414]/20 bg-white shadow-sm overflow-x-auto mb-4">
            <button 
                onClick={() => { setListType('chua_phan_cong'); setCurrentPage(1); setSelectedIds([]); }}
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
                onClick={() => { setListType('da_phan_cong'); setCurrentPage(1); setSelectedIds([]); }}
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
      {listType === 'chua_phan_cong' && selectedIds.length > 0 && (
          <button 
              type="button"
              onClick={handleDeleteSelected}
              disabled={isDeletingBulk}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 shadow-sm transition-colors whitespace-nowrap disabled:opacity-50"
          >
              <Trash2 className="w-4 h-4" />
              {isDeletingBulk ? 'Đang xóa...' : `Xóa ${selectedIds.length} dòng`}
          </button>
      )}
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
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                {listType === 'chua_phan_cong' && (
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        checked={paginatedData.length > 0 && paginatedData.every((r, i) => selectedIds.includes(getDcuKey(r, (currentPage - 1) * rowsPerPage + i)))}
                                        onChange={(e) => {
                                            const pageKeys = paginatedData.map((r, i) => getDcuKey(r, (currentPage - 1) * rowsPerPage + i));
                                            if (e.target.checked) {
                                                setSelectedIds(prev => Array.from(new Set([...prev, ...pageKeys])));
                                            } else {
                                                setSelectedIds(prev => prev.filter(k => !pageKeys.includes(k)));
                                            }
                                        }}
                                    />
                                )}
                                STT {sortCol === 'stt' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3 inline" /> : <SortDesc className="w-3 h-3 inline" />)}
                            </div>
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
                        <th className="px-4 py-3 border-b border-slate-200 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('user')}>
                            <div className="flex items-center gap-1">Người XL {sortCol === 'user' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}</div>
                        </th>
                        <th className="px-4 py-3 border-b border-slate-200">Ghi chú</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                                    <span>Đang tải dữ liệu...</span>
                                </div>
                            </td>
                        </tr>
                    ) : filteredData.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-slate-500 italic">Không có dữ liệu DCU</td>
                        </tr>
                    ) : (
                        paginatedData.map((row, idx) => (
                            <tr 
                                 key={idx} 
                                 onClick={(e) => {
                                    // Bỏ qua nếu click vào link hoặc hình ảnh
                                    if ((e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('button')) return;
                                    setId(row.id || '');     if (listType === 'chua_phan_cong') setIsUpdateMode(true);     else setIsUpdateMode(false);
                                    setTen(row.ten || '');
                                    setDiaChi(row.diaChi || '');
                                    setToadoX(row.toadoX || '');
                                    setToadoY(row.toadoY || '');
                                    setGhiChu(row.ghiChu || '');
                                    setImagePreview(row.hinhAnh || null);
                                    setUploadedDriveUrl(row.hinhAnh || '');
                                    setImageSizeKb(null);
                                    setImageFile(null);
                                    uploadPromiseRef.current = null;
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`hover:bg-blue-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                                title={listType === 'chua_phan_cong' ? "Bấm để cập nhật" : "Bấm để xem chi tiết"}
                            >
                                <td className="px-4 py-3 font-medium text-slate-700 border-b border-slate-100" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-2">
                                        {listType === 'chua_phan_cong' && (
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                checked={selectedIds.includes(getDcuKey(row, (currentPage - 1) * rowsPerPage + idx))}
                                                onChange={(e) => {
                                                    const rowKey = getDcuKey(row, (currentPage - 1) * rowsPerPage + idx);
                                                    if (e.target.checked) setSelectedIds(prev => [...prev, rowKey]);
                                                    else setSelectedIds(prev => prev.filter(id => id !== rowKey));
                                                }}
                                            />
                                        )}
                                        {row.stt || ((currentPage - 1) * rowsPerPage + idx + 1)}
                                    </div>
                                </td>
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
                                <td className="px-4 py-3 text-slate-700 font-medium border-b border-slate-100">{row.user}</td>
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
