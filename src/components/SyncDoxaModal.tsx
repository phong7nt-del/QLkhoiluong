import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, 
  UploadCloud, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  FileSpreadsheet, 
  Building2, 
  Users, 
  Database,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import { DataStore } from '../store/DataStore';

interface SyncDoxaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSource?: 'mdis' | 'hes';
  canSync: boolean;
  onSyncSuccess: () => void;
}

export default function SyncDoxaModal({
  isOpen,
  onClose,
  initialSource = 'mdis',
  canSync,
  onSyncSuccess
}: SyncDoxaModalProps) {
  const [source, setSource] = useState<'mdis' | 'hes'>(initialSource);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSource(initialSource);
      resetState();
    }
  }, [isOpen, initialSource]);

  const resetState = () => {
    setFile(null);
    setParseError(null);
    setDetectedColumns([]);
    setParsedData(null);
    setSuccessMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSourceChange = (newSource: 'mdis' | 'hes') => {
    if (newSource === source) return;
    setSource(newSource);
    resetState();
  };

  const currentCount = source === 'mdis' 
    ? DataStore.getMatKetNoi().length 
    : DataStore.getChiTietMKN().length;

  const normalizeCol = (s: string) => 
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, '');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canSync) return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const processFile = async (fileObj: File) => {
    setFile(fileObj);
    setIsParsing(true);
    setParseError(null);
    setParsedData(null);
    setDetectedColumns([]);

    try {
      const buffer = await fileObj.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      
      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        throw new Error('File không chứa trang tính (sheet) nào.');
      }

      // Prioritize target sheet name if present, otherwise sheet 0
      const sheetName = wb.SheetNames.find(s => {
        const n = normalizeCol(s);
        return source === 'mdis' 
          ? (n.includes('matketnoi') || n.includes('mdis')) 
          : (n.includes('chitietmkn') || n.includes('hes') || n.includes('chitiet'));
      }) || wb.SheetNames[0];

      const ws = wb.Sheets[sheetName];
      const rawJson = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];

      if (!rawJson || rawJson.length === 0) {
        throw new Error(`Sheet "${sheetName}" trong file không có dữ liệu (sheet trống).`);
      }

      const sampleRow = rawJson[0];
      const fileHeaders = Object.keys(sampleRow);
      setDetectedColumns(fileHeaders);

      if (source === 'mdis') {
        // MDIS validation: must match structure of sheet MatKetNoi (Key column: MÃ ĐIỂM ĐO)
        const docKey = fileHeaders.find(k => {
          const n = normalizeCol(k);
          return n.includes('madiemdo') || n.includes('maddo') || n.includes('makh');
        });

        if (!docKey) {
          throw new Error(
            "Cấu trúc file MDIS không hợp lệ: Không tìm thấy cột 'MÃ ĐIỂM ĐO' (hoặc 'Mã điểm đo') tương tự cấu trúc sheet MatKetNoi. Cần có cột này để liên kết khách hàng và trạm."
          );
        }

        const validRows = rawJson.map(row => {
          const maDiemDo = String(row[docKey] || '').trim();
          const cleanRow: any = { maDiemDo };
          for (const k of fileHeaders) {
            cleanRow[k] = row[k];
          }
          return cleanRow;
        }).filter(r => r.maDiemDo && r.maDiemDo !== '');

        if (validRows.length === 0) {
          throw new Error("File có cột 'MÃ ĐIỂM ĐO' nhưng tất cả các dòng đều có mã điểm đo trống.");
        }

        setParsedData(validRows);
      } else {
        // HES validation: must match structure of sheet ChiTietMKN
        // Expected columns: IMEI, DCUTYPE, DCUDESC, IDSTATION, STATUS_DCU, SL_DANAP, SL_TT, etc.
        const normalizedHeaders = fileHeaders.map(h => normalizeCol(h));
        
        const hasImei = normalizedHeaders.some(h => h.includes('imei'));
        const hasDesc = normalizedHeaders.some(h => h.includes('dcudesc') || h.includes('tentram') || h.includes('desc'));
        const hasStation = normalizedHeaders.some(h => h.includes('idstation') || h.includes('matram') || h.includes('station'));
        const hasStatus = normalizedHeaders.some(h => h.includes('statusdcu') || h.includes('status') || h.includes('trangthai'));
        const hasQty = normalizedHeaders.some(h => h.includes('sldanap') || h.includes('sltt') || h.includes('soluong'));

        const isHesValid = (hasImei || hasDesc || hasStation) && (hasStatus || hasQty);

        if (!isHesValid) {
          throw new Error(
            "Cấu trúc file HES không hợp lệ: File phải có cấu trúc tương tự sheet ChiTietMKN (yêu cầu các cột như IMEI, DCUTYPE, DCUDESC, IDSTATION, STATUS_DCU, SL_DANAP, SL_TT)."
          );
        }

        // Map columns gracefully to standard keys
        const findField = (row: any, candidates: string[]) => {
          const k = Object.keys(row).find(key => candidates.some(c => normalizeCol(key) === normalizeCol(c)));
          return k ? row[k] : '';
        };

        const validRows = rawJson.map(row => {
          const imei = String(findField(row, ['IMEI', 'imei']) || '').trim();
          const dcuType = String(findField(row, ['DCUTYPE', 'DCU TYPE', 'Loại DCU']) || '').trim();
          const dcuDesc = String(findField(row, ['DCUDESC', 'DCU DESC', 'Tên DCU', 'Tên trạm']) || '').trim();
          const dcuIdOrg = String(findField(row, ['DCUID_ORG', 'DCUID ORG']) || '').trim();
          const idStation = String(findField(row, ['IDSTATION', 'ID STATION', 'Mã trạm']) || '').trim();
          const tile = String(findField(row, ['TILE', 'TỈ LỆ', 'TY LE']) || '').trim();
          const slDanap = String(findField(row, ['SL_DANAP', 'SL ĐÃ NẠP', 'SL_DA_NAP']) || '').trim();
          const slTt = String(findField(row, ['SL_TT', 'SL THỰC TẾ', 'SL_THUC_TE']) || '').trim();
          const slTt1P = String(findField(row, ['SL_TT_1PHA', 'SL 1 PHA']) || '').trim();
          const slTt3P = String(findField(row, ['SL_TT_3PHA', 'SL 3 PHA']) || '').trim();
          const statusDcu = String(findField(row, ['STATUS_DCU', 'STATUS DCU', 'Trạng thái', 'STATUS']) || '').trim();

          return {
            ...row,
            IMEI: imei || row['IMEI'] || '',
            DCUTYPE: dcuType || row['DCUTYPE'] || '',
            DCUDESC: dcuDesc || row['DCUDESC'] || '',
            DCUID_ORG: dcuIdOrg || row['DCUID_ORG'] || '',
            IDSTATION: idStation || row['IDSTATION'] || '',
            TILE: tile || row['TILE'] || '',
            SL_DANAP: slDanap || row['SL_DANAP'] || '',
            SL_TT: slTt || row['SL_TT'] || '',
            SL_TT_1PHA: slTt1P || row['SL_TT_1PHA'] || '',
            SL_TT_3PHA: slTt3P || row['SL_TT_3PHA'] || '',
            STATUS_DCU: statusDcu || row['STATUS_DCU'] || ''
          };
        }).filter(r => r.IMEI || r.DCUDESC || r.IDSTATION);

        if (validRows.length === 0) {
          throw new Error("Không tìm thấy dòng dữ liệu DCU/Trạm hợp lệ nào trong file HES.");
        }

        setParsedData(validRows);
      }
    } catch (err: any) {
      console.error("Error reading sync file:", err);
      setParseError(err.message || 'Lỗi đọc file. Vui lòng kiểm tra định dạng Excel/CSV.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    if (source === 'mdis') {
      const templateData = [
        {
          'STT': 1,
          'MÃ ĐIỂM ĐO': 'PD01000123456001',
          'MÃ ĐIỂM ĐO LIÊN KẾT': '',
          'TÊN NHÀ CUNG CẤP': 'VIETTEL',
          'LOẠI ĐIỂM ĐO': '1 Pha',
          'TÊN ĐIỂM ĐO': 'Nguyễn Văn A',
          'ĐỊA CHỈ ĐIỂM ĐO': '123 Đường 30/4, P. Thắng Nhất, TP. Vũng Tàu',
          'TRẠNG THÁI ĐIỂM ĐO': 'Bình thường',
          'SỐ SERIAL CMIS': '21000123',
          'SỐ SERIAL HES': '21000123',
          'TÌNH TRẠNG KẾT NỐI': 'Mất kết nối',
          'THỜI ĐIỂM CÓ DỮ LIỆU GẦN NHẤT': '22/10/2026 14:30:00'
        },
        {
          'STT': 2,
          'MÃ ĐIỂM ĐO': 'PD01000123456002',
          'MÃ ĐIỂM ĐO LIÊN KẾT': '',
          'TÊN NHÀ CUNG CẤP': 'MOBIFONE',
          'LOẠI ĐIỂM ĐO': '3 Pha',
          'TÊN ĐIỂM ĐO': 'Công ty TNHH Hải Đăng',
          'ĐỊA CHỈ ĐIỂM ĐO': '45 Lê Lợi, TP. Bà Rịa',
          'TRẠNG THÁI ĐIỂM ĐO': 'Bình thường',
          'SỐ SERIAL CMIS': '22000456',
          'SỐ SERIAL HES': '22000456',
          'TÌNH TRẠNG KẾT NỐI': 'Mất kết nối',
          'THỜI ĐIỂM CÓ DỮ LIỆU GẦN NHẤT': '20/10/2026 08:15:00'
        }
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(wb, ws, 'MatKetNoi');
      XLSX.writeFile(wb, 'Mau_DongBo_MDIS_MatKetNoi.xlsx');
    } else {
      const templateData = [
        {
          'ORGID': 'PB01',
          'IMEI': '864201041234567',
          'DCUTYPE': 'DCU_3G',
          'DCUDESC': 'TBA BẾN ĐÁ 1',
          'DCUID_ORG': 'DCU_001',
          'IDSTATION': '471BD1',
          'SL_DANAP': 150,
          'SL_TT_1PHA': 140,
          'SL_TT_3PHA': 5,
          'SL_TT': 145,
          'TILE': 96.67,
          'STATUS_DCU': 'Online'
        },
        {
          'ORGID': 'PB01',
          'IMEI': '864201041234568',
          'DCUTYPE': 'DCU_3G',
          'DCUDESC': 'TBA HẠ LONG 2',
          'DCUID_ORG': 'DCU_002',
          'IDSTATION': '471HL2',
          'SL_DANAP': 200,
          'SL_TT_1PHA': 150,
          'SL_TT_3PHA': 10,
          'SL_TT': 160,
          'TILE': 80.0,
          'STATUS_DCU': 'Offline'
        }
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(wb, ws, 'ChiTietMKN');
      XLSX.writeFile(wb, 'Mau_DongBo_HES_ChiTietMKN.xlsx');
    }
  };

  const handleConfirmSync = async () => {
    if (!parsedData || parsedData.length === 0) return;
    if (!canSync) {
      alert('Bạn không có quyền thực hiện đồng bộ dữ liệu. Chỉ Đội trưởng hoặc người được phân quyền trong tab Hệ thống mới có thể đồng bộ.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (source === 'mdis') {
        await DataStore.setMatKetNoi(parsedData);
        setSuccessMsg(`Đã xóa sạch dữ liệu cũ và nạp thành công ${parsedData.length.toLocaleString('vi-VN')} bản ghi MDIS (MatKetNoi)!`);
      } else {
        await DataStore.setChiTietMKN(parsedData);
        setSuccessMsg(`Đã xóa sạch dữ liệu cũ và nạp thành công ${parsedData.length.toLocaleString('vi-VN')} bản ghi HES (ChiTietMKN)!`);
      }

      onSyncSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      console.error('Error saving synced data:', e);
      setParseError('Lỗi lưu trữ dữ liệu: ' + (e.message || 'Không xác định'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevertToSheet = async () => {
    if (!canSync) return;
    const confirmRevert = window.confirm(
      `Bạn có chắc chắn muốn xóa dữ liệu file vừa nạp và khôi phục dữ liệu gốc từ Google Sheet cho nguồn ${source.toUpperCase()}?`
    );
    if (!confirmRevert) return;

    setIsReverting(true);
    try {
      if (source === 'mdis') {
        await DataStore.resetMatKetNoiToSheet();
      } else {
        await DataStore.resetChiTietMKNToSheet();
      }
      await DataStore.syncMasterData();
      onSyncSuccess();
      setSuccessMsg(`Đã khôi phục dữ liệu nguồn ${source.toUpperCase()} từ Google Sheet thành công!`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      console.error('Error reverting data:', e);
      alert('Lỗi khôi phục: ' + (e.message || 'Không xác định'));
    } finally {
      setIsReverting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white border-2 border-[#141414] shadow-[8px_8px_0_#141414] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#141414] text-white p-4 flex items-center justify-between border-b border-[#141414]">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-black uppercase tracking-wider">
                Đồng bộ dữ liệu Đo xa (MDIS / HES)
              </h2>
              <p className="text-xs text-white/70">
                Cập nhật dữ liệu từ file Excel/CSV, thay thế toàn bộ dữ liệu cũ
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Permission warning if user is not authorized */}
          {!canSync && (
            <div className="bg-amber-50 border border-amber-300 text-amber-800 p-4 rounded flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Giới hạn phân quyền</p>
                <p className="text-xs mt-0.5">
                  Bạn hiện không có quyền thực hiện đồng bộ dữ liệu. Mặc định chỉ <strong>Đội trưởng</strong> (hoặc người dùng được cấp quyền trong tab Hệ thống) mới có thể đồng bộ.
                </p>
              </div>
            </div>
          )}

          {/* Success Message Banner */}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-400 text-emerald-800 p-4 rounded flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="font-bold text-sm">{successMsg}</p>
            </div>
          )}

          {/* Source Selection Cards */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
              1. Chọn nguồn dữ liệu cần đồng bộ
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* MDIS Card */}
              <div 
                onClick={() => handleSourceChange('mdis')}
                className={`p-4 border-2 cursor-pointer transition-all ${
                  source === 'mdis'
                    ? 'border-blue-600 bg-blue-50/70 shadow-[4px_4px_0_#2563EB]'
                    : 'border-[#141414]/20 hover:border-[#141414] bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className={`w-5 h-5 ${source === 'mdis' ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span className="font-black text-sm uppercase tracking-wide">Hệ thống MDIS</span>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 font-bold uppercase rounded ${
                    source === 'mdis' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    Sheet MatKetNoi
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Dữ liệu điểm đo, khách hàng mất kết nối phục vụ thống kê theo khu vực và danh sách khách hàng.
                </p>
                <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Số bản ghi hiện hữu:</span>
                  <span className="text-blue-700 font-black">
                    {DataStore.getMatKetNoi().length.toLocaleString('vi-VN')} dòng
                  </span>
                </div>
              </div>

              {/* HES Card */}
              <div 
                onClick={() => handleSourceChange('hes')}
                className={`p-4 border-2 cursor-pointer transition-all ${
                  source === 'hes'
                    ? 'border-amber-600 bg-amber-50/70 shadow-[4px_4px_0_#D97706]'
                    : 'border-[#141414]/20 hover:border-[#141414] bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className={`w-5 h-5 ${source === 'hes' ? 'text-amber-600' : 'text-slate-500'}`} />
                    <span className="font-black text-sm uppercase tracking-wide">Hệ thống HES</span>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 font-bold uppercase rounded ${
                    source === 'hes' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    Sheet ChiTietMKN
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Dữ liệu trạm, DCU, số lượng nạp, số lượng thu thập thực tế và tỷ lệ kết nối từ hệ thống HES.
                </p>
                <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Số bản ghi hiện hữu:</span>
                  <span className="text-amber-700 font-black">
                    {DataStore.getChiTietMKN().length.toLocaleString('vi-VN')} dòng
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Download Template Bar */}
          <div className="flex flex-wrap items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>
                Cấu trúc file tải lên phải tương tự như sheet <strong>{source === 'mdis' ? 'MatKetNoi' : 'ChiTietMKN'}</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#141414] text-xs font-bold shadow-[2px_2px_0_#141414] hover:bg-slate-100 transition-all cursor-pointer"
              >
                <Download size={14} className="text-emerald-600" />
                <span>Tải file mẫu {source.toUpperCase()} (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* File Upload Zone */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
              2. Chọn file dữ liệu ({source === 'mdis' ? 'MDIS / MatKetNoi' : 'HES / ChiTietMKN'})
            </label>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileChange}
              disabled={!canSync}
              className="hidden" 
              id="sync-file-input"
            />
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => canSync && fileInputRef.current?.click()}
              className={`border-2 border-dashed p-6 text-center transition-all ${
                !canSync 
                  ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60' 
                  : file
                    ? 'border-emerald-500 bg-emerald-50/40 cursor-pointer'
                    : 'border-[#141414]/30 hover:border-blue-500 hover:bg-blue-50/20 cursor-pointer'
              }`}
            >
              <UploadCloud className={`w-10 h-10 mx-auto mb-2 ${file ? 'text-emerald-600' : 'text-slate-400'}`} />
              {file ? (
                <div>
                  <p className="font-bold text-sm text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {(file.size / 1024).toFixed(1)} KB • Nhấn để chọn lại file khác
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-sm text-slate-800">
                    Kéo thả file Excel (.xlsx, .xls) hoặc CSV vào đây, hoặc click để duyệt file
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Hỗ trợ file xuất trực tiếp từ phần mềm {source.toUpperCase()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Parsing State */}
          {isParsing && (
            <div className="flex items-center justify-center gap-2 py-4 text-blue-600 text-sm font-bold">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Đang đọc và phân tích cấu trúc file...</span>
            </div>
          )}

          {/* Parse Error Display */}
          {parseError && (
            <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">File không hợp lệ</p>
                <p className="text-xs mt-1 leading-relaxed whitespace-pre-line">{parseError}</p>
                {detectedColumns.length > 0 && (
                  <div className="mt-2 text-xs">
                    <span className="font-bold">Các cột được tìm thấy trong file: </span>
                    <span className="text-slate-600">{detectedColumns.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parsed Summary & Comparison */}
          {parsedData && (
            <div className="space-y-4 animate-in fade-in">
              {/* Overwrite Warning Banner */}
              <div className="bg-amber-50 border-2 border-amber-500 p-4 shadow-[4px_4px_0_#D97706]">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-amber-900 uppercase tracking-wide">
                      Xác nhận xóa dữ liệu cũ và ghi đè
                    </h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Khi bấm đồng bộ: <strong>Toàn bộ {currentCount.toLocaleString('vi-VN')} bản ghi cũ</strong> của nguồn {source.toUpperCase()} sẽ bị xóa hoàn toàn khỏi hệ thống, và thay thế bằng <strong>{parsedData.length.toLocaleString('vi-VN')} bản ghi mới</strong> từ file này.
                    </p>
                  </div>
                </div>
              </div>

              {/* Comparison Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-100 p-3 border border-slate-300">
                  <span className="text-xs text-slate-500 uppercase font-bold block">Dữ liệu hiện hữu</span>
                  <span className="text-xl font-black text-slate-700">
                    {currentCount.toLocaleString('vi-VN')} dòng
                  </span>
                </div>
                <div className="bg-blue-50 p-3 border border-blue-300">
                  <span className="text-xs text-blue-600 uppercase font-bold block">Dữ liệu mới thay thế</span>
                  <span className="text-xl font-black text-blue-700">
                    {parsedData.length.toLocaleString('vi-VN')} dòng
                  </span>
                </div>
              </div>

              {/* Data Preview Table */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Xem trước 5 dòng đầu tiên:
                  </span>
                  <span className="text-xs text-slate-500">
                    Tổng số cột: {detectedColumns.length}
                  </span>
                </div>
                <div className="border border-[#141414] overflow-x-auto max-h-48 text-xs bg-white">
                  <table className="w-full text-left border-collapse table-auto whitespace-nowrap">
                    <thead className="bg-[#141414] text-white sticky top-0">
                      <tr>
                        <th className="p-2 border-r border-white/20 text-center">STT</th>
                        {detectedColumns.slice(0, 7).map((col, idx) => (
                          <th key={idx} className="p-2 border-r border-white/20 font-bold">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 5).map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-200 text-center font-bold">{rIdx + 1}</td>
                          {detectedColumns.slice(0, 7).map((col, cIdx) => (
                            <td key={cIdx} className="p-2 border-r border-slate-200">
                              {String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-4 border-t border-[#141414] flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={handleRevertToSheet}
              disabled={isReverting || !canSync}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-red-700 hover:bg-red-50 border border-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
              title="Khôi phục dữ liệu gốc từ Google Sheet"
            >
              <RotateCcw size={14} className={isReverting ? 'animate-spin' : ''} />
              <span>Khôi phục từ Google Sheet</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#141414] font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleConfirmSync}
              disabled={!parsedData || parsedData.length === 0 || isSubmitting || !canSync}
              className={`px-5 py-2 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                !parsedData || !canSync
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-[3px_3px_0_#141414] cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang xử lý & lưu...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={14} />
                  <span>Xác nhận xóa cũ & nạp mới</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
