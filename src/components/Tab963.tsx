import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx-js-style';
import { 
  Gauge, Search, Mic, MicOff, RefreshCw, CheckCircle2, 
  AlertTriangle, Clock, ChevronRight, ChevronDown, ChevronUp,
  FileSpreadsheet, Filter, User, Calendar, MapPin, 
  Layers, Check, Sparkles, AlertCircle, Zap, ChevronLeft,
  ChevronsLeft, ChevronsRight, ChevronsDown, ChevronsUp, ShieldAlert, BarChart3, ListFilter, X,
  Calculator, Info, HelpCircle, ArrowRight, Eye, EyeOff, Code2, Copy,
  Sun, ClipboardCheck, CheckCheck
} from 'lucide-react';
import { SCRIPT_TEMPLATE } from './ConfigModal';
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
  reportNlmt: boolean;
  reportRaSoat: boolean;
}

const SECTION_COLLAPSE_STORAGE_KEY = 'tab963_sections_collapse_v2';

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
          reportNlmt: parsed.reportNlmt ?? true,
          reportRaSoat: parsed.reportRaSoat ?? true,
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
      reportNlmt: true,
      reportRaSoat: true,
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
      reportNlmt: expand,
      reportRaSoat: expand,
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

  // Review / Rà soát khách hàng thu hồi state (KQRaSoat)
  const [reviewChoice, setReviewChoice] = useState<'Thu hồi' | 'Sử dụng lại' | 'Khác'>('Thu hồi');
  const [reviewExplanation, setReviewExplanation] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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

  // Sub-reports in Tab 2 state
  const [nlmtFilter, setNlmtFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [nlmtPage, setNlmtPage] = useState(1);
  const [nlmtSearch, setNlmtSearch] = useState('');
  const [showNlmtDetails, setShowNlmtDetails] = useState(false);

  const [raSoatFilter, setRaSoatFilter] = useState<'all' | 'chua' | 'su_dung_lai' | 'thu_hoi' | 'khac'>('all');
  const [raSoatPage, setRaSoatPage] = useState(1);
  const [raSoatSearch, setRaSoatSearch] = useState('');
  const [showRaSoatDetails, setShowRaSoatDetails] = useState(false);

  // Script modal state
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

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

      // 7. Khởi tạo trạng thái rà soát (KQRaSoat)
      if (selectedCustomer.kqRaSoat) {
        if (selectedCustomer.kqRaSoat.startsWith('Khác')) {
          setReviewChoice('Khác');
          setReviewExplanation(selectedCustomer.kqRaSoat.replace(/^Khác:\s*/, ''));
        } else if (selectedCustomer.kqRaSoat.includes('Sử dụng lại')) {
          setReviewChoice('Sử dụng lại');
          setReviewExplanation('');
        } else {
          setReviewChoice('Thu hồi');
          setReviewExplanation('');
        }
      } else {
        setReviewChoice(selectedCustomer.kSuDung?.toLowerCase().includes('thu hồi') ? 'Thu hồi' : 'Sử dụng lại');
        setReviewExplanation('');
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

  // Cập nhật kết quả rà soát khách hàng thu hồi (cột KQRaSoat & KSuDung)
  const handleSaveReviewResult = async () => {
    if (!selectedCustomer) return;
    if (reviewChoice === 'Khác' && !reviewExplanation.trim()) {
      showToast('error', 'Vui lòng nhập nội dung diễn giải cho trường hợp "Khác"');
      return;
    }

    const finalVal = reviewChoice === 'Khác'
      ? `Khác: ${reviewExplanation.trim()}`
      : reviewChoice;

    setIsSubmittingReview(true);
    showToast('info', `Đang cập nhật kết quả rà soát cho KH ${selectedCustomer.maKh}...`);

    try {
      const res = await DataStore.update963ReviewResult(selectedCustomer.maKh, finalVal);
      if (res.entry) {
        setSelectedCustomer(res.entry);
      }
      if (res.success) {
        if (reviewChoice === 'Sử dụng lại') {
          showToast('success', `Đã lưu thành công! Cột KSudung đã xóa rỗng và KQRasoat đã ghi nhận "Sử dụng lại" trên Sheet 963. Khách hàng ${selectedCustomer.maKh} hiện đã ĐƯỢC PHÉP THAY.`);
        } else {
          showToast('success', `Đã lưu thành công kết quả rà soát "${finalVal}" vào cột KQRasoat trên Sheet 963!`);
        }
      } else {
        showToast('error', res.error || 'Đã lưu trên app nhưng Google Sheets chưa cập nhật được. Hãy kiểm tra URL hoặc cập nhật mã Apps Script mới!');
      }
    } catch (e: any) {
      showToast('error', 'Lỗi khi lưu kết quả rà soát: ' + (e?.message || 'Có sự cố xảy ra'));
    } finally {
      setIsSubmittingReview(false);
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
      'Kết Quả Rà Soát (KQRaSoat)': c.kqRaSoat || '',
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
  // Bổ sung: Báo cáo Khách hàng NLMT (giá trị "x") & Kết quả rà soát khách hàng thu hồi (KQRaSoat)
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
    // Bổ sung NLMT
    nlmtTong: number;
    nlmtDaThay: number;
    nlmtChuaThay: number;
    nlmtTyLe: number;
    // Bổ sung Rà soát Thu hồi
    thuHoiScopeTong: number;
    rsThuHoi: number;
    rsSuDungLai: number;
    rsKhac: number;
    rsChuaRaSoat: number;
    rsDaRaSoat: number;
    rsTyLe: number;
  }

  const reportData = useMemo(() => {
    const rows: ReportRow[] = [];
    const dotsMap: Record<string, Record<string, {
      tong: number;
      thuHoi: number;
      daThay: number;
      gioVuot: number;
      slVuot: number;
      nlmtTong: number;
      nlmtDaThay: number;
      thuHoiScopeTong: number;
      rsThuHoi: number;
      rsSuDungLai: number;
      rsKhac: number;
      rsChuaRaSoat: number;
    }>> = {};

    entries.forEach(e => {
      const dot = e.dot || '1';
      const kv = e.kv || 'Khác';
      const isDone = Boolean(e.ketQua && e.ketQua.trim().toLowerCase().includes('xong'));
      const isThuHoi = Boolean(e.kSuDung && e.kSuDung.trim().toLowerCase().includes('thu hồi'));
      const isNlmt = Boolean(e.nlmt && (e.nlmt.trim().toLowerCase() === 'x' || e.nlmt.trim().toLowerCase().includes('x')));
      const gv = typeof e.gioVuot === 'number' ? e.gioVuot : (parseFloat(String(e.gioVuot || 0)) || 0);
      const slv = typeof e.slVuot === 'number' ? e.slVuot : (parseFloat(String(e.slVuot || 0)) || 0);

      // Phạm vi rà soát thu hồi: bất kỳ KH nào có kSuDung === 'Thu hồi' HOẶC có giá trị KQRaSoat
      const hasKq = Boolean(e.kqRaSoat && e.kqRaSoat.trim());
      const isThuHoiScope = isThuHoi || hasKq;

      if (!dotsMap[dot]) dotsMap[dot] = {};
      if (!dotsMap[dot][kv]) {
        dotsMap[dot][kv] = {
          tong: 0,
          thuHoi: 0,
          daThay: 0,
          gioVuot: 0,
          slVuot: 0,
          nlmtTong: 0,
          nlmtDaThay: 0,
          thuHoiScopeTong: 0,
          rsThuHoi: 0,
          rsSuDungLai: 0,
          rsKhac: 0,
          rsChuaRaSoat: 0
        };
      }

      const item = dotsMap[dot][kv];
      item.tong++;
      if (isThuHoi) item.thuHoi++;
      if (isDone) {
        item.daThay++;
        item.gioVuot += gv;
        item.slVuot += slv;
      }

      if (isNlmt) {
        item.nlmtTong++;
        if (isDone) item.nlmtDaThay++;
      }

      if (isThuHoiScope) {
        item.thuHoiScopeTong++;
        if (hasKq) {
          const kqNorm = e.kqRaSoat!.trim().toLowerCase();
          if (kqNorm.includes('sử dụng lại')) {
            item.rsSuDungLai++;
          } else if (kqNorm === 'thu hồi' || kqNorm.includes('thu hồi')) {
            item.rsThuHoi++;
          } else {
            item.rsKhac++;
          }
        } else {
          item.rsChuaRaSoat++;
        }
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

        const nlmtChuaThay = Math.max(0, item.nlmtTong - item.nlmtDaThay);
        const nlmtTyLe = item.nlmtTong > 0 ? Math.round((item.nlmtDaThay / item.nlmtTong) * 1000) / 10 : 0;

        const rsDaRaSoat = item.rsThuHoi + item.rsSuDungLai + item.rsKhac;
        const rsTyLe = item.thuHoiScopeTong > 0 ? Math.round((rsDaRaSoat / item.thuHoiScopeTong) * 1000) / 10 : 0;

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
          tongSlVuot: Math.round(item.slVuot),
          nlmtTong: item.nlmtTong,
          nlmtDaThay: item.nlmtDaThay,
          nlmtChuaThay,
          nlmtTyLe,
          thuHoiScopeTong: item.thuHoiScopeTong,
          rsThuHoi: item.rsThuHoi,
          rsSuDungLai: item.rsSuDungLai,
          rsKhac: item.rsKhac,
          rsChuaRaSoat: item.rsChuaRaSoat,
          rsDaRaSoat,
          rsTyLe
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

    let nlmtTong = 0;
    let nlmtDaThay = 0;
    let nlmtChuaThay = 0;

    let thuHoiScopeTong = 0;
    let rsThuHoi = 0;
    let rsSuDungLai = 0;
    let rsKhac = 0;
    let rsChuaRaSoat = 0;
    let rsDaRaSoat = 0;

    reportData.forEach(r => {
      tongKh += r.tongKh;
      thuHoi += r.thuHoi;
      canThay += r.canThay;
      daThay += r.daThay;
      chuaThay += r.chuaThay;
      tongGioVuot += r.tongGioVuot;
      tongSlVuot += r.tongSlVuot;

      nlmtTong += r.nlmtTong;
      nlmtDaThay += r.nlmtDaThay;
      nlmtChuaThay += r.nlmtChuaThay;

      thuHoiScopeTong += r.thuHoiScopeTong;
      rsThuHoi += r.rsThuHoi;
      rsSuDungLai += r.rsSuDungLai;
      rsKhac += r.rsKhac;
      rsChuaRaSoat += r.rsChuaRaSoat;
      rsDaRaSoat += r.rsDaRaSoat;
    });

    const tyLeChung = canThay > 0 ? Math.round((daThay / canThay) * 1000) / 10 : 0;
    const nlmtTyLeChung = nlmtTong > 0 ? Math.round((nlmtDaThay / nlmtTong) * 1000) / 10 : 0;
    const rsTyLeChung = thuHoiScopeTong > 0 ? Math.round((rsDaRaSoat / thuHoiScopeTong) * 1000) / 10 : 0;

    return {
      tongKh,
      thuHoi,
      canThay,
      daThay,
      chuaThay,
      tongGioVuot: Math.round(tongGioVuot * 100) / 100,
      tongSlVuot: Math.round(tongSlVuot),
      tyLeChung,
      // NLMT Totals
      nlmtTong,
      nlmtDaThay,
      nlmtChuaThay,
      nlmtTyLeChung,
      // Rà soát Totals
      thuHoiScopeTong,
      rsThuHoi,
      rsSuDungLai,
      rsKhac,
      rsChuaRaSoat,
      rsDaRaSoat,
      rsTyLeChung
    };
  }, [reportData]);

  // Danh sách toàn bộ khách hàng NLMT (có cột nlmt là 'x' hoặc chứa 'x')
  const nlmtCustomerList = useMemo(() => {
    return entries.filter(e => Boolean(e.nlmt && (e.nlmt.trim().toLowerCase() === 'x' || e.nlmt.trim().toLowerCase().includes('x'))));
  }, [entries]);

  // Danh sách toàn bộ khách hàng thuộc diện Thu hồi hoặc đã rà soát
  const thuHoiReviewCustomerList = useMemo(() => {
    return entries.filter(e => {
      const isThuHoi = Boolean(e.kSuDung && e.kSuDung.trim().toLowerCase().includes('thu hồi'));
      const hasKq = Boolean(e.kqRaSoat && e.kqRaSoat.trim());
      return isThuHoi || hasKq;
    });
  }, [entries]);

  // Bộ lọc danh sách chi tiết NLMT
  const filteredNlmtCustomers = useMemo(() => {
    return nlmtCustomerList.filter(item => {
      const isDone = Boolean(item.ketQua && item.ketQua.trim().toLowerCase().includes('xong'));
      if (nlmtFilter === 'completed' && !isDone) return false;
      if (nlmtFilter === 'pending' && isDone) return false;

      if (nlmtSearch.trim()) {
        const q = nlmtSearch.trim().toLowerCase();
        const match = 
          (item.maKh && item.maKh.toLowerCase().includes(q)) ||
          (item.tenKh && item.tenKh.toLowerCase().includes(q)) ||
          (item.diaChi && item.diaChi.toLowerCase().includes(q)) ||
          (item.kv && item.kv.toLowerCase().includes(q)) ||
          (item.dot && String(item.dot).toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [nlmtCustomerList, nlmtFilter, nlmtSearch]);

  // Bộ lọc danh sách chi tiết Rà soát thu hồi
  const filteredRaSoatCustomers = useMemo(() => {
    return thuHoiReviewCustomerList.filter(item => {
      const hasKq = Boolean(item.kqRaSoat && item.kqRaSoat.trim());
      const kqNorm = (item.kqRaSoat || '').trim().toLowerCase();

      if (raSoatFilter === 'chua' && hasKq) return false;
      if (raSoatFilter === 'su_dung_lai' && (!hasKq || !kqNorm.includes('sử dụng lại'))) return false;
      if (raSoatFilter === 'thu_hoi' && (!hasKq || (!kqNorm.includes('thu hồi') && kqNorm !== 'thu hồi'))) return false;
      if (raSoatFilter === 'khac' && (!hasKq || kqNorm.includes('sử dụng lại') || kqNorm.includes('thu hồi'))) return false;

      if (raSoatSearch.trim()) {
        const q = raSoatSearch.trim().toLowerCase();
        const match = 
          (item.maKh && item.maKh.toLowerCase().includes(q)) ||
          (item.tenKh && item.tenKh.toLowerCase().includes(q)) ||
          (item.diaChi && item.diaChi.toLowerCase().includes(q)) ||
          (item.kv && item.kv.toLowerCase().includes(q)) ||
          (item.kqRaSoat && item.kqRaSoat.toLowerCase().includes(q)) ||
          (item.dot && String(item.dot).toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [thuHoiReviewCustomerList, raSoatFilter, raSoatSearch]);

  // Chuyển nhanh sang Tab 1 để thao tác với khách hàng được chọn từ báo cáo
  const handleSelectCustomerFromReport = (item: Entry963) => {
    setSelectedCustomer(item);
    setActiveSubTab('thuc_hien');
    window.scrollTo({ top: 300, behavior: 'smooth' });
    showToast('info', `Đã chọn khách hàng ${item.maKh} (${item.tenKh}) để xử lý ở Tab 1.`);
  };

  // Export Tab 2 Report to Excel (bao gồm Tổng Hợp, NLMT và Kết Quả Rà Soát Thu Hồi)
  const handleExportReportExcel = () => {
    if (reportData.length === 0) {
      alert('Không có dữ liệu báo cáo để xuất!');
      return;
    }

    // 1. Sheet Tổng Hợp Đợt & Khu Vực
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
      // Bổ sung NLMT
      'Tổng KH NLMT': r.nlmtTong,
      'NLMT Đã Thay': r.nlmtDaThay,
      'Tỷ Lệ NLMT (%)': `${r.nlmtTyLe}%`,
      'NLMT Còn Lại': r.nlmtChuaThay,
      // Bổ sung Rà Soát Thu Hồi
      'Tổng Diện Thu Hồi': r.thuHoiScopeTong,
      'Đã Rà Soát': r.rsDaRaSoat,
      'Tỷ Lệ Rà Soát (%)': `${r.rsTyLe}%`,
      'RS: Sử Dụng Lại': r.rsSuDungLai,
      'RS: Thu Hồi': r.rsThuHoi,
      'RS: Khác': r.rsKhac,
      'Chưa Rà Soát': r.rsChuaRaSoat,
      // Giờ vượt & Sản lượng
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
      // Tổng NLMT
      'Tổng KH NLMT': reportTotals.nlmtTong,
      'NLMT Đã Thay': reportTotals.nlmtDaThay,
      'Tỷ Lệ NLMT (%)': `${reportTotals.nlmtTyLeChung}%`,
      'NLMT Còn Lại': reportTotals.nlmtChuaThay,
      // Tổng Rà Soát
      'Tổng Diện Thu Hồi': reportTotals.thuHoiScopeTong,
      'Đã Rà Soát': reportTotals.rsDaRaSoat,
      'Tỷ Lệ Rà Soát (%)': `${reportTotals.rsTyLeChung}%`,
      'RS: Sử Dụng Lại': reportTotals.rsSuDungLai,
      'RS: Thu Hồi': reportTotals.rsThuHoi,
      'RS: Khác': reportTotals.rsKhac,
      'Chưa Rà Soát': reportTotals.rsChuaRaSoat,
      // Tổng Giờ & Sản lượng
      'Tổng Giờ Vượt (h)': reportTotals.tongGioVuot,
      'Tổng Sản Lượng Vượt (kWh)': reportTotals.tongSlVuot
    });

    const wb = XLSX.utils.book_new();

    // Sheet 1: Tổng Hợp
    const ws1 = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'TongHop_QD963');

    // Sheet 2: Danh sách Khách Hàng NLMT
    if (nlmtCustomerList.length > 0) {
      const nlmtRows = nlmtCustomerList.map((c, idx) => ({
        'STT': idx + 1,
        'Mã Khách Hàng': c.maKh,
        'Tên Khách Hàng': c.tenKh,
        'Địa Chỉ': c.diaChi,
        'Khu Vực': c.kv,
        'Đợt': c.dot,
        'Loại Công Tơ': c.loaiCto || '',
        'Hệ Số Nhân (HSN)': c.hsn !== undefined && c.hsn !== '' ? c.hsn : resolveHsn(c),
        'Trạng Thái Thay': (c.ketQua && c.ketQua.toLowerCase().includes('xong')) ? 'Đã thay xong' : 'Chưa thay',
        'NV Thực Hiện': c.nv || '',
        'Ngày Giờ Thay': c.ngayGio || '',
        'Giờ Vượt (h)': c.gioVuot !== undefined ? c.gioVuot : 0,
        'SL Vượt (kWh)': c.slVuot || 0,
        'Không Sử Dụng': c.kSuDung || '',
        'KQ Rà Soát': c.kqRaSoat || ''
      }));
      const ws2 = XLSX.utils.json_to_sheet(nlmtRows);
      XLSX.utils.book_append_sheet(wb, ws2, 'DS_KhachHang_NLMT');
    }

    // Sheet 3: Danh sách Khách Hàng Diện Thu Hồi & Kết Quả Rà Soát
    if (thuHoiReviewCustomerList.length > 0) {
      const rsRows = thuHoiReviewCustomerList.map((c, idx) => {
        const hasKq = Boolean(c.kqRaSoat && c.kqRaSoat.trim());
        const isSuDungLai = c.kqRaSoat?.trim().toLowerCase().includes('sử dụng lại');
        const isThuHoiGiuNguyen = c.kqRaSoat?.trim().toLowerCase().includes('thu hồi') || c.kqRaSoat?.trim().toLowerCase() === 'thu hồi';
        const phanLoai = !hasKq 
          ? 'Chưa rà soát' 
          : isSuDungLai 
          ? 'Sử dụng lại (Được thay)' 
          : isThuHoiGiuNguyen 
          ? 'Thu hồi (Không thay)' 
          : 'Khác';

        const choPhepThay = (!c.kSuDung || !c.kSuDung.toLowerCase().includes('thu hồi')) ? 'Được phép thay' : 'Không được thay';
        const isDone = Boolean(c.ketQua && c.ketQua.toLowerCase().includes('xong'));

        return {
          'STT': idx + 1,
          'Mã Khách Hàng': c.maKh,
          'Tên Khách Hàng': c.tenKh,
          'Địa Chỉ': c.diaChi,
          'Khu Vực': c.kv,
          'Đợt': c.dot,
          'Cột KSuDung': c.kSuDung || '',
          'Kết Quả Rà Soát (KQRaSoat)': c.kqRaSoat || 'Chưa rà soát',
          'Phân Loại Rà Soát': phanLoai,
          'Quy Định Thay': choPhepThay,
          'Trạng Thái Thay': isDone ? 'Đã thay xong' : 'Chưa thay',
          'NV Thực Hiện': c.nv || '',
          'Ngày Giờ Thay': c.ngayGio || ''
        };
      });
      const ws3 = XLSX.utils.json_to_sheet(rsRows);
      XLSX.utils.book_append_sheet(wb, ws3, 'DS_RaSoat_ThuHoi');
    }

    XLSX.writeFile(wb, `BaoCao_ToanDien_ThayCongTo_QD963_${getCurrentDateTimeStr().replace(/[/ :]/g, '_')}.xlsx`);
    showToast('success', 'Đã xuất file Excel báo cáo QĐ 963 toàn diện (gồm Tổng hợp, NLMT và Rà soát thu hồi)!');
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

      {/* Compact Executive Header Bar */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl shadow-sm border border-amber-900/40 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
          {/* Left: Title + User badge */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wide flex items-center gap-1.5">
                <span>Thay Công Tơ QĐ 963</span>
                <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.2 rounded-full normal-case">
                  QĐ 963
                </span>
              </h2>
              {sessionUser?.name && (
                <span className="hidden xl:inline-flex items-center gap-1 text-[11px] bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15 text-amber-200">
                  <User className="w-3 h-3" />
                  <span>{sessionUser.name}</span>
                  <span className="opacity-70">({sessionUser.team || sessionUser.boPhan || 'QLHTĐĐ'})</span>
                </span>
              )}
            </div>
          </div>

          {/* Center: Sub-tab switcher */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 self-start md:self-center">
            <button
              type="button"
              onClick={() => setActiveSubTab('thuc_hien')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeSubTab === 'thuc_hien'
                  ? 'bg-amber-400 text-amber-950 shadow-sm'
                  : 'text-amber-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Tab 1: Thực Hiện</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('bao_cao')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeSubTab === 'bao_cao'
                  ? 'bg-amber-400 text-amber-950 shadow-sm'
                  : 'text-amber-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Tab 2: Báo Cáo</span>
            </button>
          </div>

          {/* Right: Expand/Collapse & Actions */}
          <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
            {/* Quick Collapse / Expand All actions */}
            <div className="hidden sm:flex items-center bg-white/10 p-0.5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setAllSections(true)}
                className="px-2 py-1 rounded text-white/90 hover:text-white hover:bg-white/15 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                title="Bung tất cả các phần trong tab"
              >
                <ChevronsDown className="w-3 h-3" />
                <span>Bung</span>
              </button>
              <button
                type="button"
                onClick={() => setAllSections(false)}
                className="px-2 py-1 rounded text-white/90 hover:text-white hover:bg-white/15 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                title="Thu gọn tất cả các phần trong tab"
              >
                <ChevronsUp className="w-3 h-3" />
                <span>Thu gọn</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowScriptModal(true)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 hover:text-white border border-white/15 text-xs transition-all cursor-pointer"
              title="Xem và sao chép mã Google Apps Script QĐ 963"
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => refreshData(true)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
              title="Tải lại dữ liệu mới nhất từ Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Tải lại</span>
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
                  {/* KHỐI CẢNH BÁO & CẬP NHẬT KẾT QUẢ RÀ SOÁT / XỬ LÝ KHÁCH HÀNG THU HỒI */}
                  {(selectedCustomer.kSuDung?.toLowerCase().includes('thu hồi') || selectedCustomer.kqRaSoat) && (
                    <div className={`p-4 rounded-xl border-2 space-y-3 transition-colors ${
                      selectedCustomer.kSuDung?.toLowerCase().includes('thu hồi')
                        ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                        : 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          {selectedCustomer.kSuDung?.toLowerCase().includes('thu hồi') ? (
                            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          )}
                          <div>
                            <span className="font-black text-xs uppercase">
                              {selectedCustomer.kSuDung?.toLowerCase().includes('thu hồi')
                                ? 'Khách hàng không sử dụng (Thu hồi) — Hiện không cho thay'
                                : 'Khách hàng đã rà soát: Được phép thay công tơ'}
                            </span>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Cập nhật kết quả xử lý vào cột <b>KQRaSoat</b>. Nếu chọn <b>&quot;Sử dụng lại&quot;</b>, cột <b>KSuDung</b> sẽ tự động về rỗng để mở khóa cho phép thay công tơ.
                            </p>
                          </div>
                        </div>
                        {selectedCustomer.kqRaSoat && (
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                            selectedCustomer.kqRaSoat.includes('Sử dụng lại')
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}>
                            KQRaSoat: {selectedCustomer.kqRaSoat}
                          </span>
                        )}
                      </div>

                      {/* Form chọn kết quả xử lý */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                            Chọn kết quả rà soát / xử lý (Cột KQRaSoat):
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {/* Lựa chọn 1: Thu hồi */}
                            <button
                              type="button"
                              onClick={() => setReviewChoice('Thu hồi')}
                              className={`p-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                reviewChoice === 'Thu hồi'
                                  ? 'bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <ShieldAlert className="w-4 h-4" />
                              <span>1. Thu hồi</span>
                            </button>

                            {/* Lựa chọn 2: Sử dụng lại (Mở khóa cho phép thay) */}
                            <button
                              type="button"
                              onClick={() => setReviewChoice('Sử dụng lại')}
                              className={`p-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                reviewChoice === 'Sử dụng lại'
                                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>2. Sử dụng lại (Cho phép thay)</span>
                            </button>

                            {/* Lựa chọn 3: Khác */}
                            <button
                              type="button"
                              onClick={() => setReviewChoice('Khác')}
                              className={`p-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                reviewChoice === 'Khác'
                                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <Sparkles className="w-4 h-4" />
                              <span>3. Khác (Có diễn giải)</span>
                            </button>
                          </div>
                        </div>

                        {/* Trường hợp chọn Khác -> Cho nhập diễn giải */}
                        {reviewChoice === 'Khác' && (
                          <div className="pt-1 space-y-1">
                            <label className="block text-[11px] font-bold text-amber-950">
                              Nội dung diễn giải lý do khác (Bắt buộc khi chọn &quot;Khác&quot;):
                            </label>
                            <input
                              type="text"
                              value={reviewExplanation}
                              onChange={e => setReviewExplanation(e.target.value)}
                              placeholder="Ví dụ: Chờ giải tỏa, Tranh chấp ranh giới, Đang sửa nhà..."
                              className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <span className="text-[10px] text-slate-500 block">
                              Giá trị lưu vào sheet 963 sẽ là: <b className="font-mono text-amber-900">Khác: {reviewExplanation.trim() || '...'}</b>
                            </span>
                          </div>
                        )}

                        {/* Nút lưu kết quả rà soát */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-100">
                          <span className="text-[11px] text-slate-500">
                            {reviewChoice === 'Sử dụng lại' ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                Khi bấm lưu, hệ thống sẽ xóa &quot;Thu hồi&quot; (KSuDung về rỗng) để bạn tiến hành thay công tơ ngay!
                              </span>
                            ) : (
                              <span>Lưu kết quả rà soát vào cột <b>KQRaSoat</b> sheet 963.</span>
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={handleSaveReviewResult}
                            disabled={isSubmittingReview}
                            className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>{isSubmittingReview ? 'Đang lưu kết quả...' : 'Cập nhật Kết Quả Rà Soát (KQRaSoat)'}</span>
                          </button>
                        </div>
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
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">KQ Rà Soát (KQRaSoat)</span>
                      <div className={`font-bold mt-0.5 ${selectedCustomer.kqRaSoat?.includes('Sử dụng lại') ? 'text-emerald-700' : selectedCustomer.kqRaSoat ? 'text-amber-800' : 'text-slate-400'}`}>
                        {selectedCustomer.kqRaSoat || 'Chưa rà soát'}
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
                          <div className="sm:col-span-1">
                            <span className="text-slate-500 block text-[10px]">Ngày Giờ Thay:</span>
                            <span className="font-mono text-slate-800">{selectedCustomer.ngayGio || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">KQ Rà Soát:</span>
                            <span className={`font-bold ${selectedCustomer.kqRaSoat?.includes('Sử dụng lại') ? 'text-emerald-700' : 'text-amber-900'}`}>{selectedCustomer.kqRaSoat || '—'}</span>
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
                        <th className="py-2.5 px-3">KQ Rà Soát</th>
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
                              <td className="py-2 px-3 text-[11px]">
                                {item.kqRaSoat ? (
                                  <span className={`px-1.5 py-0.5 rounded font-medium ${item.kqRaSoat.includes('Sử dụng lại') ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                                    {item.kqRaSoat}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
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
                          <td colSpan={14} className="py-8 text-center text-slate-400 text-xs">
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
        <div className="space-y-6">
          {/* Top KPI Cards (Có thể Ẩn/Hiện) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                  Thống Kê Tiến Độ Tổng Quan (KPIs QĐ 963)
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 pt-1">
                {/* 1. Tổng khách hàng */}
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Tổng khách hàng</span>
                  <div className="text-xl font-black text-slate-900 mt-1">{reportTotals.tongKh}</div>
                  <span className="text-[10px] text-slate-400">Toàn bộ sheet 963</span>
                </div>

                {/* 2. Cần thay */}
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-amber-600">Cần thay</span>
                  <div className="text-xl font-black text-amber-700 mt-1">{reportTotals.canThay}</div>
                  <span className="text-[10px] text-slate-400">Còn lại: {reportTotals.chuaThay} KH</span>
                </div>

                {/* 3. Đã thay xong */}
                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Đã thay xong</span>
                  <div className="text-xl font-black text-emerald-800 mt-1 flex items-baseline gap-1.5">
                    <span>{reportTotals.daThay}</span>
                    <span className="text-xs font-bold text-emerald-600">({reportTotals.tyLeChung}%)</span>
                  </div>
                  <span className="text-[10px] text-emerald-600">Tỷ lệ hoàn thành</span>
                </div>

                {/* 4. Khách hàng NLMT (Mới bổ sung) */}
                <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-amber-800 flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>KH NLMT (x)</span>
                    </span>
                    <span className="bg-amber-200 text-amber-900 text-[9px] font-black px-1.5 py-0.2 rounded">
                      {reportTotals.nlmtTyLeChung}%
                    </span>
                  </div>
                  <div className="text-xl font-black text-amber-900 mt-1 flex items-baseline gap-1">
                    <span>{reportTotals.nlmtDaThay}</span>
                    <span className="text-xs text-slate-500 font-semibold">/ {reportTotals.nlmtTong} KH</span>
                  </div>
                  <span className="text-[10px] text-amber-700">Còn lại: {reportTotals.nlmtChuaThay} KH</span>
                </div>

                {/* 5. Rà soát Thu hồi (Mới bổ sung) */}
                <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-indigo-800 flex items-center gap-1">
                      <ClipboardCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Rà Soát Thu Hồi</span>
                    </span>
                    <span className="bg-indigo-200 text-indigo-950 text-[9px] font-black px-1.5 py-0.2 rounded">
                      {reportTotals.rsTyLeChung}%
                    </span>
                  </div>
                  <div className="text-xl font-black text-indigo-900 mt-1 flex items-baseline gap-1">
                    <span>{reportTotals.rsDaRaSoat}</span>
                    <span className="text-xs text-slate-500 font-semibold">/ {reportTotals.thuHoiScopeTong} KH</span>
                  </div>
                  <div className="text-[10px] text-indigo-700 flex items-center gap-1">
                    <span>Dùng lại: <b>{reportTotals.rsSuDungLai}</b></span>
                    <span>|</span>
                    <span>Chưa: <b>{reportTotals.rsChuaRaSoat}</b></span>
                  </div>
                </div>

                {/* 6. Tổng giờ vượt */}
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-indigo-600">Tổng giờ vượt</span>
                  <div className="text-xl font-black text-indigo-700 mt-1">{reportTotals.tongGioVuot}h</div>
                  <span className="text-[10px] text-slate-400">Khung 9h30 - 11h30</span>
                </div>

                {/* 7. Tổng SL Vượt */}
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-amber-700">Tổng SL Vượt</span>
                  <div className="text-xl font-black text-amber-900 mt-1">{reportTotals.tongSlVuot} <span className="text-xs font-semibold">kWh</span></div>
                  <span className="text-[10px] text-slate-400">Sản lượng bù trừ</span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => toggleSection('reportKpi')}
                className="p-3 bg-slate-50 hover:bg-amber-50/50 rounded-xl border border-dashed border-slate-200 flex items-center justify-between cursor-pointer transition-colors text-xs"
              >
                <span className="text-slate-600 font-medium">
                  Đã thay: <b className="text-emerald-700">{reportTotals.daThay}</b>/{reportTotals.canThay} ({reportTotals.tyLeChung}%) | NLMT: <b className="text-amber-800">{reportTotals.nlmtDaThay}/{reportTotals.nlmtTong} ({reportTotals.nlmtTyLeChung}%)</b> | Rà soát thu hồi: <b className="text-indigo-800">{reportTotals.rsDaRaSoat}/{reportTotals.thuHoiScopeTong} ({reportTotals.rsTyLeChung}%)</b> | Tổng SL Vượt: <b className="text-amber-900">{reportTotals.tongSlVuot} kWh</b>
                </span>
                <span className="text-[11px] text-amber-700 font-bold hover:underline shrink-0 ml-2">
                  Bung ra ▾
                </span>
              </div>
            )}
          </div>

          {/* 1. BẢNG BÁO CÁO TỔNG HỢP THEO ĐỢT & KHU VỰC (CÓ CỘT NLMT VÀ RÀ SOÁT THU HỒI) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-800 text-base uppercase flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                  <span>Bảng Báo Cáo Tiến Độ Thay Công Tơ Theo Đợt & Khu Vực (QĐ 963)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tổng hợp số lượng, tỷ lệ hoàn thành, tiến độ khách hàng NLMT, kết quả rà soát thu hồi và sản lượng vượt cho từng đợt & khu vực.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportReportExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Xuất file Excel gồm 3 sheet: Tổng hợp, Khách hàng NLMT và Rà soát thu hồi"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Xuất Excel Toàn Diện</span>
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
                      <th className="py-2.5 px-3 w-10 text-center">STT</th>
                      <th className="py-2.5 px-3">Đợt</th>
                      <th className="py-2.5 px-3">Khu Vực</th>
                      <th className="py-2.5 px-3 text-right">Tổng KH</th>
                      <th className="py-2.5 px-3 text-right text-rose-700">Thu Hồi</th>
                      <th className="py-2.5 px-3 text-right text-amber-800">Cần Thay</th>
                      <th className="py-2.5 px-3 text-right text-emerald-700">Đã Thay Xong</th>
                      <th className="py-2.5 px-3 text-center">Tỷ Lệ (%)</th>
                      <th className="py-2.5 px-3 text-right text-slate-600">Còn Lại</th>
                      {/* Cột NLMT */}
                      <th className="py-2.5 px-3 text-center bg-amber-50/70 text-amber-900 border-x border-amber-200/60">
                        <div className="flex items-center justify-center gap-1">
                          <Sun className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>KH NLMT (Xong/Tổng)</span>
                        </div>
                      </th>
                      {/* Cột Rà Soát Thu Hồi */}
                      <th className="py-2.5 px-3 bg-indigo-50/70 text-indigo-900 border-r border-indigo-200/60">
                        <div className="flex items-center gap-1">
                          <ClipboardCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>Kết Quả Rà Soát Thu Hồi</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-3 text-right text-indigo-700">Giờ Vượt (h)</th>
                      <th className="py-2.5 px-3 text-right text-amber-900">SL Vượt (kWh)</th>
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

                          {/* Dữ liệu KH NLMT */}
                          <td className="py-2.5 px-3 text-center bg-amber-50/40 border-x border-amber-200/50">
                            {row.nlmtTong > 0 ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="font-mono font-bold text-amber-950">
                                  {row.nlmtDaThay} / {row.nlmtTong}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                  row.nlmtTyLe === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                                }`}>
                                  {row.nlmtTyLe}% (còn {row.nlmtChuaThay})
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">—</span>
                            )}
                          </td>

                          {/* Dữ liệu Rà soát Thu Hồi */}
                          <td className="py-2.5 px-3 bg-indigo-50/40 border-r border-indigo-200/50">
                            {row.thuHoiScopeTong > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-semibold text-slate-700">
                                    Đã RS: <b className="text-indigo-900">{row.rsDaRaSoat}/{row.thuHoiScopeTong}</b>
                                  </span>
                                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 rounded">
                                    {row.rsTyLe}%
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                  {row.rsSuDungLai > 0 && (
                                    <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold" title="Được mở khóa để thay">
                                      Dùng lại: {row.rsSuDungLai}
                                    </span>
                                  )}
                                  {row.rsThuHoi > 0 && (
                                    <span className="bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-semibold" title="Giữ nguyên thu hồi">
                                      Thu hồi: {row.rsThuHoi}
                                    </span>
                                  )}
                                  {row.rsKhac > 0 && (
                                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold" title="Trường hợp khác">
                                      Khác: {row.rsKhac}
                                    </span>
                                  )}
                                  {row.rsChuaRaSoat > 0 && (
                                    <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold" title="Chưa có kết quả rà soát">
                                      Chưa RS: {row.rsChuaRaSoat}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">—</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">{row.tongGioVuot}h</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900">
                            {row.tongSlVuot} kWh
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={13} className="py-8 text-center text-slate-400 text-xs">
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
                        {/* Tổng NLMT */}
                        <td className="py-3 px-3 text-center font-mono text-amber-950 bg-amber-100 border-x border-amber-300">
                          <div className="font-bold">{reportTotals.nlmtDaThay} / {reportTotals.nlmtTong} ({reportTotals.nlmtTyLeChung}%)</div>
                          <div className="text-[10px] normal-case text-amber-800 font-normal">Còn lại: {reportTotals.nlmtChuaThay} KH</div>
                        </td>
                        {/* Tổng Rà Soát */}
                        <td className="py-3 px-3 text-left font-mono text-indigo-950 bg-indigo-100 border-r border-indigo-300">
                          <div className="font-bold">Đã RS: {reportTotals.rsDaRaSoat} / {reportTotals.thuHoiScopeTong} ({reportTotals.rsTyLeChung}%)</div>
                          <div className="text-[10px] normal-case text-indigo-800 font-normal flex flex-wrap gap-1 mt-0.5">
                            <span>Dùng lại: <b>{reportTotals.rsSuDungLai}</b></span>
                            <span>•</span>
                            <span>Thu hồi: <b>{reportTotals.rsThuHoi}</b></span>
                            <span>•</span>
                            <span>Khác: <b>{reportTotals.rsKhac}</b></span>
                            <span>•</span>
                            <span>Chưa: <b>{reportTotals.rsChuaRaSoat}</b></span>
                          </div>
                        </td>
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

          {/* ========================================================= */}
          {/* 2. KHỐI BÁO CÁO CHUYÊN ĐỀ: KHÁCH HÀNG NĂNG LƯỢNG MẶT TRỜI (NLMT = "x") */}
          {/* ========================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Sun className="w-5 h-5 text-amber-600" />
                </span>
                <div>
                  <h3 className="font-black text-slate-800 text-base uppercase flex items-center gap-2">
                    <span>Báo Cáo Khách Hàng Năng Lượng Mặt Trời (Cột NLMT = "x")</span>
                    <span className="bg-amber-100 text-amber-800 font-bold text-xs px-2 py-0.5 rounded-full normal-case">
                      {nlmtCustomerList.length} khách hàng
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Theo dõi chi tiết số lượng khách hàng NLMT đã thay xong, tỷ lệ hoàn thành và danh sách cần xử lý theo từng đợt & khu vực.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowNlmtDetails(prev => !prev)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                    showNlmtDetails 
                      ? 'bg-amber-100 text-amber-900 border-amber-300' 
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showNlmtDetails ? 'Ẩn danh sách từng KH' : 'Xem danh sách từng KH'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleSection('reportNlmt')}
                  className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  title={collapsedSections.reportNlmt ? "Thu gọn báo cáo NLMT" : "Bung ra báo cáo NLMT"}
                >
                  <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                    {collapsedSections.reportNlmt ? 'Thu gọn' : 'Bung ra'}
                  </span>
                  {collapsedSections.reportNlmt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {collapsedSections.reportNlmt ? (
              <div className="space-y-4">
                {/* Cards tóm tắt NLMT */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                    <span className="text-[10px] font-bold uppercase text-amber-800">Tổng KH NLMT</span>
                    <div className="text-xl font-black text-amber-950 mt-1">{reportTotals.nlmtTong}</div>
                    <span className="text-[10px] text-amber-700">Có đánh dấu "x" cột NLMT</span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                    <span className="text-[10px] font-bold uppercase text-emerald-700">Đã Thay Xong</span>
                    <div className="text-xl font-black text-emerald-800 mt-1 flex items-baseline gap-1">
                      <span>{reportTotals.nlmtDaThay}</span>
                      <span className="text-xs font-bold text-emerald-600">({reportTotals.nlmtTyLeChung}%)</span>
                    </div>
                    <span className="text-[10px] text-emerald-600">Tỷ lệ hoàn thành</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-600">Còn Lại Chưa Thay</span>
                    <div className="text-xl font-black text-slate-800 mt-1">{reportTotals.nlmtChuaThay}</div>
                    <span className="text-[10px] text-slate-500">Cần tiếp tục thực hiện</span>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/80">
                    <span className="text-[10px] font-bold uppercase text-indigo-700">Tỷ Lệ Đạt Được</span>
                    <div className="text-xl font-black text-indigo-900 mt-1">{reportTotals.nlmtTyLeChung}%</div>
                    <span className="text-[10px] text-indigo-600">Tiến độ thay công tơ NLMT</span>
                  </div>
                </div>

                {/* Bảng tổng hợp theo Đợt & Khu vực cho NLMT */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-amber-100/60 text-amber-950 font-bold border-b border-amber-200 uppercase text-[10px]">
                        <th className="py-2.5 px-3 w-10 text-center">STT</th>
                        <th className="py-2.5 px-3">Đợt Thực Hiện</th>
                        <th className="py-2.5 px-3">Khu Vực</th>
                        <th className="py-2.5 px-3 text-right">Tổng KH NLMT</th>
                        <th className="py-2.5 px-3 text-right text-emerald-700">Đã Thay Xong</th>
                        <th className="py-2.5 px-3 text-center">Tỷ Lệ (%)</th>
                        <th className="py-2.5 px-3 text-right text-amber-900">Còn Lại Chưa Thay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.filter(r => r.nlmtTong > 0).length > 0 ? (
                        reportData.filter(r => r.nlmtTong > 0).map((r, idx) => (
                          <tr key={`nlmt_${r.dot}_${r.kv}`} className="hover:bg-amber-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">Đợt {r.dot}</td>
                            <td className="py-2.5 px-3 font-bold text-amber-900">{r.kv}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{r.nlmtTong}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{r.nlmtDaThay}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                r.nlmtTyLe === 100
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.nlmtTyLe >= 50
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {r.nlmtTyLe}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900">{r.nlmtChuaThay}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                            Không có khách hàng NLMT nào trong danh sách hiện tại.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {reportData.filter(r => r.nlmtTong > 0).length > 0 && (
                      <tfoot>
                        <tr className="bg-amber-100/90 border-t-2 border-amber-300 font-bold text-amber-950 text-xs uppercase">
                          <td colSpan={3} className="py-2.5 px-3 text-right">TỔNG CỘNG KHÁCH HÀNG NLMT:</td>
                          <td className="py-2.5 px-3 text-right font-mono">{reportTotals.nlmtTong}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-800">{reportTotals.nlmtDaThay}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-emerald-800">{reportTotals.nlmtTyLeChung}%</td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-950">{reportTotals.nlmtChuaThay}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Danh sách chi tiết từng khách hàng NLMT (Bật/Tắt) */}
                {showNlmtDetails && (
                  <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50/20 space-y-3 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-amber-900 mr-1">Lọc trạng thái:</span>
                        <button
                          type="button"
                          onClick={() => { setNlmtFilter('all'); setNlmtPage(1); }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            nlmtFilter === 'all' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Tất cả ({nlmtCustomerList.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setNlmtFilter('completed'); setNlmtPage(1); }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            nlmtFilter === 'completed' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          Đã thay xong ({reportTotals.nlmtDaThay})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setNlmtFilter('pending'); setNlmtPage(1); }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            nlmtFilter === 'pending' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                          }`}
                        >
                          Chưa thay ({reportTotals.nlmtChuaThay})
                        </button>
                      </div>

                      {/* Ô tìm kiếm khách hàng NLMT */}
                      <div className="relative w-full sm:w-64">
                        <input
                          type="text"
                          value={nlmtSearch}
                          onChange={(e) => { setNlmtSearch(e.target.value); setNlmtPage(1); }}
                          placeholder="Tìm Mã KH, Tên KH, KV..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      </div>
                    </div>

                    {/* Bảng chi tiết NLMT */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase">
                              <th className="py-2 px-3 w-10 text-center">STT</th>
                              <th className="py-2 px-3">Mã KH</th>
                              <th className="py-2 px-3">Tên Khách Hàng</th>
                              <th className="py-2 px-3">Địa Chỉ</th>
                              <th className="py-2 px-3">Khu Vực</th>
                              <th className="py-2 px-3">Đợt</th>
                              <th className="py-2 px-3 text-center">HSN</th>
                              <th className="py-2 px-3 text-center">Trạng Thái</th>
                              <th className="py-2 px-3">NV / Ngày giờ</th>
                              <th className="py-2 px-3 text-right">SL Vượt</th>
                              <th className="py-2 px-3 text-center">Thao Tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredNlmtCustomers.length > 0 ? (
                              filteredNlmtCustomers.slice((nlmtPage - 1) * PAGE_SIZE, nlmtPage * PAGE_SIZE).map((c, idx) => {
                                const stt = (nlmtPage - 1) * PAGE_SIZE + idx + 1;
                                const isDone = Boolean(c.ketQua && c.ketQua.toLowerCase().includes('xong'));
                                const hsnVal = c.hsn !== undefined && c.hsn !== '' ? c.hsn : resolveHsn(c);
                                return (
                                  <tr key={c.maKh} className="hover:bg-amber-50/50 transition-colors">
                                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{stt}</td>
                                    <td className="py-2 px-3 font-mono font-bold text-amber-900">{c.maKh}</td>
                                    <td className="py-2 px-3 font-medium text-slate-800">{c.tenKh}</td>
                                    <td className="py-2 px-3 text-slate-600 truncate max-w-xs" title={c.diaChi}>{c.diaChi}</td>
                                    <td className="py-2 px-3 font-semibold text-slate-700">{c.kv}</td>
                                    <td className="py-2 px-3 font-mono text-slate-600">Đợt {c.dot}</td>
                                    <td className="py-2 px-3 text-center font-mono font-bold text-amber-900">{hsnVal}</td>
                                    <td className="py-2 px-3 text-center">
                                      {isDone ? (
                                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                          <Check className="w-3 h-3" /> Đã thay
                                        </span>
                                      ) : (
                                        <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                          Chưa thay
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-[11px] text-slate-600">
                                      {isDone ? `${c.nv || '—'} (${c.ngayGio || '—'})` : '—'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-900">
                                      {c.slVuot ? `${c.slVuot} kWh` : '—'}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleSelectCustomerFromReport(c)}
                                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
                                        title="Chuyển sang Tab 1 để cập nhật / thay công tơ cho khách hàng này"
                                      >
                                        Chọn xử lý ➔
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={11} className="py-6 text-center text-slate-400 text-xs">
                                  Không tìm thấy khách hàng NLMT nào phù hợp với bộ lọc.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Phân trang NLMT */}
                      {Math.ceil(filteredNlmtCustomers.length / PAGE_SIZE) > 1 && (
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs">
                          <span className="text-slate-500 text-[11px]">
                            Trang <b>{nlmtPage}</b> / <b>{Math.ceil(filteredNlmtCustomers.length / PAGE_SIZE)}</b> ({filteredNlmtCustomers.length} khách hàng NLMT)
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setNlmtPage(p => Math.max(1, p - 1))}
                              disabled={nlmtPage <= 1}
                              className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold"
                            >
                              Trước
                            </button>
                            <button
                              type="button"
                              onClick={() => setNlmtPage(p => Math.min(Math.ceil(filteredNlmtCustomers.length / PAGE_SIZE), p + 1))}
                              disabled={nlmtPage >= Math.ceil(filteredNlmtCustomers.length / PAGE_SIZE)}
                              className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold"
                            >
                              Sau
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => toggleSection('reportNlmt')}
                className="p-3 bg-slate-50 hover:bg-amber-50/50 rounded-xl border border-dashed border-slate-200 flex items-center justify-between cursor-pointer transition-colors text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <Sun className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-semibold text-slate-700 truncate">
                    Báo cáo tiến độ khách hàng NLMT đang thu gọn ({reportTotals.nlmtDaThay}/{reportTotals.nlmtTong} KH - {reportTotals.nlmtTyLeChung}%)
                  </span>
                </div>
                <span className="text-[11px] text-amber-700 font-bold hover:underline shrink-0 ml-2">
                  Bung ra ▾
                </span>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 3. KHỐI BÁO CÁO CHUYÊN ĐỀ: KẾT QUẢ RÀ SOÁT KHÁCH HÀNG THU HỒI (CỘT KQRASOAT) */}
          {/* ========================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-100 text-indigo-800">
                  <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                </span>
                <div>
                  <h3 className="font-black text-slate-800 text-base uppercase flex items-center gap-2">
                    <span>Báo Cáo Kết Quả Rà Soát Khách Hàng Thu Hồi (Cột KQRaSoat)</span>
                    <span className="bg-indigo-100 text-indigo-900 font-bold text-xs px-2 py-0.5 rounded-full normal-case">
                      {thuHoiReviewCustomerList.length} khách hàng
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thống kê tỷ lệ rà soát và cơ cấu xử lý (Sử dụng lại để mở khóa thay, Thu hồi giữ nguyên, Khác, hoặc Chưa rà soát) theo từng đợt & khu vực.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRaSoatDetails(prev => !prev)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                    showRaSoatDetails 
                      ? 'bg-indigo-100 text-indigo-900 border-indigo-300' 
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showRaSoatDetails ? 'Ẩn danh sách từng KH' : 'Xem danh sách từng KH'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleSection('reportRaSoat')}
                  className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  title={collapsedSections.reportRaSoat ? "Thu gọn báo cáo rà soát thu hồi" : "Bung ra báo cáo rà soát thu hồi"}
                >
                  <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                    {collapsedSections.reportRaSoat ? 'Thu gọn' : 'Bung ra'}
                  </span>
                  {collapsedSections.reportRaSoat ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {collapsedSections.reportRaSoat ? (
              <div className="space-y-4">
                {/* Cards tóm tắt Rà Soát */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-600">Tổng Diện Thu Hồi</span>
                    <div className="text-xl font-black text-slate-900 mt-1">{reportTotals.thuHoiScopeTong}</div>
                    <span className="text-[10px] text-slate-400">KH không sử dụng / có KQ</span>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/80">
                    <span className="text-[10px] font-bold uppercase text-indigo-700">Đã Rà Soát</span>
                    <div className="text-xl font-black text-indigo-900 mt-1 flex items-baseline gap-1">
                      <span>{reportTotals.rsDaRaSoat}</span>
                      <span className="text-xs font-bold text-indigo-600">({reportTotals.rsTyLeChung}%)</span>
                    </div>
                    <span className="text-[10px] text-indigo-600">Đã cập nhật KQRaSoat</span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <span className="text-[10px] font-bold uppercase text-emerald-800">Sử Dụng Lại</span>
                    <div className="text-xl font-black text-emerald-900 mt-1">{reportTotals.rsSuDungLai}</div>
                    <span className="text-[10px] text-emerald-700">Đã mở khóa, được phép thay</span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/80">
                    <span className="text-[10px] font-bold uppercase text-rose-700">Thu Hồi (Giữ Nguyên)</span>
                    <div className="text-xl font-black text-rose-800 mt-1">{reportTotals.rsThuHoi}</div>
                    <span className="text-[10px] text-rose-600">Xác nhận không sử dụng</span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/60">
                    <span className="text-[10px] font-bold uppercase text-amber-800">Khác</span>
                    <div className="text-xl font-black text-amber-900 mt-1">{reportTotals.rsKhac}</div>
                    <span className="text-[10px] text-amber-700">Có kèm nội dung diễn giải</span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-300">
                    <span className="text-[10px] font-bold uppercase text-amber-900">Chưa Rà Soát</span>
                    <div className="text-xl font-black text-amber-950 mt-1">{reportTotals.rsChuaRaSoat}</div>
                    <span className="text-[10px] text-amber-800 font-medium">Cần hoàn tất rà soát</span>
                  </div>
                </div>

                {/* Bảng tổng hợp theo Đợt & Khu vực cho Rà soát thu hồi */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-indigo-100/60 text-indigo-950 font-bold border-b border-indigo-200 uppercase text-[10px]">
                        <th className="py-2.5 px-3 w-10 text-center">STT</th>
                        <th className="py-2.5 px-3">Đợt Thực Hiện</th>
                        <th className="py-2.5 px-3">Khu Vực</th>
                        <th className="py-2.5 px-3 text-right">Tổng Thu Hồi</th>
                        <th className="py-2.5 px-3 text-right text-indigo-700">Đã Rà Soát</th>
                        <th className="py-2.5 px-3 text-center">Tỷ Lệ RS (%)</th>
                        <th className="py-2.5 px-3 text-right text-emerald-700">Sử Dụng Lại</th>
                        <th className="py-2.5 px-3 text-right text-rose-700">Thu Hồi</th>
                        <th className="py-2.5 px-3 text-right text-slate-700">Khác</th>
                        <th className="py-2.5 px-3 text-right text-amber-900">Chưa Rà Soát</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.filter(r => r.thuHoiScopeTong > 0).length > 0 ? (
                        reportData.filter(r => r.thuHoiScopeTong > 0).map((r, idx) => (
                          <tr key={`rs_${r.dot}_${r.kv}`} className="hover:bg-indigo-50/40 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">Đợt {r.dot}</td>
                            <td className="py-2.5 px-3 font-bold text-amber-900">{r.kv}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{r.thuHoiScopeTong}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-800">{r.rsDaRaSoat}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                r.rsTyLe === 100
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.rsTyLe >= 50
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {r.rsTyLe}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{r.rsSuDungLai}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">{r.rsThuHoi}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">{r.rsKhac}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900">{r.rsChuaRaSoat}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={10} className="py-6 text-center text-slate-400 text-xs">
                            Không có khách hàng nào thuộc diện thu hồi trong danh sách hiện tại.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {reportData.filter(r => r.thuHoiScopeTong > 0).length > 0 && (
                      <tfoot>
                        <tr className="bg-indigo-100/90 border-t-2 border-indigo-300 font-bold text-indigo-950 text-xs uppercase">
                          <td colSpan={3} className="py-2.5 px-3 text-right">TỔNG CỘNG DIỆN THU HỒI:</td>
                          <td className="py-2.5 px-3 text-right font-mono">{reportTotals.thuHoiScopeTong}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-indigo-900">{reportTotals.rsDaRaSoat}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-indigo-900">{reportTotals.rsTyLeChung}%</td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-800">{reportTotals.rsSuDungLai}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-700">{reportTotals.rsThuHoi}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-800">{reportTotals.rsKhac}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-950 font-black">{reportTotals.rsChuaRaSoat}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Danh sách chi tiết từng khách hàng diện thu hồi & KQ rà soát (Bật/Tắt) */}
                {showRaSoatDetails && (
                  <div className="mt-4 p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 space-y-3 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-indigo-900 mr-1">Lọc kết quả:</span>
                        <button
                          type="button"
                          onClick={() => { setRaSoatFilter('all'); setRaSoatPage(1); }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            raSoatFilter === 'all' ? 'bg-indigo-700 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Tất cả ({thuHoiReviewCustomerList.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRaSoatFilter('chua'); setRaSoatPage(1); }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            raSoatFilter === 'chua' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-50'
                          }`}
                        >
                          Chưa rà soát ({reportTotals.rsChuaRaSoat})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRaSoatFilter('su_dung_lai'); setRaSoatPage(1); }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            raSoatFilter === 'su_dung_lai' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50'
                          }`}
                        >
                          Sử dụng lại ({reportTotals.rsSuDungLai})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRaSoatFilter('thu_hoi'); setRaSoatPage(1); }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            raSoatFilter === 'thu_hoi' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-50'
                          }`}
                        >
                          Thu hồi ({reportTotals.rsThuHoi})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRaSoatFilter('khac'); setRaSoatPage(1); }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            raSoatFilter === 'khac' ? 'bg-slate-700 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Khác ({reportTotals.rsKhac})
                        </button>
                      </div>

                      {/* Ô tìm kiếm khách hàng diện thu hồi */}
                      <div className="relative w-full sm:w-64">
                        <input
                          type="text"
                          value={raSoatSearch}
                          onChange={(e) => { setRaSoatSearch(e.target.value); setRaSoatPage(1); }}
                          placeholder="Tìm Mã KH, Tên KH, Diễn giải..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      </div>
                    </div>

                    {/* Bảng chi tiết Rà Soát */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase">
                              <th className="py-2 px-3 w-10 text-center">STT</th>
                              <th className="py-2 px-3">Mã KH</th>
                              <th className="py-2 px-3">Tên Khách Hàng</th>
                              <th className="py-2 px-3">Khu Vực</th>
                              <th className="py-2 px-3">Đợt</th>
                              <th className="py-2 px-3">Cột KSuDung</th>
                              <th className="py-2 px-3">Kết Quả Rà Soát (KQRaSoat)</th>
                              <th className="py-2 px-3 text-center">Quy Định Thay</th>
                              <th className="py-2 px-3 text-center">Trạng Thái Thay</th>
                              <th className="py-2 px-3 text-center">Thao Tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredRaSoatCustomers.length > 0 ? (
                              filteredRaSoatCustomers.slice((raSoatPage - 1) * PAGE_SIZE, raSoatPage * PAGE_SIZE).map((c, idx) => {
                                const stt = (raSoatPage - 1) * PAGE_SIZE + idx + 1;
                                const isDone = Boolean(c.ketQua && c.ketQua.toLowerCase().includes('xong'));
                                const hasKq = Boolean(c.kqRaSoat && c.kqRaSoat.trim());
                                const isThuHoiBlocked = Boolean(c.kSuDung && c.kSuDung.toLowerCase().includes('thu hồi'));
                                return (
                                  <tr key={c.maKh} className="hover:bg-indigo-50/40 transition-colors">
                                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{stt}</td>
                                    <td className="py-2 px-3 font-mono font-bold text-amber-900">{c.maKh}</td>
                                    <td className="py-2 px-3 font-medium text-slate-800">{c.tenKh}</td>
                                    <td className="py-2 px-3 font-semibold text-slate-700">{c.kv}</td>
                                    <td className="py-2 px-3 font-mono text-slate-600">Đợt {c.dot}</td>
                                    <td className="py-2 px-3">
                                      {c.kSuDung ? (
                                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                          {c.kSuDung}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 font-mono text-[11px]">(Đã xóa rỗng)</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 font-medium">
                                      {hasKq ? (
                                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                          c.kqRaSoat!.includes('Sử dụng lại') 
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                            : c.kqRaSoat!.includes('Thu hồi')
                                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                            : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                        }`}>
                                          {c.kqRaSoat}
                                        </span>
                                      ) : (
                                        <span className="text-amber-700 bg-amber-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                          Chưa rà soát
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {isThuHoiBlocked ? (
                                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                          Không được thay
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                          Được phép thay
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {isDone ? (
                                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                          <Check className="w-3 h-3" /> Đã xong
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 text-[11px]">Chưa thay</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleSelectCustomerFromReport(c)}
                                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
                                        title="Chuyển sang Tab 1 để rà soát hoặc thay thế cho khách hàng này"
                                      >
                                        Rà soát / Xử lý ➔
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={10} className="py-6 text-center text-slate-400 text-xs">
                                  Không tìm thấy khách hàng nào phù hợp với bộ lọc rà soát.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Phân trang Rà Soát */}
                      {Math.ceil(filteredRaSoatCustomers.length / PAGE_SIZE) > 1 && (
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs">
                          <span className="text-slate-500 text-[11px]">
                            Trang <b>{raSoatPage}</b> / <b>{Math.ceil(filteredRaSoatCustomers.length / PAGE_SIZE)}</b> ({filteredRaSoatCustomers.length} khách hàng)
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setRaSoatPage(p => Math.max(1, p - 1))}
                              disabled={raSoatPage <= 1}
                              className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold"
                            >
                              Trước
                            </button>
                            <button
                              type="button"
                              onClick={() => setRaSoatPage(p => Math.min(Math.ceil(filteredRaSoatCustomers.length / PAGE_SIZE), p + 1))}
                              disabled={raSoatPage >= Math.ceil(filteredRaSoatCustomers.length / PAGE_SIZE)}
                              className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold"
                            >
                              Sau
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => toggleSection('reportRaSoat')}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-dashed border-slate-200 flex items-center justify-between cursor-pointer transition-colors text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <ClipboardCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-semibold text-slate-700 truncate">
                    Báo cáo kết quả rà soát khách hàng thu hồi đang thu gọn ({reportTotals.rsDaRaSoat}/{reportTotals.thuHoiScopeTong} KH đã rà soát - {reportTotals.rsTyLeChung}%)
                  </span>
                </div>
                <span className="text-[11px] text-indigo-700 font-bold hover:underline shrink-0 ml-2">
                  Bung ra ▾
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL HƯỚNG DẪN & SAO CHÉP MÃ GOOGLE APPS SCRIPT CHO SHEET 963 */}
      {showScriptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-amber-200" />
                <h3 className="font-bold text-sm uppercase tracking-wide">
                  Mã Nguồn Google Apps Script Mới (Hỗ Trợ KQRasoat & KSudung Sheet 963)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
              <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl space-y-2 text-amber-950">
                <div className="font-bold flex items-center gap-1.5 text-xs text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Hướng dẫn cập nhật lên Google Sheets (Thực hiện trong 1 phút):</span>
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-[11px] leading-relaxed">
                  <li>Bấm nút <b>&quot;Sao Chép Toàn Bộ Mã&quot;</b> màu xanh bên dưới.</li>
                  <li>Mở file Google Sheet <b>963</b> trên trình duyệt, vào menu <b>Tiện ích mở rộng</b> (Extensions) → chọn <b>Apps Script</b>.</li>
                  <li>Xóa sạch toàn bộ nội dung trong tệp <b>Code.gs</b>, sau đó <b>Dán (Ctrl + V)</b> mã vừa sao chép vào.</li>
                  <li>Bấm nút <b>Lưu</b> (biểu tượng 💾 đĩa mềm).</li>
                  <li>Bấm <b>Triển khai</b> (Deploy) → <b>Quản lý bản triển khai</b> (Manage deployments) → Bấm vào <b>Cây bút (Chỉnh sửa)</b> → mục <i>Phiên bản</i> chọn <b>&quot;Phiên bản mới&quot; (New version)</b> → Bấm nút <b>Triển khai (Deploy)</b>.</li>
                </ol>
                <p className="text-[11px] text-amber-800 italic pt-1">
                  * Sau khi triển khai, nếu Sheet 963 của bạn chưa có sẵn các cột <b>KQRasoat</b> hoặc <b>KSudung</b>, script sẽ tự động tạo thêm vào dòng tiêu đề và ghi nhận đầy đủ!
                </p>
              </div>

              {/* Code viewer */}
              <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-900 text-slate-100">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800 text-[11px]">
                  <span className="font-mono text-slate-400">Code.gs (Google Apps Script)</span>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-all cursor-pointer text-[11px]"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                  </button>
                </div>
                <pre className="p-3 font-mono text-[11px] max-h-[280px] overflow-auto text-emerald-400/90 leading-tight">
                  <code>{SCRIPT_TEMPLATE}</code>
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {copiedScript ? '✓ Mã đã được chép vào bộ nhớ tạm!' : 'Sẵn sàng triển khai lên Google Apps Script'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? 'Đã Sao Chép!' : 'Sao Chép Toàn Bộ Mã'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowScriptModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
