import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx-js-style';
import { 
  Gauge, Search, Mic, MicOff, RefreshCw, CheckCircle2, 
  AlertTriangle, Clock, ChevronRight, ChevronDown, ChevronUp,
  FileSpreadsheet, Filter, User, Calendar, MapPin, 
  Layers, Check, Sparkles, AlertCircle, Zap, ChevronLeft,
  ChevronsLeft, ChevronsRight, ChevronsDown, ChevronsUp, ShieldAlert, BarChart3, ListFilter, X,
  Calculator, Info, HelpCircle, ArrowRight, Eye, EyeOff
} from 'lucide-react';
import { 
  DataStore, 
  Entry963, 
  SheetMember, 
  calculateGioVuot, 
  parseHsn,
  resolveHsn,
  calculateSlVuotKhongDoXa,
  calculateSlVuotCoDoXa 
} from '../store/DataStore';

interface SectionCollapseState {
  tree: boolean;
  customerDetail: boolean;
  calculation: boolean;
  completedList: boolean;
  reportKpi: boolean;
  reportTable: boolean;
}

const SECTION_COLLAPSE_STORAGE_KEY = 'tab963_sections_collapse_v1';

interface Tab963Props {
  sessionUser: SheetMember | null;
  refreshToggle?: number;
}

export default function Tab963({ sessionUser, refreshToggle = 0 }: Tab963Props) {
  const [activeSubTab, setActiveSubTab] = useState<'thuc_hien' | 'bao_cao'>('thuc_hien');
  const [entries, setEntries] = useState<Entry963[]>(() => DataStore.get963Entries());
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Section collapse/expand state with localStorage persistence
  const [collapsedSections, setCollapsedSections] = useState<SectionCollapseState>(() => {
    try {
      const saved = localStorage.getItem(SECTION_COLLAPSE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          tree: parsed.tree ?? true,
          customerDetail: parsed.customerDetail ?? true,
          calculation: parsed.calculation ?? true,
          completedList: parsed.completedList ?? true,
          reportKpi: parsed.reportKpi ?? true,
          reportTable: parsed.reportTable ?? true,
        };
      }
    } catch {}
    return {
      tree: true,
      customerDetail: true,
      calculation: true,
      completedList: true,
      reportKpi: true,
      reportTable: true,
    };
  });

  const toggleSection = (section: keyof SectionCollapseState) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [section]: !prev[section] };
      try {
        localStorage.setItem(SECTION_COLLAPSE_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const setAllSections = (expand: boolean) => {
    const next: SectionCollapseState = {
      tree: expand,
      customerDetail: expand,
      calculation: expand,
      completedList: expand,
      reportKpi: expand,
      reportTable: expand,
    };
    setCollapsedSections(next);
    try {
      localStorage.setItem(SECTION_COLLAPSE_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

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

  // Calculation inputs state (QĐ 963)
  const [calcMode, setCalcMode] = useState<'no_doxa' | 'has_doxa'>('no_doxa');
  const [calcBillingDate, setCalcBillingDate] = useState<string>(''); // YYYY-MM-DD
  const [calcDays, setCalcDays] = useState<number>(9);
  const [calcCscdKyTruoc, setCalcCscdKyTruoc] = useState<string>('');
  const [calcCscdThao, setCalcCscdThao] = useState<string>('');
  const [calcCs930, setCalcCs930] = useState<string>('');
  const [calcHsn, setCalcHsn] = useState<number>(1);

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

  // When a customer is selected, initialize form fields & calculation parameters
  useEffect(() => {
    if (selectedCustomer) {
      setFormNv(selectedCustomer.nv || sessionUser?.name || '');
      const defaultDt = selectedCustomer.ngayGio || getCurrentDateTimeStr();
      setFormNgayGio(defaultDt);

      // 1. Tự động xác định có đo xa hay không dựa vào trường DoXa (RF, PLC, Modem, Có, v.v.)
      const dx = (selectedCustomer.doXa || '').trim().toLowerCase();
      const hasDoXa = dx.includes('có') || dx.includes('co') || dx.includes('rf') || dx.includes('plc') || dx.includes('modem') || dx.includes('đo xa');
      setCalcMode(hasDoXa ? 'has_doxa' : 'no_doxa');

      // 2. Hệ số nhân HSN: hiệu chỉnh lấy giá trị (không quy đổi) từ cột "HSN" của sheet 963
      const hsn = resolveHsn(selectedCustomer);
      setCalcHsn(hsn);

      // 3. Nạp chỉ số cao điểm kỳ trước (cột CSCDKyTruoc hoặc SLKyTruoc)
      const kyTruoc = selectedCustomer.cscdKyTruoc || selectedCustomer.slKyTruoc || '';
      setCalcCscdKyTruoc(kyTruoc);

      // 4. Nạp chỉ số cao điểm tháo (nếu đã từng lưu)
      setCalcCscdThao(selectedCustomer.cscdThao || '');

      // 5. Nạp chỉ số 9h30 (nếu có đo xa)
      setCalcCs930(selectedCustomer.cs930 || '');

      // 6. Tính ngày chốt hóa đơn gần nhất (mặc định ngày 01 của tháng thay)
      const dateMatch = defaultDt.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10);
        const year = parseInt(dateMatch[3], 10);
        const bMonthStr = String(month).padStart(2, '0');
        setCalcBillingDate(`${year}-${bMonthStr}-01`);
        setCalcDays(Math.max(1, day - 1));
      } else {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        setCalcBillingDate(`${y}-${m}-01`);
        setCalcDays(Math.max(1, now.getDate() - 1));
      }
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

  // Handle billing date change and recalculate days difference
  const handleBillingDateChange = (newDateStr: string) => {
    setCalcBillingDate(newDateStr);
    if (!newDateStr) return;
    const dateMatch = formNgayGio.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateMatch) {
      const repDate = new Date(parseInt(dateMatch[3], 10), parseInt(dateMatch[2], 10) - 1, parseInt(dateMatch[1], 10));
      const bDate = new Date(newDateStr);
      const diffTime = repDate.getTime() - bDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      setCalcDays(Math.max(1, diffDays));
    }
  };

  // Live calculation of peak excess output (SLVuot) according to QĐ 963
  const calculationResult = useMemo(() => {
    const hsn = Number(calcHsn) || 1;
    const thao = parseFloat(String(calcCscdThao).replace(',', '.')) || 0;
    const gv = calculatedGioVuot;

    if (calcMode === 'has_doxa') {
      const cs930Val = parseFloat(String(calcCs930).replace(',', '.')) || 0;
      const diffCs = Math.max(0, thao - cs930Val);
      const rawSl = diffCs * hsn;
      const slVuot = Math.round(rawSl);
      return {
        mode: 'has_doxa' as const,
        cs930Val,
        thao,
        hsn,
        diffCs,
        rawSl,
        slVuot,
        aTbCd: 0,
        days: 0,
        gioVuot: gv
      };
    } else {
      const kyTruocVal = parseFloat(String(calcCscdKyTruoc).replace(',', '.')) || 0;
      const days = Math.max(1, Number(calcDays) || 1);
      const diffCs = Math.max(0, thao - kyTruocVal);
      // A(trung bình CĐ) = (CSCDThao - CSCDKyTruoc) / (5 * N)
      const aTbCd = diffCs / (5 * days);
      // SLVuot = round(A(trung bình CĐ) * GioVuot * HSN)
      const rawSl = aTbCd * gv * hsn;
      const slVuot = Math.round(rawSl);
      return {
        mode: 'no_doxa' as const,
        kyTruocVal,
        thao,
        hsn,
        days,
        diffCs,
        aTbCd: Math.round(aTbCd * 100) / 100,
        rawATbCd: aTbCd,
        gioVuot: gv,
        rawSl,
        slVuot
      };
    }
  }, [calcMode, calcCscdThao, calcCscdKyTruoc, calcCs930, calcHsn, calcDays, calculatedGioVuot]);

  // Presets based on prompt examples
  const loadPresetExample1 = () => {
    setCalcMode('no_doxa');
    setFormNgayGio('10/06/2026 10:00');
    setCalcBillingDate('2026-06-01');
    setCalcDays(9);
    setCalcCscdKyTruoc('800');
    setCalcCscdThao('1000');
    setCalcHsn(1);
    showToast('info', 'Ví dụ 1: Thay 10h00 (GV = 0.5h), 9 ngày, HSN=1, A(TB)=4.44 -> SL vượt = 2 kWh');
  };

  const loadPresetExample2 = () => {
    setCalcMode('no_doxa');
    setFormNgayGio('10/06/2026 13:00');
    setCalcBillingDate('2026-06-01');
    setCalcDays(9);
    setCalcCscdKyTruoc('800');
    setCalcCscdThao('1000');
    setCalcHsn(1);
    showToast('info', 'Ví dụ 2: Thay 13h00 (GV = 2.0h), 9 ngày, HSN=1, A(TB)=4.44 -> SL vượt = 9 kWh');
  };

  const loadPresetExample3 = () => {
    setCalcMode('has_doxa');
    setFormNgayGio('10/06/2026 10:30');
    setCalcCs930('100');
    setCalcCscdThao('102');
    setCalcHsn(80);
    showToast('info', 'Ví dụ 3 (Có đo xa): CS 9h30 = 100, CS tháo = 102, HSN=80 (400/5) -> SL vượt = 160 kWh');
  };

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

  // Handle confirming meter replacement and saving peak excess indicators into Sheet 963
  const handleConfirmReplacement = async (source: 'confirm' | 'calculation' = 'confirm') => {
    if (!selectedCustomer) {
      alert('Vui lòng chọn khách hàng cần thay công tơ từ sơ đồ cây bên trái!');
      return;
    }

    // Constraint: Customers with KSuDung === 'Thu hồi' CANNOT be replaced
    if (selectedCustomer.kSuDung && selectedCustomer.kSuDung.trim().toLowerCase().includes('thu hồi')) {
      alert('LƯU Ý: Khách hàng không sử dụng (Thu hồi) thì không được thay công tơ và không cập nhật theo quy định QĐ 963!');
      return;
    }

    const nvName = formNv.trim() || sessionUser?.name || 'Nhân viên';
    const dtStr = formNgayGio.trim() || getCurrentDateTimeStr();

    if (!nvName) {
      alert('Vui lòng nhập tên nhân viên thực hiện (cột NV)!');
      return;
    }

    if (!dtStr) {
      alert('Vui lòng nhập ngày giờ thực hiện (dd/mm/yyyy hh:mm)!');
      return;
    }

    // Nếu người dùng bấm từ khối tính toán, nhắc nhở nhập chỉ số nếu trống
    if (source === 'calculation') {
      if (!String(calcCscdThao).trim()) {
        alert('Vui lòng nhập Chỉ số CĐ lúc tháo (cột CSCDThao) trước khi lưu!');
        return;
      }
      if (calcMode === 'has_doxa' && !String(calcCs930).trim()) {
        const proceed = confirm('Chỉ số CĐ lúc 9h30 (cột CS9h30) đang để trống. Bạn có muốn tiếp tục lưu không?');
        if (!proceed) return;
      }
    }

    setIsSubmitting(true);
    showToast('info', `Đang lưu & đồng bộ dữ liệu thay công tơ cho KH ${selectedCustomer.maKh}...`);

    try {
      const gv = calculateGioVuot(dtStr);
      const slVuotStr = String(calculationResult.slVuot);
      const cscdKyTruocClean = calcCscdKyTruoc ? String(calcCscdKyTruoc).trim() : '';
      const cscdThaoClean = calcCscdThao ? String(calcCscdThao).trim() : '';
      const cs930Clean = calcCs930 ? String(calcCs930).trim() : '';

      const res = await DataStore.update963Entry(selectedCustomer.maKh, {
        nv: nvName,
        ngayGio: dtStr,
        ketQua: 'Xong',
        gioVuot: gv,
        hsn: calcHsn,
        cscdKyTruoc: cscdKyTruocClean,
        cscdThao: cscdThaoClean,
        cs930: cs930Clean,
        cs9h30: cs930Clean,
        slVuot: slVuotStr
      });

      if (res.error) {
        showToast('error', res.error);
      } else {
        const metricSummary = [
          `HSN: ${calcHsn}`,
          cscdThaoClean ? `CS Tháo: ${cscdThaoClean}` : null,
          cs930Clean ? `CS 9h30: ${cs930Clean}` : null,
          cscdKyTruocClean ? `CS Kỳ trước: ${cscdKyTruocClean}` : null,
          `SL Vượt: ${slVuotStr} kWh`,
          `Giờ vượt: ${gv}h`
        ].filter(Boolean).join(' | ');

        showToast(
          'success',
          `Đã cập nhật thành công vào Sheet 963 cho KH ${selectedCustomer.maKh} (${metricSummary})`
        );
        if (res.entry) {
          setSelectedCustomer(res.entry);
        }
      }
    } catch (e: any) {
      showToast('error', 'Lỗi khi cập nhật sheet 963: ' + (e?.message || 'Có sự cố xảy ra'));
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
      'Hệ Số Nhân (HSN)': c.hsn !== undefined && c.hsn !== '' ? c.hsn : resolveHsn(c),
      'Công Nghệ': c.congNghe || '',
      'Đo Xa': c.doXa || '',
      'NV Thực Hiện': c.nv || '',
      'Ngày Giờ Thay': c.ngayGio || '',
      'Kết Quả': c.ketQua || 'Xong',
      'Giờ Vượt (h)': c.gioVuot !== undefined ? c.gioVuot : 0,
      'CS CĐ Lúc Tháo': c.cscdThao || '',
      'CS CĐ Lúc 9h30': c.cs930 || c.cs9h30 || '',
      'CS CĐ Kỳ Trước': c.cscdKyTruoc || '',
      'Sản Lượng Vượt (kWh)': c.slVuot !== undefined && c.slVuot !== '' ? c.slVuot : 0
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
    tongSlVuot: number;
  }

  const reportData = useMemo(() => {
    const rows: ReportRow[] = [];
    const dotsMap: Record<string, Record<string, {
      tong: number;
      thuHoi: number;
      daThay: number;
      gioVuot: number;
      slVuot: number;
    }>> = {};

    entries.forEach(e => {
      const dot = e.dot || '1';
      const kv = e.kv || 'Khác';
      const isDone = e.ketQua && e.ketQua.trim().toLowerCase().includes('xong');
      const isThuHoi = e.kSuDung && e.kSuDung.trim().toLowerCase().includes('thu hồi');
      const gv = typeof e.gioVuot === 'number' ? e.gioVuot : (parseFloat(String(e.gioVuot || 0)) || 0);
      const slv = typeof e.slVuot === 'number' ? e.slVuot : (parseFloat(String(e.slVuot || 0)) || 0);

      if (!dotsMap[dot]) dotsMap[dot] = {};
      if (!dotsMap[dot][kv]) {
        dotsMap[dot][kv] = { tong: 0, thuHoi: 0, daThay: 0, gioVuot: 0, slVuot: 0 };
      }

      dotsMap[dot][kv].tong++;
      if (isThuHoi) dotsMap[dot][kv].thuHoi++;
      if (isDone) {
        dotsMap[dot][kv].daThay++;
        dotsMap[dot][kv].gioVuot += gv;
        dotsMap[dot][kv].slVuot += slv;
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
          tongGioVuot: Math.round(item.gioVuot * 100) / 100,
          tongSlVuot: Math.round(item.slVuot)
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
    let tongSlVuot = 0;

    reportData.forEach(r => {
      tongKh += r.tongKh;
      thuHoi += r.thuHoi;
      canThay += r.canThay;
      daThay += r.daThay;
      chuaThay += r.chuaThay;
      tongGioVuot += r.tongGioVuot;
      tongSlVuot += r.tongSlVuot;
    });

    const tyLeChung = canThay > 0 ? Math.round((daThay / canThay) * 1000) / 10 : 0;

    return {
      tongKh,
      thuHoi,
      canThay,
      daThay,
      chuaThay,
      tongGioVuot: Math.round(tongGioVuot * 100) / 100,
      tongSlVuot: Math.round(tongSlVuot),
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
      'Tổng Giờ Vượt (h)': r.tongGioVuot,
      'Tổng Sản Lượng Vượt (kWh)': r.tongSlVuot
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
      'Tổng Giờ Vượt (h)': reportTotals.tongGioVuot,
      'Tổng Sản Lượng Vượt (kWh)': reportTotals.tongSlVuot
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

        {/* Top Navigation Sub-Tabs and Global Expand/Collapse controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
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

          {/* Quick Collapse / Expand All actions */}
          <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-xl backdrop-blur-xs self-start sm:self-auto">
            <span className="text-[11px] text-amber-200 px-2 font-medium hidden md:inline">
              Hiển thị các phần:
            </span>
            <button
              type="button"
              onClick={() => setAllSections(true)}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              title="Bung ra tất cả các phần trong tab"
            >
              <ChevronsDown className="w-3.5 h-3.5" />
              <span>Bung tất cả</span>
            </button>
            <button
              type="button"
              onClick={() => setAllSections(false)}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              title="Thu gọn (co lại) tất cả các phần trong tab"
            >
              <ChevronsUp className="w-3.5 h-3.5" />
              <span>Thu gọn tất cả</span>
            </button>
          </div>
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
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {filteredEntries.length} KH
                </span>
                <button
                  type="button"
                  onClick={() => toggleSection('tree')}
                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title={collapsedSections.tree ? "Thu gọn sơ đồ cây" : "Bung ra sơ đồ cây"}
                >
                  <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                    {collapsedSections.tree ? 'Thu gọn' : 'Bung ra'}
                  </span>
                  {collapsedSections.tree ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Tìm kiếm gần đúng / chính xác và Giọng nói (Cho phép Ẩn/Hiện) */}
            {collapsedSections.tree ? (
              <>
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
          </>
        ) : (
          <div 
            onClick={() => toggleSection('tree')}
            className="p-4 bg-slate-50 hover:bg-amber-50/50 rounded-xl border border-dashed border-slate-200 text-center cursor-pointer transition-colors"
          >
            <Layers className="w-5 h-5 mx-auto text-amber-600 mb-1" />
            <p className="text-xs font-semibold text-slate-700">
              Sơ đồ cây & Tìm kiếm đang thu gọn ({filteredEntries.length} KH)
            </p>
            <span className="text-[11px] text-amber-700 font-bold hover:underline mt-1 inline-block">
              Nhấp vào đây để bung ra ▾
            </span>
          </div>
        )}
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
                <div className="flex items-center gap-2">
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
                  <button
                    type="button"
                    onClick={() => toggleSection('customerDetail')}
                    className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    title={collapsedSections.customerDetail ? "Thu gọn phần chi tiết khách hàng" : "Bung ra phần chi tiết khách hàng"}
                  >
                    <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                      {collapsedSections.customerDetail ? 'Thu gọn' : 'Bung ra'}
                    </span>
                    {collapsedSections.customerDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {collapsedSections.customerDetail ? (
                selectedCustomer ? (
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
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Hệ Số Nhân (Cột HSN)</span>
                      <div className="font-mono font-black text-amber-900 mt-0.5">
                        {selectedCustomer.hsn !== undefined && selectedCustomer.hsn !== ''
                          ? selectedCustomer.hsn
                          : `${resolveHsn(selectedCustomer)}`}
                      </div>
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

                    {/* Dữ liệu đã lưu trên sheet 963 nếu khách hàng đã thực hiện hoặc đã nhập chỉ số */}
                    {(selectedCustomer.ketQua?.toLowerCase().includes('xong') || selectedCustomer.cscdThao || selectedCustomer.slVuot) && (
                      <div className="sm:col-span-2 md:col-span-3 bg-amber-50/80 border border-amber-300 p-3 rounded-xl mt-1">
                        <div className="flex items-center justify-between border-b border-amber-200 pb-1.5 mb-2">
                          <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Dữ liệu đã ghi nhận trên Sheet 963:</span>
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-300">
                            KetQua: {selectedCustomer.ketQua || 'Xong'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-500 block text-[10px]">CS CĐ Tháo (CSCDThao):</span>
                            <span className="font-mono font-bold text-slate-900">{selectedCustomer.cscdThao || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">CS CĐ 9h30 (CS9h30):</span>
                            <span className="font-mono font-bold text-indigo-900">{selectedCustomer.cs930 || selectedCustomer.cs9h30 || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">CS CĐ Kỳ Trước:</span>
                            <span className="font-mono font-bold text-slate-900">{selectedCustomer.cscdKyTruoc || '—'}</span>
                          </div>
                          <div>
                            <span className="text-amber-900 font-bold block text-[10px]">SL Vượt (SLVuot):</span>
                            <span className="font-mono font-black text-amber-900 bg-amber-200/70 px-1.5 py-0.5 rounded">
                              {selectedCustomer.slVuot !== undefined && selectedCustomer.slVuot !== '' ? `${selectedCustomer.slVuot} kWh` : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Giờ Vượt (GioVuot):</span>
                            <span className="font-mono font-bold text-slate-800">{selectedCustomer.gioVuot !== undefined ? `${selectedCustomer.gioVuot} giờ` : '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">NV Thực Hiện:</span>
                            <span className="font-medium text-slate-800">{selectedCustomer.nv || '—'}</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-slate-500 block text-[10px]">Ngày Giờ Thay:</span>
                            <span className="font-mono text-slate-800">{selectedCustomer.ngayGio || '—'}</span>
                          </div>
                        </div>
                      </div>
                    )}
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

                    {/* Preview các chỉ số sẽ ghi nhận vào Sheet 963 */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-amber-200 text-slate-700">
                      <span className="font-bold text-amber-950">Chỉ số sẽ cập nhật vào Sheet:</span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md font-mono text-[10px]">
                        CSCDThao: <b className="text-slate-900">{calcCscdThao || 'Chưa nhập'}</b>
                      </span>
                      {calcCs930 ? (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-900 rounded-md font-mono text-[10px]">
                          CS9h30: <b>{calcCs930}</b>
                        </span>
                      ) : null}
                      {calcCscdKyTruoc ? (
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md font-mono text-[10px]">
                          CSCDKyTruoc: <b className="text-slate-900">{calcCscdKyTruoc}</b>
                        </span>
                      ) : null}
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-950 font-bold rounded-md font-mono text-[10px] border border-amber-300">
                        SLVuot: <b>{calculationResult.slVuot} kWh</b>
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Giờ vượt = Ngày giờ thay - 09:30 (chỉ tính từ 09:30 đến 11:30, ngoài khung này = 0).</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleConfirmReplacement('confirm')}
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
              )
            ) : (
              <div
                onClick={() => toggleSection('customerDetail')}
                className="p-3.5 bg-slate-50 hover:bg-amber-50/50 rounded-xl border border-dashed border-slate-200 flex items-center justify-between cursor-pointer transition-colors text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-semibold text-slate-700 truncate">
                    {selectedCustomer ? (
                      <>Đang chọn: <b className="text-amber-900 font-mono">{selectedCustomer.maKh}</b> - {selectedCustomer.tenKh} ({selectedCustomer.kv})</>
                    ) : (
                      'Phần chi tiết khách hàng đang thu gọn'
                    )}
                  </span>
                </div>
                <span className="text-[11px] text-amber-700 font-bold hover:underline shrink-0 ml-2">
                  Bung ra ▾
                </span>
              </div>
            )}
            </div>

            {/* 2. KHỐI TÍNH TOÁN SẢN LƯỢNG CAO ĐIỂM VƯỢT (QUY ĐỊNH QĐ 963) */}
            <div className="bg-white rounded-2xl border border-amber-200/90 shadow-sm p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                    <Calculator className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                      <span>Tính Toán Sản Lượng Cao Điểm Vượt</span>
                      <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                        QĐ 963
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tự động tính sản lượng cao điểm vượt theo trường hợp đo xa hoặc không đo xa và cập nhật vào cột <b>SLVuot</b>.
                    </p>
                  </div>
                </div>

                {/* Chuyển đổi qua lại giữa 2 trường hợp: Không đo xa vs Có đo xa */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Chuyển đổi qua lại giữa 2 trường hợp: Không đo xa vs Có đo xa */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setCalcMode('no_doxa')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        calcMode === 'no_doxa'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      1. Không có đo xa
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcMode('has_doxa')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        calcMode === 'has_doxa'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      2. Có đo xa
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSection('calculation')}
                    className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    title={collapsedSections.calculation ? "Thu gọn phần tính toán sản lượng vượt" : "Bung ra phần tính toán sản lượng vượt"}
                  >
                    <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                      {collapsedSections.calculation ? 'Thu gọn' : 'Bung ra'}
                    </span>
                    {collapsedSections.calculation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {collapsedSections.calculation ? (
                <>
                  {/* Quick Preset Buttons for 1-click testing user's exact examples */}
                  <div className="bg-amber-50/60 border border-amber-200/70 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Nạp nhanh ví dụ kiểm tra:</span>
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={loadPresetExample1}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    Ví dụ 1 (10h00, 9 ngày, HSN=1 → 2 kWh)
                  </button>
                  <button
                    type="button"
                    onClick={loadPresetExample2}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    Ví dụ 2 (13h00, 9 ngày, HSN=1 → 9 kWh)
                  </button>
                  <button
                    type="button"
                    onClick={loadPresetExample3}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    Ví dụ 3 (Đo xa, HSN=80, 400/5 → 160 kWh)
                  </button>
                </div>
              </div>

              {/* INPUT FIELDS ACCORDING TO SELECTED CASE */}
              {calcMode === 'no_doxa' ? (
                /* ======================================================== */
                /* TRƯỜNG HỢP 1: KHÔNG CÓ ĐO XA                            */
                /* ======================================================== */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Ngày chốt hóa đơn gần nhất */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Ngày chốt hóa đơn gần nhất
                      </label>
                      <input
                        type="date"
                        value={calcBillingDate}
                        onChange={e => handleBillingDateChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Mặc định ngày 01 của tháng thay
                      </span>
                    </div>

                    {/* Số ngày tính từ ngày chốt (N ngày) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Số ngày tính (N ngày, không tính ngày thay)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={calcDays}
                        onChange={e => setCalcDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Số ngày..."
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Ví dụ: 01/06 đến 10/06 là 9 ngày
                      </span>
                    </div>

                    {/* Chỉ số cao điểm kỳ trước (CSCDKyTruoc) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Chỉ số CĐ kỳ trước (Cột CSCDKyTruoc)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={calcCscdKyTruoc}
                        onChange={e => setCalcCscdKyTruoc(e.target.value)}
                        placeholder="Ví dụ: 800"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Lấy từ sheet hoặc nhập chỉ số chốt kỳ trước
                      </span>
                    </div>

                    {/* Chỉ số cao điểm khi tháo (CSCDThao) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Chỉ số CĐ lúc tháo (Cột CSCDThao)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={calcCscdThao}
                        onChange={e => setCalcCscdThao(e.target.value)}
                        placeholder="Ví dụ: 1000"
                        className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300 rounded-xl text-xs text-amber-950 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-[10px] text-amber-700 mt-0.5 block">
                        Nhập chỉ số cao điểm thực tế khi tháo
                      </span>
                    </div>

                    {/* Thời gian cao điểm vượt (GioVuot) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Thời gian cao điểm vượt (Cột GioVuot)
                      </label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-mono font-black text-slate-900 flex items-center justify-between">
                        <span>{calculatedGioVuot} giờ</span>
                        <span className="text-[10px] font-sans font-medium text-slate-500">
                          {calculatedGioVuot === 2
                            ? 'Trọn 2h (thay sau 11h30)'
                            : calculatedGioVuot > 0
                            ? 'Khung 9h30 - 11h30'
                            : '0h (Ngoài khung)'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Tự động tính từ ngày giờ thay ở form trên
                      </span>
                    </div>

                    {/* Hệ số nhân (HSN) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Hệ số nhân (Cột HSN)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          value={calcHsn}
                          onChange={e => setCalcHsn(parseFloat(e.target.value) || 1)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-xs font-mono font-bold text-amber-900 px-2 py-1 bg-amber-50 rounded-lg shrink-0 border border-amber-200">
                          HSN: {selectedCustomer?.hsn !== undefined && selectedCustomer?.hsn !== '' ? selectedCustomer.hsn : calcHsn}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Lấy trực tiếp giá trị từ cột &quot;HSN&quot; (không quy đổi). Có thể hiệu chỉnh nếu cần.
                      </span>
                    </div>
                  </div>

                  {/* FORMULA BREAKDOWN DISPLAY */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-600" />
                      <span>Các bước tính toán chi tiết:</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Bước 1: Sản lượng bình quân giờ cao điểm */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <div className="text-slate-500 text-[11px] font-semibold">1. A(trung bình CĐ) [kWh]:</div>
                        <div className="font-mono mt-1 text-slate-800">
                          (CSCDThao - CSCDKyTruoc) / (5 × N ngày)
                        </div>
                        <div className="mt-1 font-mono text-slate-900 font-bold">
                          = ({calculationResult.thao} - {calculationResult.kyTruocVal}) / (5 × {calculationResult.days})
                          = <span className="text-amber-800">{calculationResult.aTbCd} kWh</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          * 5 là 5 giờ cao điểm EVN/ngày (sáng 2h từ 9h30-11h30 + tối 3h từ 17h-20h)
                        </span>
                      </div>

                      {/* Bước 2: Thời gian cao điểm vượt */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <div className="text-slate-500 text-[11px] font-semibold">2. Thời gian cao điểm vượt (GioVuot):</div>
                        <div className="font-mono mt-1 text-slate-800">
                          Ngày giờ thay ({formNgayGio || 'Chưa nhập'})
                        </div>
                        <div className="mt-1 font-mono text-slate-900 font-bold">
                          = <span className="text-indigo-800">{calculatedGioVuot} giờ</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          * Ví dụ thay lúc 10h00: 10h00 - 9h30 = 0.5 giờ; thay lúc 13h00: vượt trọn 2 giờ (9h30 - 11h30).
                        </span>
                      </div>
                    </div>

                    {/* Bước 3: Sản lượng vượt bù trừ */}
                    <div className="bg-amber-100/70 border border-amber-300 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-amber-900 font-bold text-xs uppercase tracking-wide">
                          3. Sản lượng vượt (Cột SLVuot) = A(trung bình CĐ) × GioVuot × HSN
                        </div>
                        <div className="font-mono text-xs text-amber-950 mt-1">
                          = {calculationResult.aTbCd} × {calculatedGioVuot} × {calculationResult.hsn}
                          {calculationResult.rawSl !== calculationResult.slVuot && (
                            <span className="text-slate-600 font-normal"> (nguyên gốc: {Math.round(calculationResult.rawSl * 100) / 100} kWh)</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 bg-white px-4 py-2 rounded-xl border border-amber-300 shadow-xs">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Làm tròn thành:</span>
                        <span className="font-mono font-black text-xl text-amber-900">
                          {calculationResult.slVuot} <span className="text-sm font-bold">kWh</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ======================================================== */
                /* TRƯỜNG HỢP 2: CÓ ĐO XA                                  */
                /* ======================================================== */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Chỉ số cao điểm lúc 9h30 (CS930) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Chỉ số CĐ lúc 09h30 (Cột CS930)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={calcCs930}
                        onChange={e => setCalcCs930(e.target.value)}
                        placeholder="Ví dụ: 100"
                        className="w-full px-3 py-2 bg-indigo-50/50 border border-indigo-300 rounded-xl text-xs text-indigo-950 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Nhập chỉ số cao điểm ghi nhận lúc 9 giờ 30 qua đo xa
                      </span>
                    </div>

                    {/* Chỉ số cao điểm lúc tháo (CSCDThao) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Chỉ số CĐ lúc tháo (Cột CSCDThao)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={calcCscdThao}
                        onChange={e => setCalcCscdThao(e.target.value)}
                        placeholder="Ví dụ: 102"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Nhập chỉ số cao điểm thực tế khi tháo công tơ
                      </span>
                    </div>

                    {/* Hệ số nhân HSN */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Hệ số nhân (Cột HSN)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          value={calcHsn}
                          onChange={e => setCalcHsn(parseFloat(e.target.value) || 1)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-xs font-mono font-bold text-amber-900 px-2 py-1 bg-amber-50 rounded-lg shrink-0 border border-amber-200">
                          HSN: {selectedCustomer?.hsn !== undefined && selectedCustomer?.hsn !== '' ? selectedCustomer.hsn : calcHsn}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Lấy trực tiếp giá trị từ cột &quot;HSN&quot; (không quy đổi). Có thể hiệu chỉnh nếu cần.
                      </span>
                    </div>
                  </div>

                  {/* FORMULA DISPLAY CÓ ĐO XA */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-indigo-900 font-bold text-xs uppercase tracking-wide flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-indigo-600" />
                        <span>Công thức: Sản lượng vượt (SLVuot) = (CSCDThao - CS930) × HSN</span>
                      </div>
                      <div className="font-mono text-xs text-indigo-950 mt-1">
                        = ({calculationResult.thao} - {calculationResult.cs930Val}) × {calculationResult.hsn}
                        = <span className="font-bold">{calculationResult.diffCs} × {calculationResult.hsn}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 bg-white px-4 py-2 rounded-xl border border-indigo-300 shadow-xs">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Sản lượng vượt:</span>
                      <span className="font-mono font-black text-xl text-indigo-900">
                        {calculationResult.slVuot} <span className="text-sm font-bold">kWh</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION BAR: LƯU & CẬP NHẬT KẾT QUẢ TÍNH TOÁN VÀO SHEET 963 */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-orange-500/10 border-2 border-amber-300 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1">
                  <div className="font-black text-amber-950 text-xs uppercase flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Lưu & Cập Nhật Vào Sheet 963:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-amber-950 font-mono">
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">
                      Mã KH: <b>{selectedCustomer?.maKh || '—'}</b>
                    </span>
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">
                      CSCDThao: <b>{calcCscdThao || '0'}</b>
                    </span>
                    {calcCs930 ? (
                      <span className="bg-indigo-50 text-indigo-900 px-2 py-0.5 rounded border border-indigo-200">
                        CS9h30: <b>{calcCs930}</b>
                      </span>
                    ) : null}
                    {calcCscdKyTruoc ? (
                      <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">
                        CSCDKyTruoc: <b>{calcCscdKyTruoc}</b>
                      </span>
                    ) : null}
                    <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded border border-amber-300 font-bold">
                      SLVuot: <b>{calculationResult.slVuot} kWh</b>
                    </span>
                    <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">
                      GioVuot: <b>{calculatedGioVuot}h</b>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleConfirmReplacement('calculation')}
                  disabled={isSubmitting || Boolean(selectedCustomer?.kSuDung?.toLowerCase().includes('thu hồi')) || !selectedCustomer}
                  className="w-full sm:w-auto px-5 py-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Đang lưu vào Sheet...' : 'Lưu & Cập Nhật Vào Sheet 963'}</span>
                </button>
              </div>
            </>
          ) : (
            <div
              onClick={() => toggleSection('calculation')}
              className="p-3.5 bg-slate-50 hover:bg-amber-50/50 rounded-xl border border-dashed border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition-colors text-xs"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-semibold text-slate-700">
                  Tính toán sản lượng vượt ({calcMode === 'has_doxa' ? 'Có đo xa' : 'Không có đo xa'}):
                </span>
                <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded font-mono font-bold border border-amber-300 text-[11px]">
                  SL Vượt: {calculationResult.slVuot} kWh
                </span>
                <span className="text-slate-500 text-[11px]">
                  (Giờ vượt: {calculatedGioVuot}h | CS Tháo: {calcCscdThao || '0'} | HSN: {calcHsn})
                </span>
              </div>
              <span className="text-[11px] text-amber-700 font-bold hover:underline shrink-0">
                Bung ra ▾
              </span>
            </div>
          )}
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
                    Hiển thị danh sách khách hàng đã thay xong kèm các chỉ số và sản lượng vượt (10 KH/trang).
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportCompletedExcel}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Xuất Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSection('completedList')}
                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    title={collapsedSections.completedList ? "Thu gọn danh sách đã thay xong" : "Bung ra danh sách đã thay xong"}
                  >
                    <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                      {collapsedSections.completedList ? 'Thu gọn' : 'Bung ra'}
                    </span>
                    {collapsedSections.completedList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {collapsedSections.completedList ? (
                /* Table */
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                        <th className="py-2.5 px-3 w-10 text-center">STT</th>
                        <th className="py-2.5 px-3">Mã KH</th>
                        <th className="py-2.5 px-3">Tên Khách Hàng</th>
                        <th className="py-2.5 px-3">Khu Vực</th>
                        <th className="py-2.5 px-3">Đợt</th>
                        <th className="py-2.5 px-3 text-center">HSN</th>
                        <th className="py-2.5 px-3">NV Thay</th>
                        <th className="py-2.5 px-3">Ngày Giờ</th>
                        <th className="py-2.5 px-3 text-right">Giờ Vượt</th>
                        <th className="py-2.5 px-3 text-right">CS Tháo</th>
                        <th className="py-2.5 px-3 text-right">CS 9h30</th>
                        <th className="py-2.5 px-3 text-right">CS Kỳ Trước</th>
                        <th className="py-2.5 px-3 text-right text-amber-900">SL Vượt (kWh)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedCompletedList.length > 0 ? (
                        paginatedCompletedList.map((item, idx) => {
                          const stt = (currentCompletedPage - 1) * PAGE_SIZE + idx + 1;
                          const slv = item.slVuot !== undefined && item.slVuot !== '' ? item.slVuot : '0';
                          const hsnVal = item.hsn !== undefined && item.hsn !== '' ? item.hsn : resolveHsn(item);
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
                              <td className="py-2 px-3 text-center font-mono font-bold text-amber-900">{hsnVal}</td>
                              <td className="py-2 px-3 text-slate-700">{item.nv || '—'}</td>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{item.ngayGio || '—'}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-indigo-800">
                                {item.gioVuot !== undefined ? `${item.gioVuot}h` : '0h'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-700">
                                {item.cscdThao || '—'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-indigo-700 font-semibold">
                                {item.cs930 || item.cs9h30 || '—'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-700">
                                {item.cscdKyTruoc || '—'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-black text-amber-900">
                                <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                                  {slv} kWh
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={13} className="py-8 text-center text-slate-400 text-xs">
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
            ) : (
              <div
                onClick={() => toggleSection('completedList')}
                className="p-3.5 bg-slate-50 hover:bg-amber-50/50 rounded-xl border border-dashed border-slate-200 flex items-center justify-between cursor-pointer transition-colors text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-700 truncate">
                    Danh sách khách hàng đã thay xong đang thu gọn ({completedCustomersList.length} khách hàng)
                  </span>
                </div>
                <span className="text-[11px] text-amber-700 font-bold hover:underline shrink-0 ml-2">
                  Bung ra ▾
                </span>
              </div>
            )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: BÁO CÁO KẾT QUẢ THAY CÔNG TƠ THEO QĐ 963 */}
      {/* ========================================================= */}
      {activeSubTab === 'bao_cao' && (
        <div className="space-y-5">
          {/* Top KPI Cards (Có thể Ẩn/Hiện) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                  Thống Kê Tiến Độ Tổng Quan (KPIs)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('reportKpi')}
                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title={collapsedSections.reportKpi ? "Thu gọn thống kê tổng quan" : "Bung ra thống kê tổng quan"}
              >
                <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                  {collapsedSections.reportKpi ? 'Thu gọn' : 'Bung ra'}
                </span>
                {collapsedSections.reportKpi ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {collapsedSections.reportKpi ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Tổng khách hàng</span>
                  <div className="text-xl font-black text-slate-900 mt-1">{reportTotals.tongKh}</div>
                  <span className="text-[10px] text-slate-400">Toàn bộ sheet 963</span>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-rose-600">Thu hồi (KSuDung)</span>
                  <div className="text-xl font-black text-rose-700 mt-1">{reportTotals.thuHoi}</div>
                  <span className="text-[10px] text-slate-400">Không được thay</span>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-amber-600">Cần thay</span>
                  <div className="text-xl font-black text-amber-700 mt-1">{reportTotals.canThay}</div>
                  <span className="text-[10px] text-slate-400">Tổng trừ đi Thu hồi</span>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-600">Đã thay xong</span>
                  <div className="text-xl font-black text-emerald-700 mt-1 flex items-baseline gap-1.5">
                    <span>{reportTotals.daThay}</span>
                    <span className="text-xs font-bold text-emerald-600">({reportTotals.tyLeChung}%)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Còn lại: {reportTotals.chuaThay} KH</span>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-indigo-600">Tổng giờ vượt</span>
                  <div className="text-xl font-black text-indigo-700 mt-1">{reportTotals.tongGioVuot}h</div>
                  <span className="text-[10px] text-slate-400">Khung 9h30 - 11h30</span>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-amber-700">Tổng SL Vượt</span>
                  <div className="text-xl font-black text-amber-900 mt-1">{reportTotals.tongSlVuot} <span className="text-xs">kWh</span></div>
                  <span className="text-[10px] text-slate-400">Sản lượng bù trừ</span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => toggleSection('reportKpi')}
                className="p-3 bg-slate-50 hover:bg-amber-50/50 rounded-xl border border-dashed border-slate-200 flex items-center justify-between cursor-pointer transition-colors text-xs"
              >
                <span className="text-slate-600 font-medium">
                  Đã thay: <b className="text-emerald-700">{reportTotals.daThay}</b>/{reportTotals.canThay} ({reportTotals.tyLeChung}%) | Tổng SL Vượt: <b className="text-amber-900">{reportTotals.tongSlVuot} kWh</b> | Tổng Giờ Vượt: <b className="text-indigo-800">{reportTotals.tongGioVuot}h</b>
                </span>
                <span className="text-[11px] text-amber-700 font-bold hover:underline shrink-0 ml-2">
                  Bung ra ▾
                </span>
              </div>
            )}
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
                  Tổng hợp số lượng, tỷ lệ hoàn thành, tổng giờ vượt và sản lượng vượt cho từng đợt và từng khu vực.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportReportExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Xuất Excel Báo Cáo</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleSection('reportTable')}
                  className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  title={collapsedSections.reportTable ? "Thu gọn bảng báo cáo" : "Bung ra bảng báo cáo"}
                >
                  <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                    {collapsedSections.reportTable ? 'Thu gọn' : 'Bung ra'}
                  </span>
                  {collapsedSections.reportTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {collapsedSections.reportTable ? (
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
                      <th className="py-2.5 px-3 text-right text-amber-900">Tổng SL Vượt (kWh)</th>
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
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900">
                            {row.tongSlVuot} kWh
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
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
                        <td className="py-3 px-3 text-right font-mono text-amber-950 font-black">{reportTotals.tongSlVuot} kWh</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ) : (
            <div
              onClick={() => toggleSection('reportTable')}
              className="p-3.5 bg-slate-50 hover:bg-amber-50/50 rounded-xl border border-dashed border-slate-200 flex items-center justify-between cursor-pointer transition-colors text-xs"
            >
              <div className="flex items-center gap-2 truncate">
                <BarChart3 className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-semibold text-slate-700 truncate">
                  Bảng báo cáo chi tiết theo {reportData.length} đợt & khu vực đang thu gọn
                </span>
              </div>
              <span className="text-[11px] text-amber-700 font-bold hover:underline shrink-0 ml-2">
                Bung ra ▾
              </span>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
