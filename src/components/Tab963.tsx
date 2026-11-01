import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx-js-style';
import { 
  Gauge, Search, Mic, MicOff, RefreshCw, CheckCircle2, 
  AlertTriangle, Clock, ChevronRight, ChevronDown, 
  FileSpreadsheet, Filter, User, Calendar, MapPin, 
  Layers, Check, Sparkles, AlertCircle, Zap, ChevronLeft,
  ChevronsLeft, ChevronsRight, ShieldAlert, BarChart3, ListFilter, X
} from 'lucide-react';
import { DataStore, Entry963, SheetMember, calculateGioVuot } from '../store/DataStore';

interface Tab963Props {
  sessionUser: SheetMember | null;
  refreshToggle?: number;
}

export default function Tab963({ sessionUser, refreshToggle = 0 }: Tab963Props) {
  const [activeSubTab, setActiveSubTab] = useState<'thuc_hien' | 'bao_cao'>('thuc_hien');
  const [entries, setEntries] = useState<Entry963[]>(() => DataStore.get963Entries());
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Selected customer for form details
  const [selectedCustomer, setSelectedCustomer] = useState<Entry963 | null>(null);

  // Tree selection state: filter by Dot or KV
  const [selectedDot, setSelectedDot] = useState<string | null>(null);
  const [selectedKv, setSelectedKv] = useState<string | null>(null);

  // Tree expanded nodes
  const [expandedDots, setExpandedDots] = useState<Record<string, boolean>>({});
  const [expandedKvs, setExpandedKvs] = useState<Record<string, boolean>>({});

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'fuzzy' | 'exact'>('fuzzy');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Form input state
  const [formNv, setFormNv] = useState<string>(sessionUser?.name || '');
  const [formNgayGio, setFormNgayGio] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Completed table pagination (10 customers / page)
  const PAGE_SIZE = 10;
  const [completedPage, setCompletedPage] = useState(1);

  // Format current datetime helper dd/MM/yyyy HH:mm
  const getCurrentDateTimeStr = (): string => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${d}/${m}/${y} ${hh}:${mm}`;
  };

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Sync data from store / Google Sheets
  const refreshData = async (forceSheetFetch = false) => {
    if (forceSheetFetch) {
      setIsLoading(true);
      showToast('info', 'Đang tải dữ liệu mới nhất từ sheet 963...');
      try {
        const fresh = await DataStore.fetch963Data(true);
        setEntries(fresh);
        showToast('success', `Đã tải ${fresh.length} khách hàng từ sheet 963!`);
      } catch (e: any) {
        showToast('error', 'Lỗi khi tải dữ liệu sheet 963: ' + (e?.message || 'Mất kết nối'));
      } finally {
        setIsLoading(false);
      }
    } else {
      setEntries(DataStore.get963Entries());
    }
  };

  useEffect(() => {
    refreshData(false);
  }, [refreshToggle]);

  useEffect(() => {
    const handleUpdate = () => {
      setEntries(DataStore.get963Entries());
    };
    window.addEventListener('tab963_updated', handleUpdate);
    return () => window.removeEventListener('tab963_updated', handleUpdate);
  }, []);

  // Update default NV when sessionUser changes
  useEffect(() => {
    if (sessionUser?.name) {
      setFormNv(sessionUser.name);
    }
  }, [sessionUser?.name]);

  // When a customer is selected, initialize form fields
  useEffect(() => {
    if (selectedCustomer) {
      setFormNv(selectedCustomer.nv || sessionUser?.name || '');
      setFormNgayGio(selectedCustomer.ngayGio || getCurrentDateTimeStr());
    }
  }, [selectedCustomer]);

  // Auto-expand first dot on initial load
  useEffect(() => {
    if (entries.length > 0 && Object.keys(expandedDots).length === 0) {
      const dots = Array.from(new Set(entries.map(e => e.dot || '1'))).sort();
      if (dots.length > 0 && dots[0]) {
        const firstDot = String(dots[0]);
        setExpandedDots({ [firstDot]: true });
        const firstDotKvs = Array.from(new Set(entries.filter(e => (e.dot || '1') === firstDot).map(e => e.kv || 'Khác'))).sort();
        if (firstDotKvs.length > 0 && firstDotKvs[0]) {
          setExpandedKvs({ [`${firstDot}_${firstDotKvs[0]}`]: true });
        }
      }
    }
  }, [entries]);

  // Voice search using Web Speech API (committing search only after user stops talking)
  const toggleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Trình duyệt của bạn không hỗ trợ tính năng nhận diện giọng nói (Web Speech API). Vui lòng dùng Chrome hoặc Edge!');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        showToast('info', 'Đang lắng nghe... Hãy nói Mã khách hàng hoặc Tên khách hàng');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        // Only set and execute search when speech is final (user stops speaking)
        if (event.results[0] && event.results[0].isFinal) {
          const cleanText = transcript.trim();
          setSearchQuery(cleanText);
          showToast('success', `Tìm kiếm giọng nói: "${cleanText}"`);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          showToast('error', 'Lỗi nhận diện giọng nói: ' + event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.warn('Cannot start speech recognition:', e);
      setIsListening(false);
    }
  };

  // Live calculation of GioVuot based on form datetime
  const calculatedGioVuot = useMemo(() => {
    return calculateGioVuot(formNgayGio);
  }, [formNgayGio]);

  // Normalization helper for searching
  const normalize = (str: string): string => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase()
      .trim();
  };

  // Filtered entries based on Search Query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.trim();
    const qNorm = normalize(q);

    return entries.filter(item => {
      const maKh = item.maKh || '';
      const tenKh = item.tenKh || '';

      if (searchMode === 'exact') {
        return (
          maKh.toLowerCase() === q.toLowerCase() ||
          tenKh.toLowerCase() === q.toLowerCase() ||
          normalize(maKh) === qNorm ||
          normalize(tenKh) === qNorm
        );
      }

      // Fuzzy / Partial match
      return (
        normalize(maKh).includes(qNorm) ||
        normalize(tenKh).includes(qNorm)
      );
    });
  }, [entries, searchQuery, searchMode]);

  // Tree structure: Dot -> KV -> Khách hàng
  interface TreeKvNode {
    kv: string;
    customers: Entry963[];
    total: number;
    completed: number;
    thuHoi: number;
  }

  interface TreeDotNode {
    dot: string;
    kvs: Record<string, TreeKvNode>;
    total: number;
    completed: number;
    thuHoi: number;
  }

  const treeData = useMemo(() => {
    const dotsMap: Record<string, TreeDotNode> = {};

    filteredEntries.forEach(item => {
      const dot = item.dot || '1';
      const kv = item.kv || 'Khác';
      const isDone = item.ketQua && item.ketQua.trim().toLowerCase().includes('xong');
      const isThuHoi = item.kSuDung && item.kSuDung.trim().toLowerCase().includes('thu hồi');

      if (!dotsMap[dot]) {
        dotsMap[dot] = {
          dot,
          kvs: {},
          total: 0,
          completed: 0,
          thuHoi: 0
        };
      }

      dotsMap[dot].total++;
      if (isDone) dotsMap[dot].completed++;
      if (isThuHoi) dotsMap[dot].thuHoi++;

      if (!dotsMap[dot].kvs[kv]) {
        dotsMap[dot].kvs[kv] = {
          kv,
          customers: [],
          total: 0,
          completed: 0,
          thuHoi: 0
        };
      }

      dotsMap[dot].kvs[kv].total++;
      if (isDone) dotsMap[dot].kvs[kv].completed++;
      if (isThuHoi) dotsMap[dot].kvs[kv].thuHoi++;
      dotsMap[dot].kvs[kv].customers.push(item);
    });

    return dotsMap;
  }, [filteredEntries]);

  const sortedDotKeys = useMemo(() => {
    return Object.keys(treeData).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [treeData]);

  // Completed customers list for the bottom table based on left tree selection
  const completedCustomersList = useMemo(() => {
    return entries.filter(item => {
      const isDone = item.ketQua && item.ketQua.trim().toLowerCase().includes('xong');
      if (!isDone) return false;

      if (selectedDot && item.dot !== selectedDot) return false;
      if (selectedKv && item.kv !== selectedKv) return false;
      return true;
    });
  }, [entries, selectedDot, selectedKv]);

  // Reset completed table page when filter changes
  useEffect(() => {
    setCompletedPage(1);
  }, [selectedDot, selectedKv]);

  const totalCompletedPages = Math.max(1, Math.ceil(completedCustomersList.length / PAGE_SIZE));
  const currentCompletedPage = Math.min(completedPage, totalCompletedPages);
  const paginatedCompletedList = useMemo(() => {
    const start = (currentCompletedPage - 1) * PAGE_SIZE;
    return completedCustomersList.slice(start, start + PAGE_SIZE);
  }, [completedCustomersList, currentCompletedPage]);

  // Handle confirming meter replacement
  const handleConfirmReplacement = async () => {
    if (!selectedCustomer) {
      alert('Vui lòng chọn khách hàng cần thay công tơ từ sơ đồ cây bên trái!');
      return;
    }

    // Constraint: Customers with KSuDung === 'Thu hồi' CANNOT be replaced
    if (selectedCustomer.kSuDung && selectedCustomer.kSuDung.trim().toLowerCase().includes('thu hồi')) {
      alert('LƯU Ý: Khách hàng không sử dụng (Thu hồi) thì không được thay công tơ theo quy định QĐ 963!');
      return;
    }

    if (!formNv.trim()) {
      alert('Vui lòng nhập tên nhân viên thực hiện!');
      return;
    }

    if (!formNgayGio.trim()) {
      alert('Vui lòng nhập ngày giờ thực hiện (dd/mm/yyyy hh:mm)!');
      return;
    }

    setIsSubmitting(true);
    showToast('info', `Đang ghi nhận thay công tơ cho KH ${selectedCustomer.maKh}...`);

    try {
      const gv = calculateGioVuot(formNgayGio);
      const res = await DataStore.update963Entry(selectedCustomer.maKh, {
        nv: formNv.trim(),
        ngayGio: formNgayGio.trim(),
        ketQua: 'Xong',
        gioVuot: gv
      });

      if (res.error) {
        showToast('error', res.error);
      } else {
        showToast('success', `Đã xác nhận thay xong công tơ cho KH: ${selectedCustomer.maKh} (Giờ vượt: ${gv}h)`);
        if (res.entry) {
          setSelectedCustomer(res.entry);
        }
      }
    } catch (e: any) {
      showToast('error', 'Lỗi khi cập nhật: ' + (e?.message || 'Có sự cố xảy ra'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Tab 1 completed customers to Excel
  const handleExportCompletedExcel = () => {
    if (completedCustomersList.length === 0) {
      alert('Không có dữ liệu đã thay xong để xuất file Excel!');
      return;
    }

    const exportRows = completedCustomersList.map((c, idx) => ({
      'STT': idx + 1,
      'Mã Khách Hàng': c.maKh,
      'Tên Khách Hàng': c.tenKh,
      'Địa Chỉ': c.diaChi,
      'Khu Vực': c.kv,
      'Đợt': c.dot,
      'Loại Công Tơ': c.loaiCto || '',
      'Số Pha': c.soPha || '',
      'Tỷ Số TU': c.tySoTu || '',
      'Tỷ Số TI': c.tySoTi || '',
      'Công Nghệ': c.congNghe || '',
      'Đo Xa': c.doXa || '',
      'NV Thực Hiện': c.nv || '',
      'Ngày Giờ Thay': c.ngayGio || '',
      'Kết Quả': c.ketQua || 'Xong',
      'Giờ Vượt (h)': c.gioVuot !== undefined ? c.gioVuot : 0
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachThayXong');
    const filterInfo = selectedKv ? `_KV_${selectedKv}` : selectedDot ? `_Dot_${selectedDot}` : '_TatCa';
    XLSX.writeFile(wb, `DS_ThayCongTo_QD963${filterInfo}_${getCurrentDateTimeStr().replace(/[/ :]/g, '_')}.xlsx`);
    showToast('success', 'Đã xuất file Excel danh sách thay xong thành công!');
  };

  // ==============================================================
  // TAB 2: BÁO CÁO KẾT QUẢ THAY CÔNG TƠ THEO QĐ 963
  // ==============================================================
  interface ReportRow {
    dot: string;
    kv: string;
    tongKh: number;
    thuHoi: number;
    canThay: number;
    daThay: number;
    tyLe: number;
    chuaThay: number;
    tongGioVuot: number;
  }

  const reportData = useMemo(() => {
    const rows: ReportRow[] = [];
    const dotsMap: Record<string, Record<string, {
      tong: number;
      thuHoi: number;
      daThay: number;
      gioVuot: number;
    }>> = {};

    entries.forEach(e => {
      const dot = e.dot || '1';
      const kv = e.kv || 'Khác';
      const isDone = e.ketQua && e.ketQua.trim().toLowerCase().includes('xong');
      const isThuHoi = e.kSuDung && e.kSuDung.trim().toLowerCase().includes('thu hồi');
      const gv = typeof e.gioVuot === 'number' ? e.gioVuot : (parseFloat(String(e.gioVuot || 0)) || 0);

      if (!dotsMap[dot]) dotsMap[dot] = {};
      if (!dotsMap[dot][kv]) {
        dotsMap[dot][kv] = { tong: 0, thuHoi: 0, daThay: 0, gioVuot: 0 };
      }

      dotsMap[dot][kv].tong++;
      if (isThuHoi) dotsMap[dot][kv].thuHoi++;
      if (isDone) {
        dotsMap[dot][kv].daThay++;
        dotsMap[dot][kv].gioVuot += gv;
      }
    });

    const sortedDots = Object.keys(dotsMap).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });

    sortedDots.forEach(dot => {
      const kvs = Object.keys(dotsMap[dot]).sort();
      kvs.forEach(kv => {
        const item = dotsMap[dot][kv];
        const canThay = Math.max(0, item.tong - item.thuHoi);
        const chuaThay = Math.max(0, canThay - item.daThay);
        const tyLe = canThay > 0 ? Math.round((item.daThay / canThay) * 1000) / 10 : (item.daThay > 0 ? 100 : 0);

        rows.push({
          dot,
          kv,
          tongKh: item.tong,
          thuHoi: item.thuHoi,
          canThay,
          daThay: item.daThay,
          tyLe,
          chuaThay,
          tongGioVuot: Math.round(item.gioVuot * 100) / 100
        });
      });
    });

    return rows;
  }, [entries]);

  // Overall totals for Tab 2
  const reportTotals = useMemo(() => {
    let tongKh = 0;
    let thuHoi = 0;
    let canThay = 0;
    let daThay = 0;
    let chuaThay = 0;
    let tongGioVuot = 0;

    reportData.forEach(r => {
      tongKh += r.tongKh;
      thuHoi += r.thuHoi;
      canThay += r.canThay;
      daThay += r.daThay;
      chuaThay += r.chuaThay;
      tongGioVuot += r.tongGioVuot;
    });

    const tyLeChung = canThay > 0 ? Math.round((daThay / canThay) * 1000) / 10 : 0;

    return {
      tongKh,
      thuHoi,
      canThay,
      daThay,
      chuaThay,
      tongGioVuot: Math.round(tongGioVuot * 100) / 100,
      tyLeChung
    };
  }, [reportData]);

  // Export Tab 2 Report to Excel
  const handleExportReportExcel = () => {
    if (reportData.length === 0) {
      alert('Không có dữ liệu báo cáo để xuất!');
      return;
    }

    const exportRows = reportData.map((r, idx) => ({
      'STT': idx + 1,
      'Đợt Thực Hiện': `Đợt ${r.dot}`,
      'Khu Vực': r.kv,
      'Tổng Khách Hàng': r.tongKh,
      'Không Sử Dụng (Thu Hồi)': r.thuHoi,
      'Khách Hàng Cần Thay': r.canThay,
      'Đã Thay Xong': r.daThay,
      'Tỷ Lệ Hoàn Thành (%)': `${r.tyLe}%`,
      'Còn Lại Chưa Thay': r.chuaThay,
      'Tổng Giờ Vượt (h)': r.tongGioVuot
    }));

    // Add total row
    exportRows.push({
      'STT': '' as any,
      'Đợt Thực Hiện': 'TỔNG CỘNG',
      'Khu Vực': '',
      'Tổng Khách Hàng': reportTotals.tongKh,
      'Không Sử Dụng (Thu Hồi)': reportTotals.thuHoi,
      'Khách Hàng Cần Thay': reportTotals.canThay,
      'Đã Thay Xong': reportTotals.daThay,
      'Tỷ Lệ Hoàn Thành (%)': `${reportTotals.tyLeChung}%`,
      'Còn Lại Chưa Thay': reportTotals.chuaThay,
      'Tổng Giờ Vượt (h)': reportTotals.tongGioVuot
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BaoCao_QD963');
    XLSX.writeFile(wb, `BaoCao_KetQua_ThayCongTo_QD963_${getCurrentDateTimeStr().replace(/[/ :]/g, '_')}.xlsx`);
    showToast('success', 'Đã xuất file Excel báo cáo QĐ 963 thành công!');
  };

  return (
    <div className="space-y-5 pb-12 animate-fade-in font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold text-white animate-in slide-in-from-bottom-5 duration-200 ${
          toastMsg.type === 'success' ? 'bg-emerald-600' :
          toastMsg.type === 'error' ? 'bg-rose-600' : 'bg-slate-800'
        }`}>
          {toastMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {toastMsg.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
          {toastMsg.type === 'info' && <Clock className="w-4 h-4 shrink-0 animate-spin" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-indigo-900 text-white p-5 md:p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <Gauge className="w-6 h-6 text-amber-300" />
              </span>
              <div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-wide flex items-center gap-2">
                  <span>Theo Dõi Thay Công Tơ Theo QĐ 963</span>
                  <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full normal-case">
                    QĐ 963
                  </span>
                </h2>
                <p className="text-xs md:text-sm text-amber-100 mt-0.5">
                  Quản lý tiến độ thay thế công tơ theo Đợt, Khu vực, tính toán giờ vượt và báo cáo kết quả đồng bộ sheet 963.
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="bg-white/20 px-3 py-1 rounded-full font-semibold border border-white/20 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Người dùng: <b>{sessionUser?.name || 'Chưa đăng nhập'}</b></span>
              </span>
              <span className="bg-white/25 px-3 py-1 rounded-full font-bold border border-white/30 text-amber-200">
                Bộ phận: {sessionUser?.team || sessionUser?.boPhan || 'QLHTĐĐ'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => refreshData(true)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all backdrop-blur-md shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
              title="Tải lại dữ liệu mới nhất từ Google Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Tải lại Sheet</span>
            </button>
          </div>
        </div>

        {/* Top Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => setActiveSubTab('thuc_hien')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === 'thuc_hien'
                ? 'bg-white text-amber-900 shadow-md scale-102'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Tab 1: Thực Hiện Thay Công Tơ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('bao_cao')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === 'bao_cao'
                ? 'bg-white text-amber-900 shadow-md scale-102'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Tab 2: Báo Cáo Kết Quả</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: THỰC HIỆN THAY CÔNG TƠ (CHIA LÀM 2 PHẦN TRÁI / PHẢI) */}
      {/* ========================================================= */}
      {activeSubTab === 'thuc_hien' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* CỘT BÊN TRÁI (COL-4): SƠ ĐỒ CÂY CÁC ĐỢT -> KHU VỰC -> KHÁCH HÀNG & TÌM KIẾM */}
          <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide">
                  Sơ Đồ Cây Thực Hiện
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {filteredEntries.length} KH
              </span>
            </div>

            {/* Tìm kiếm gần đúng / chính xác và Giọng nói */}
            <div className="space-y-2">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm Mã KH hoặc Tên khách hàng..."
                  className="w-full pl-9 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleVoiceSearch}
                    className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                      isListening
                        ? 'bg-rose-500 text-white animate-pulse shadow-md'
                        : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                    }`}
                    title="Tìm kiếm bằng giọng nói (khi ngừng nói mới tìm)"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Toggle Search Mode: Gần đúng (Fuzzy - Mặc định) vs Chính xác (Exact) */}
              <div className="flex items-center justify-between text-[11px] px-1">
                <span className="text-slate-500">Chế độ tìm kiếm:</span>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSearchMode('fuzzy')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      searchMode === 'fuzzy'
                        ? 'bg-white text-amber-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Gần đúng
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode('exact')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      searchMode === 'exact'
                        ? 'bg-white text-amber-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Chính xác
                  </button>
                </div>
              </div>

              {isListening && (
                <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-2 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                  <span>Đang lắng nghe... Nói Mã KH hoặc Tên KH (khi bạn dừng nói, tìm kiếm sẽ tự thực hiện).</span>
                </div>
              )}
            </div>

            {/* Tree Navigation Root */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[640px] overflow-y-auto divide-y divide-slate-100 text-xs">
              {/* Option to clear node filter */}
              <div
                onClick={() => {
                  setSelectedDot(null);
                  setSelectedKv(null);
                }}
                className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                  !selectedDot && !selectedKv ? 'bg-amber-50 font-bold text-amber-900' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tất cả các đợt ({filteredEntries.length} KH)</span>
                </span>
                <span className="text-[10px] text-slate-400">Xem tất cả</span>
              </div>

              {/* Tree Nodes: Đợt */}
              {sortedDotKeys.map(dotKey => {
                const dotNode = treeData[dotKey];
                const isDotExpanded = Boolean(expandedDots[dotKey]);
                const isDotSelected = selectedDot === dotKey && !selectedKv;
                const dotPercent = dotNode.total > 0 ? Math.round((dotNode.completed / dotNode.total) * 100) : 0;

                return (
                  <div key={dotKey} className="bg-white">
                    {/* Đợt Header Node */}
                    <div
                      className={`flex items-center justify-between p-2.5 transition-colors cursor-pointer ${
                        isDotSelected ? 'bg-amber-100/70 border-l-4 border-amber-600 font-bold text-amber-950' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div 
                        className="flex items-center gap-1.5 flex-1 min-w-0"
                        onClick={() => {
                          setSelectedDot(dotKey);
                          setSelectedKv(null);
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedDots(prev => ({ ...prev, [dotKey]: !prev[dotKey] }));
                          }}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500"
                        >
                          {isDotExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                        <span className="font-bold truncate">Đợt {dotKey}</span>
                      </div>

                      {/* Dot Statistics: [Đã xong/Tổng (%)] */}
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 ml-2 ${
                        dotPercent === 100
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}>
                        {dotNode.completed}/{dotNode.total} ({dotPercent}%)
                      </span>
                    </div>

                    {/* Children of Đợt: Khu vực */}
                    {isDotExpanded && (
                      <div className="pl-5 pr-2 py-1 bg-slate-50/60 space-y-1 border-t border-slate-100">
                        {Object.keys(dotNode.kvs).sort().map(kvKey => {
                          const kvNode = dotNode.kvs[kvKey];
                          const kvCombinedKey = `${dotKey}_${kvKey}`;
                          const isKvExpanded = Boolean(expandedKvs[kvCombinedKey]);
                          const isKvSelected = selectedDot === dotKey && selectedKv === kvKey;
                          const kvPercent = kvNode.total > 0 ? Math.round((kvNode.completed / kvNode.total) * 100) : 0;

                          return (
                            <div key={kvKey} className="rounded-lg overflow-hidden border border-slate-200/60 bg-white">
                              {/* Khu vực Header */}
                              <div
                                className={`flex items-center justify-between p-2 cursor-pointer transition-colors ${
                                  isKvSelected ? 'bg-amber-100 border-l-3 border-amber-600 font-bold text-amber-950' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div
                                  className="flex items-center gap-1.5 flex-1 min-w-0"
                                  onClick={() => {
                                    setSelectedDot(dotKey);
                                    setSelectedKv(kvKey);
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedKvs(prev => ({ ...prev, [kvCombinedKey]: !prev[kvCombinedKey] }));
                                    }}
                                    className="p-0.5 hover:bg-slate-200 rounded text-slate-500"
                                  >
                                    {isKvExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  </button>
                                  <span className="font-semibold truncate">KV: {kvKey}</span>
                                </div>

                                {/* KV Statistics: [Đã xong/Tổng (%)] */}
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                  kvPercent === 100
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {kvNode.completed}/{kvNode.total} ({kvPercent}%)
                                </span>
                              </div>

                              {/* Customer items in this KV */}
                              {isKvExpanded && (
                                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 pl-4 pr-1 py-1 bg-slate-50/40 text-[11px]">
                                  {kvNode.customers.map(cust => {
                                    const isDone = cust.ketQua && cust.ketQua.trim().toLowerCase().includes('xong');
                                    const isThuHoi = cust.kSuDung && cust.kSuDung.trim().toLowerCase().includes('thu hồi');
                                    const isCustomerActive = selectedCustomer?.maKh === cust.maKh;

                                    return (
                                      <div
                                        key={cust.maKh}
                                        onClick={() => setSelectedCustomer(cust)}
                                        className={`py-1.5 px-2 rounded-md flex items-center justify-between gap-1.5 cursor-pointer transition-colors ${
                                          isCustomerActive
                                            ? 'bg-amber-200/80 font-bold text-amber-950 shadow-xs'
                                            : 'hover:bg-amber-50 text-slate-700'
                                        }`}
                                      >
                                        <div className="truncate flex-1 min-w-0">
                                          <span className="font-mono font-bold">{cust.maKh}</span>
                                          <span className="mx-1 text-slate-400">-</span>
                                          <span className="truncate">{cust.tenKh}</span>
                                        </div>

                                        {isThuHoi ? (
                                          <span className="text-[9px] px-1 py-0.5 rounded font-bold bg-rose-100 text-rose-800 shrink-0">
                                            Thu hồi
                                          </span>
                                        ) : isDone ? (
                                          <span className="text-[9px] px-1 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 shrink-0 flex items-center gap-0.5">
                                            <Check className="w-2.5 h-2.5" />
                                            Xong
                                          </span>
                                        ) : (
                                          <span className="text-[9px] px-1 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 shrink-0">
                                            Chưa
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CỘT BÊN PHẢI (COL-8): THÔNG TIN FORM NHẬP + TÍNH SẢN LƯỢNG CAO ĐIỂM + DANH SÁCH THAY XONG */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-5">
            
            {/* 1. KHỐI FORM NHẬP THAY CÔNG TƠ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-600" />
                  <h3 className="font-black text-slate-800 text-base uppercase">
                    Chi Tiết Khách Hàng & Xác Nhận Thay Xong
                  </h3>
                </div>
                {selectedCustomer && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedCustomer.kSuDung?.toLowerCase().includes('thu hồi')
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : selectedCustomer.ketQua?.toLowerCase().includes('xong')
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {selectedCustomer.kSuDung?.toLowerCase().includes('thu hồi')
                      ? 'Trạng thái: Thu hồi (Không được thay)'
                      : selectedCustomer.ketQua?.toLowerCase().includes('xong')
                      ? 'Đã thay xong'
                      : 'Chưa thay'}
                  </span>
                )}
              </div>

              {selectedCustomer ? (
                <div className="space-y-4">
                  {/* Warning if Thu hồi */}
                  {selectedCustomer.kSuDung?.toLowerCase().includes('thu hồi') && (
                    <div className="bg-rose-50 border-2 border-rose-400 p-3.5 rounded-xl flex items-start gap-3 text-xs text-rose-950">
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-black text-rose-900 uppercase">
                          Cảnh báo: Khách hàng không sử dụng (Thu hồi)
                        </div>
                        <p className="mt-0.5">
                          Theo quy định tại QĐ 963, đối với các khách hàng có trạng thái &quot;Thu hồi&quot; (không sử dụng), hệ thống không cho phép thực hiện thay công tơ.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Readonly info grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Mã Khách Hàng</span>
                      <div className="font-mono font-bold text-sm text-slate-900 mt-0.5">{selectedCustomer.maKh}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Tên Khách Hàng</span>
                      <div className="font-bold text-slate-900 mt-0.5">{selectedCustomer.tenKh}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Khu Vực & Đợt</span>
                      <div className="font-bold text-slate-900 mt-0.5">KV: {selectedCustomer.kv} | Đợt: {selectedCustomer.dot}</div>
                    </div>
                    <div className="sm:col-span-2 md:col-span-3">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Địa Chỉ</span>
                      <div className="text-slate-800 mt-0.5">{selectedCustomer.diaChi || 'Chưa có thông tin địa chỉ'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Loại Công Tơ</span>
                      <div className="font-medium text-slate-800 mt-0.5">{selectedCustomer.loaiCto || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Số Pha / Công Nghệ</span>
                      <div className="font-medium text-slate-800 mt-0.5">{selectedCustomer.soPha || '—'} / {selectedCustomer.congNghe || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Tỷ Số TU / TI</span>
                      <div className="font-medium text-slate-800 mt-0.5">{selectedCustomer.tySoTu || '—'} / {selectedCustomer.tySoTi || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Đo Xa / NLMT</span>
                      <div className="font-medium text-slate-800 mt-0.5">{selectedCustomer.doXa || '—'} / {selectedCustomer.nlmt || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Phiên</span>
                      <div className="font-medium text-slate-800 mt-0.5">{selectedCustomer.phien || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">KSuDung (Thu hồi)</span>
                      <div className={`font-bold mt-0.5 ${selectedCustomer.kSuDung?.toLowerCase().includes('thu hồi') ? 'text-rose-600' : 'text-slate-700'}`}>
                        {selectedCustomer.kSuDung || 'Bình thường'}
                      </div>
                    </div>
                  </div>

                  {/* Form fields: NV, NgayGio, GioVuot, Xác nhận Xong */}
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-4">
                    <div className="font-black text-xs uppercase text-amber-900 tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Thông Tin Xác Nhận Hoàn Tất</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Nhân viên thực hiện (Cột NV)
                        </label>
                        <input
                          type="text"
                          value={formNv}
                          onChange={e => setFormNv(e.target.value)}
                          placeholder="Họ và tên nhân viên..."
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Ngày giờ thay (dd/mm/yyyy hh:mm)
                        </label>
                        <input
                          type="text"
                          value={formNgayGio}
                          onChange={e => setFormNgayGio(e.target.value)}
                          placeholder="dd/mm/yyyy hh:mm"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Giờ vượt tính toán (9h30 - 11h30)
                        </label>
                        <div className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold flex items-center justify-between text-slate-800">
                          <span>{calculatedGioVuot} giờ</span>
                          <span className={`text-[10px] font-sans px-1.5 py-0.5 rounded font-semibold ${
                            calculatedGioVuot > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {calculatedGioVuot > 0 ? 'Trong khung 9h30-11h30' : '0h (Ngoài khung)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Giờ vượt = Ngày giờ thay - 09:30 (chỉ tính từ 09:30 đến 11:30, ngoài khung này = 0).</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmReplacement}
                        disabled={isSubmitting || Boolean(selectedCustomer.kSuDung?.toLowerCase().includes('thu hồi'))}
                        className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isSubmitting ? 'Đang ghi nhận...' : 'Xác nhận Đã Thay Xong'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Gauge className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-medium">
                    Hãy nhấp vào một khách hàng trên sơ đồ cây bên trái để xem thông tin chi tiết và cập nhật kết quả thay công tơ.
                  </p>
                </div>
              )}
            </div>

            {/* 2. KHỐI TÍNH TOÁN SẢN LƯỢNG CAO ĐIỂM VƯỢT (CHUẨN BỊ THEO YÊU CẦU: CẬP NHẬT SAU) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2">
              <div className="flex items-center gap-2 text-slate-800">
                <Zap className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-xs uppercase tracking-wide">
                  Tính Toán Sản Lượng Cao Điểm Vượt
                </h4>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Chức năng tính toán sản lượng cao điểm vượt theo công thức quy định: <b>Sẽ được cập nhật sau</b>.
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full shrink-0">
                  Chờ cập nhật
                </span>
              </div>
            </div>

            {/* 3. KHỐI DANH SÁCH KHÁCH HÀNG ĐÃ THAY XONG (10 KHÁCH HÀNG TRÊN TRANG, CHO PHÉP KẾT XUẤT EXCEL) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-black text-slate-800 text-sm uppercase flex items-center gap-2">
                    <span>Kết Quả Đã Thay Xong</span>
                    <span className="text-xs font-normal text-slate-500 font-mono">
                      ({completedCustomersList.length} KH {selectedKv ? `- KV ${selectedKv}` : selectedDot ? `- Đợt ${selectedDot}` : ''})
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hiển thị danh sách khách hàng đã thay xong tương ứng với phần tử đang chọn trên cây bên trái (10 KH/trang).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportCompletedExcel}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Xuất Excel</span>
                </button>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                        <th className="py-2.5 px-3 w-12 text-center">STT</th>
                        <th className="py-2.5 px-3">Mã KH</th>
                        <th className="py-2.5 px-3">Tên Khách Hàng</th>
                        <th className="py-2.5 px-3">Khu Vực</th>
                        <th className="py-2.5 px-3">Đợt</th>
                        <th className="py-2.5 px-3">NV Thay</th>
                        <th className="py-2.5 px-3">Ngày Giờ Thay</th>
                        <th className="py-2.5 px-3 text-right">Giờ Vượt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedCompletedList.length > 0 ? (
                        paginatedCompletedList.map((item, idx) => {
                          const stt = (currentCompletedPage - 1) * PAGE_SIZE + idx + 1;
                          return (
                            <tr
                              key={item.maKh}
                              onClick={() => setSelectedCustomer(item)}
                              className="hover:bg-amber-50/60 cursor-pointer transition-colors"
                            >
                              <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{stt}</td>
                              <td className="py-2 px-3 font-mono font-bold text-amber-900">{item.maKh}</td>
                              <td className="py-2 px-3 font-medium text-slate-800">{item.tenKh}</td>
                              <td className="py-2 px-3 font-semibold text-slate-700">{item.kv}</td>
                              <td className="py-2 px-3 font-mono text-slate-600">{item.dot}</td>
                              <td className="py-2 px-3 text-slate-700">{item.nv || '—'}</td>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{item.ngayGio || '—'}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">
                                {item.gioVuot !== undefined ? `${item.gioVuot}h` : '0h'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                            Chưa có khách hàng nào được thay xong trong phạm vi lựa chọn này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalCompletedPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs">
                    <span className="text-slate-500 text-[11px]">
                      Trang <b>{currentCompletedPage}</b> / <b>{totalCompletedPages}</b> ({completedCustomersList.length} khách hàng)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCompletedPage(1)}
                        disabled={currentCompletedPage <= 1}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Trang đầu"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompletedPage(p => Math.max(1, p - 1))}
                        disabled={currentCompletedPage <= 1}
                        className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold"
                      >
                        Trước
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompletedPage(p => Math.min(totalCompletedPages, p + 1))}
                        disabled={currentCompletedPage >= totalCompletedPages}
                        className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold"
                      >
                        Sau
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompletedPage(totalCompletedPages)}
                        disabled={currentCompletedPage >= totalCompletedPages}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Trang cuối"
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: BÁO CÁO KẾT QUẢ THAY CÔNG TƠ THEO QĐ 963 */}
      {/* ========================================================= */}
      {activeSubTab === 'bao_cao' && (
        <div className="space-y-5">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500">Tổng khách hàng</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{reportTotals.tongKh}</div>
              <span className="text-[10px] text-slate-400">Toàn bộ sheet 963</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-rose-600">Thu hồi (KSuDung)</span>
              <div className="text-2xl font-black text-rose-700 mt-1">{reportTotals.thuHoi}</div>
              <span className="text-[10px] text-slate-400">Không được thay</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-amber-600">Cần thay</span>
              <div className="text-2xl font-black text-amber-700 mt-1">{reportTotals.canThay}</div>
              <span className="text-[10px] text-slate-400">Tổng trừ đi Thu hồi</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-emerald-600">Đã thay xong</span>
              <div className="text-2xl font-black text-emerald-700 mt-1 flex items-baseline gap-1.5">
                <span>{reportTotals.daThay}</span>
                <span className="text-xs font-bold text-emerald-600">({reportTotals.tyLeChung}%)</span>
              </div>
              <span className="text-[10px] text-slate-400">Còn lại: {reportTotals.chuaThay} KH</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-indigo-600">Tổng giờ vượt</span>
              <div className="text-2xl font-black text-indigo-700 mt-1">{reportTotals.tongGioVuot}h</div>
              <span className="text-[10px] text-slate-400">Khung 9h30 - 11h30</span>
            </div>
          </div>

          {/* Aggregated Report Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-800 text-base uppercase flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                  <span>Bảng Báo Cáo Thay Công Tơ Theo Đợt & Khu Vực (QĐ 963)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tổng hợp số lượng, tỷ lệ hoàn thành và giờ vượt cho từng đợt và từng khu vực.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportReportExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Xuất Excel Báo Cáo</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3">Đợt Thực Hiện</th>
                      <th className="py-2.5 px-3">Khu Vực</th>
                      <th className="py-2.5 px-3 text-right">Tổng KH</th>
                      <th className="py-2.5 px-3 text-right text-rose-700">Thu Hồi</th>
                      <th className="py-2.5 px-3 text-right text-amber-800">Cần Thay</th>
                      <th className="py-2.5 px-3 text-right text-emerald-700">Đã Thay Xong</th>
                      <th className="py-2.5 px-3 text-center">Tỷ Lệ (%)</th>
                      <th className="py-2.5 px-3 text-right text-slate-600">Còn Lại</th>
                      <th className="py-2.5 px-3 text-right text-indigo-700">Tổng Giờ Vượt (h)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.length > 0 ? (
                      reportData.map((row, idx) => (
                        <tr key={`${row.dot}_${row.kv}`} className="hover:bg-amber-50/50 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">Đợt {row.dot}</td>
                          <td className="py-2.5 px-3 font-bold text-amber-900">{row.kv}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{row.tongKh}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-600">{row.thuHoi}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900">{row.canThay}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{row.daThay}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              row.tyLe === 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : row.tyLe >= 50
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {row.tyLe}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{row.chuaThay}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">{row.tongGioVuot}h</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                          Chưa có dữ liệu báo cáo nào trong sheet 963.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {reportData.length > 0 && (
                    <tfoot>
                      <tr className="bg-amber-100/70 border-t-2 border-amber-300 font-bold text-amber-950 text-xs uppercase">
                        <td colSpan={3} className="py-3 px-3 text-right">
                          TỔNG CỘNG TOÀN CÔNG TY:
                        </td>
                        <td className="py-3 px-3 text-right font-mono">{reportTotals.tongKh}</td>
                        <td className="py-3 px-3 text-right font-mono text-rose-700">{reportTotals.thuHoi}</td>
                        <td className="py-3 px-3 text-right font-mono">{reportTotals.canThay}</td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-800">{reportTotals.daThay}</td>
                        <td className="py-3 px-3 text-center font-mono text-emerald-800">
                          {reportTotals.tyLeChung}%
                        </td>
                        <td className="py-3 px-3 text-right font-mono">{reportTotals.chuaThay}</td>
                        <td className="py-3 px-3 text-right font-mono text-indigo-900">{reportTotals.tongGioVuot}h</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
