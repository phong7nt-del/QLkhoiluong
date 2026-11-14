import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx-js-style';
import { 
  Gauge, Search, Mic, MicOff, RefreshCw, CheckCircle2, 
  AlertTriangle, Clock, ChevronRight, ChevronDown, ChevronUp,
  FileSpreadsheet, Filter, User, Calendar, MapPin, 
  Layers, Check, Sparkles, AlertCircle, Zap, ChevronLeft,
  ChevronsLeft, ChevronsRight, ChevronsDown, ChevronsUp, ShieldAlert, BarChart3, ListFilter, X,
  Calculator, Info, HelpCircle, ArrowRight, Eye, EyeOff, Code2, Copy,
  Sun, ClipboardCheck, CheckCheck, Phone, Download, Upload, FileUp, Lock, Save,
  Camera, Image as ImageIcon, Maximize2, ExternalLink, Trash2
} from 'lucide-react';
import { SCRIPT_TEMPLATE } from './ConfigModal';
import Tab963DienKe from './Tab963DienKe';
import Tab963BaoCaoNgay from './Tab963BaoCaoNgay';
import { PermissionStore } from '../store/PermissionStore';
import { 
  DataStore, 
  Entry963, 
  SheetMember, 
  calculateGioVuot, 
  parseHsn,
  resolveHsn,
  calculateSlVuotKhongDoXa,
  calculateSlVuotCoDoXa,
  QuaHanEntry 
} from '../store/DataStore';

/**
 * Nén tối ưu hóa dung lượng ảnh công tơ trước khi tải lên Google Drive
 * Giảm dung lượng siêu nhỏ (~70KB - 130KB) để lưu nhanh, đồng thời giữ kích thước 1200px
 * rõ nét giúp đọc được số hiệu công tơ, chỉ số và sơ đồ đấu dây.
 */
const compressImageFile = (
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.7
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

interface SectionCollapseState {
  tree: boolean;
  customerDetail: boolean;
  calculation: boolean;
  completedList: boolean;
  reportKpi: boolean;
  reportTable: boolean;
  reportNlmt: boolean;
  reportRaSoat: boolean;
  reportQuaHan: boolean;
}

const SECTION_COLLAPSE_STORAGE_KEY = 'tab963_sections_collapse_v3';

export interface ActiveReportSelection {
  source: 'none' | 'ra_soat' | 'tien_do';
  dot?: string;
  kv?: string;
  metric?: string;
  label: string;
  badgeColor?: 'indigo' | 'amber' | 'emerald' | 'rose' | 'slate';
}

interface Tab963Props {
  sessionUser: SheetMember | null;
  refreshToggle?: number;
}

export default function Tab963({ sessionUser, refreshToggle = 0 }: Tab963Props) {
  const [activeSubTab, setActiveSubTab] = useState<'thuc_hien' | 'bao_cao' | 'bao_cao_ngay' | 'dien_ke'>('thuc_hien');
  const [entries, setEntries] = useState<Entry963[]>(() => DataStore.get963Entries());
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Phân quyền Tab 3 Điện Kế: Chỉ cho phép từ Tổ phó, Tổ trưởng trở lên (cấu hình trong tab Hệ thống)
  const canAccessDienKe = useMemo(() => {
    return PermissionStore.hasActionAccess('tab963_dien_ke', sessionUser?.role || '', sessionUser);
  }, [sessionUser]);

  // Tự động chuyển về tab Thực Hiện nếu người dùng không đủ quyền truy cập
  useEffect(() => {
    if (activeSubTab === 'dien_ke' && !canAccessDienKe) {
      setActiveSubTab('thuc_hien');
    }
  }, [activeSubTab, canAccessDienKe]);

  // Section collapse/expand state with localStorage persistence (calculation collapses by default)
  const [collapsedSections, setCollapsedSections] = useState<SectionCollapseState>(() => {
    try {
      const saved = localStorage.getItem(SECTION_COLLAPSE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          tree: parsed.tree ?? true,
          customerDetail: parsed.customerDetail ?? true,
          calculation: parsed.calculation ?? false,
          completedList: parsed.completedList ?? true,
          reportKpi: parsed.reportKpi ?? true,
          reportTable: parsed.reportTable ?? true,
          reportNlmt: parsed.reportNlmt ?? true,
          reportRaSoat: parsed.reportRaSoat ?? true,
          reportQuaHan: parsed.reportQuaHan ?? true,
        };
      }
    } catch {}
    return {
      tree: true,
      customerDetail: true,
      calculation: false, // Mặc định thu gọn phần tính sản lượng cao điểm vượt
      completedList: true,
      reportKpi: true,
      reportTable: true,
      reportNlmt: true,
      reportRaSoat: true,
      reportQuaHan: true,
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
      reportQuaHan: expand,
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

  // Search state - 5 criteria: Mã KH, Tên KH, TI, TU, Chủng loại cần thay (ChungLoaiCanThay)
  type SearchTargetField = 'all' | 'maKh' | 'tenKh' | 'ti' | 'tu' | 'cl';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTarget, setSearchTarget] = useState<SearchTargetField>('all');
  const [searchMode, setSearchMode] = useState<'fuzzy' | 'exact'>('fuzzy');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  // Bottom table view mode: 'completed' (Đã thay xong) vs 'search' (Kết quả tìm kiếm)
  const [bottomTableTab, setBottomTableTab] = useState<'completed' | 'search'>('completed');
  const bottomTableRef = useRef<HTMLDivElement>(null);

  // Column-level filters for the bottom table (Lọc theo từng cột)
  const [tableColFilters, setTableColFilters] = useState<Record<string, string>>({});
  const [activeColFilterDropdown, setActiveColFilterDropdown] = useState<string | null>(null);

  // HSN Audit State (Rà soát hệ số nhân khi treo tháo)
  interface HsnAuditEntry {
    hsnFile: string;
    rawRow?: any;
  }
  const [hsnAuditMap, setHsnAuditMap] = useState<Map<string, HsnAuditEntry> | null>(null);
  const [hsnAuditFileName, setHsnAuditFileName] = useState<string>('');
  const [hsnAuditTotalRows, setHsnAuditTotalRows] = useState<number>(0);
  const [showHsnAuditModal, setShowHsnAuditModal] = useState<boolean>(false);
  const [hsnAuditFilter, setHsnAuditFilter] = useState<'all' | 'pending' | 'diff' | 'missing' | 'match' | 'checked'>('all');
  const [hideCheckedHsn, setHideCheckedHsn] = useState<boolean>(true);
  const [isSavingHsnAudit, setIsSavingHsnAudit] = useState<boolean>(false);
  const hsnFileInputRef = useRef<HTMLInputElement>(null);

  // Form input state
  const [formNv, setFormNv] = useState<string>(sessionUser?.name || '');
  const [formNgayGio, setFormNgayGio] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Meter Photo State (Ảnh công tơ sau khi thay kèm sơ đồ đấu dây)
  const [meterPicBase64, setMeterPicBase64] = useState<string | null>(null);
  const [meterPicSizeKb, setMeterPicSizeKb] = useState<number>(0);
  const [isProcessingPic, setIsProcessingPic] = useState<boolean>(false);
  const [isSubmittingPic, setIsSubmittingPic] = useState<boolean>(false);
  const [addPicModalCustomer, setAddPicModalCustomer] = useState<Entry963 | null>(null);
  const [zoomPicUrl, setZoomPicUrl] = useState<{ url: string; title: string } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getDrivePreviewUrl = (url?: string): string => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('data:image')) return trimmed;
    const match = trimmed.match(/(?:id=|file\/d\/)([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }
    return trimmed;
  };

  const handleProcessImageFile = async (file: File) => {
    if (!file) return;
    setIsProcessingPic(true);
    try {
      const { base64, sizeKb } = await compressImageFile(file, 1200, 1200, 0.7);
      setMeterPicBase64(base64);
      setMeterPicSizeKb(sizeKb);
      const targetMa = addPicModalCustomer?.maKh || selectedCustomer?.maKh || 'KH';
      showToast('info', `Đã nén tối ưu ảnh công tơ: ${sizeKb} KB (tên sẽ lưu: 963_${targetMa}.jpg).`);
    } catch (e: any) {
      console.error('Lỗi nén ảnh:', e);
      showToast('error', 'Không thể xử lý ảnh: ' + (e?.message || 'Có lỗi xảy ra'));
    } finally {
      setIsProcessingPic(false);
    }
  };

  // Lưu bổ sung ảnh công tơ cho khách hàng đã thay xong
  const handleSaveSupplementaryPic = async (targetCustomer?: Entry963) => {
    const cust = targetCustomer || addPicModalCustomer || selectedCustomer;
    if (!cust || !cust.maKh) {
      showToast('error', 'Chưa chọn khách hàng cần bổ sung ảnh.');
      return;
    }
    if (!meterPicBase64) {
      showToast('error', 'Vui lòng chụp hoặc tải ảnh công tơ trước khi lưu.');
      return;
    }

    setIsSubmittingPic(true);
    showToast('info', `Đang tải ảnh công tơ (963_${cust.maKh}.jpg) lên Google Drive...`);

    try {
      const uploadedPicUrl = await DataStore.uploadImageToDrive(
        meterPicBase64,
        `963_${cust.maKh}.jpg`,
        'image/jpeg',
        '1eze4kVWtdUr0gjKSEAB_BKSfm5CNg3fv',
        { maKh: cust.maKh, sheetName: '963' }
      );

      const res = await DataStore.update963Pic(cust.maKh, uploadedPicUrl);
      if (res.error) {
        showToast('error', res.error);
      } else {
        showToast('success', `Đã bổ sung ảnh công tơ cho KH ${cust.maKh} thành công và lưu liên kết vào cột Pic!`);
        setMeterPicBase64(null);
        setMeterPicSizeKb(0);

        if (selectedCustomer && selectedCustomer.maKh === cust.maKh) {
          setSelectedCustomer({
            ...selectedCustomer,
            pic: uploadedPicUrl
          });
        }
        if (addPicModalCustomer && addPicModalCustomer.maKh === cust.maKh) {
          setAddPicModalCustomer(null);
        }
      }
    } catch (err: any) {
      console.error('Lỗi bổ sung ảnh:', err);
      showToast('error', 'Lỗi tải ảnh lên Google Drive: ' + (err?.message || 'Có lỗi xảy ra'));
    } finally {
      setIsSubmittingPic(false);
    }
  };

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
  const [showRaSoatDetails, setShowRaSoatDetails] = useState(true);

  // Sub-report Quá Hạn (so khớp sheet QuaHan_Nam)
  const [quaHanFilter, setQuaHanFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [quaHanPage, setQuaHanPage] = useState(1);
  const [quaHanSearch, setQuaHanSearch] = useState('');
  const [showQuaHanDetails, setShowQuaHanDetails] = useState(true);
  const [quaHanNamEntries, setQuaHanNamEntries] = useState<QuaHanEntry[]>(() => DataStore.getQuaHanNamEntries());

  useEffect(() => {
    let isMounted = true;
    const loadQuaHan = async () => {
      try {
        const cached = DataStore.getQuaHanNamEntries();
        if (cached && cached.length > 0) {
          if (isMounted) setQuaHanNamEntries(cached);
        } else {
          const fresh = await DataStore.fetchQuaHanNamData();
          if (isMounted && fresh && fresh.length > 0) {
            setQuaHanNamEntries(fresh);
          }
        }
      } catch (e) {
        console.warn('Could not load QuaHan_Nam for Tab963', e);
      }
    };
    loadQuaHan();
    return () => { isMounted = false; };
  }, [refreshToggle]);

  // Set các Mã Khách Hàng (MA_KHANG) từ sheet QuaHan_Nam
  const quaHanMaKhSet = useMemo(() => {
    const set = new Set<string>();
    quaHanNamEntries.forEach(q => {
      const code = String(q.MA_KHANG || '').trim().toUpperCase();
      if (code) set.add(code);
    });
    return set;
  }, [quaHanNamEntries]);

  // Hàm kiểm tra khách hàng có thuộc danh sách quá hạn hay không (so khớp MA_KHANG ở sheet 963 và QuaHan_Nam)
  const isEntryQuaHan = (e: Entry963) => {
    const code = String(e.maKh || '').trim().toUpperCase();
    return Boolean(code && quaHanMaKhSet.has(code));
  };

  // Drill-down selection from either Báo cáo tiến độ thay OR Báo cáo kết quả rà soát thu hồi
  const [activeReportSelection, setActiveReportSelection] = useState<ActiveReportSelection>({
    source: 'none',
    label: 'Tất cả khách hàng diện thu hồi & rà soát',
    badgeColor: 'indigo'
  });
  const detailTableRef = useRef<HTMLDivElement>(null);

  const handleDrillDown = (selection: ActiveReportSelection) => {
    setActiveReportSelection(selection);
    setShowRaSoatDetails(true);
    setCollapsedSections(prev => ({ ...prev, reportRaSoat: true }));
    setRaSoatFilter('all');
    setRaSoatPage(1);
    setTimeout(() => {
      detailTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  const handleClearDrillDown = () => {
    setActiveReportSelection({
      source: 'none',
      label: 'Tất cả khách hàng diện thu hồi & rà soát',
      badgeColor: 'indigo'
    });
    setRaSoatFilter('all');
    setRaSoatSearch('');
    setRaSoatPage(1);
  };

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

      // Reset ảnh công tơ mới khi chọn hoặc đổi khách hàng
      setMeterPicBase64(null);
      setMeterPicSizeKb(0);

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
        showToast('info', 'Đang lắng nghe... Hãy nói Mã KH, Tên KH, TI, TU hoặc Chủng loại cần thay');
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

  // Helper to extract TI and TU values with multiple fallbacks
  const getTiValue = (item: Entry963): string => {
    return String(item.tySoTi || item.raw?.['ty0so0_TI'] || item.raw?.['TI'] || item.raw?.['TSO_TI'] || item.raw?.['TYSO_TI'] || item.raw?.['ty_so_ti'] || '').trim();
  };

  const getTuValue = (item: Entry963): string => {
    return String(item.tySoTu || item.raw?.['ty so_TU'] || item.raw?.['TU'] || item.raw?.['TSO_TU'] || item.raw?.['TYSO_TU'] || item.raw?.['ty_so_tu'] || '').trim();
  };

  // Matcher for the 5 criteria: Mã KH, Tên KH, TI, TU, Chủng loại cần thay
  const matchesSearchCriteria = (
    item: Entry963,
    query: string,
    mode: 'fuzzy' | 'exact',
    target: SearchTargetField
  ): boolean => {
    if (!query.trim()) return true;
    const q = query.trim();
    const qLower = q.toLowerCase();
    const qNorm = normalize(q);

    const maKh = item.maKh || '';
    const tenKh = item.tenKh || '';
    const ti = getTiValue(item);
    const tu = getTuValue(item);
    const cl = item.chungLoaiCanThay || '';

    const checkField = (val: string): boolean => {
      if (!val) return false;
      if (mode === 'exact') {
        return val.toLowerCase() === qLower || normalize(val) === qNorm;
      }
      return normalize(val).includes(qNorm);
    };

    if (target === 'maKh') return checkField(maKh);
    if (target === 'tenKh') return checkField(tenKh);
    if (target === 'ti') return checkField(ti);
    if (target === 'tu') return checkField(tu);
    if (target === 'cl') return checkField(cl);

    // 'all': matches any of the 5 criteria
    return checkField(maKh) || checkField(tenKh) || checkField(ti) || checkField(tu) || checkField(cl);
  };

  // Filtered entries based on Search Query (5 criteria: Mã KH, Tên KH, TI, TU, Chủng loại cần thay)
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    return entries.filter(item => matchesSearchCriteria(item, searchQuery, searchMode, searchTarget));
  }, [entries, searchQuery, searchMode, searchTarget]);

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

  // Completed customers list for the bottom table based on left tree selection and search query
  const completedCustomersList = useMemo(() => {
    return entries.filter(item => {
      const isDone = item.ketQua && item.ketQua.trim().toLowerCase().includes('xong');
      if (!isDone) return false;

      if (selectedDot && item.dot !== selectedDot) return false;
      if (selectedKv && item.kv !== selectedKv) return false;

      // Filter by search query if user entered search criteria (Mã KH, Tên KH, TI, TU, Chủng loại cần thay)
      if (searchQuery.trim()) {
        if (!matchesSearchCriteria(item, searchQuery, searchMode, searchTarget)) {
          return false;
        }
      }

      return true;
    });
  }, [entries, selectedDot, selectedKv, searchQuery, searchMode, searchTarget]);

  // Unique list and counts of ChungLoaiCanThay in the selected scope (Dot / KV)
  const completedChungLoaiSummary = useMemo(() => {
    const inScope = entries.filter(item => {
      const isDone = item.ketQua && item.ketQua.trim().toLowerCase().includes('xong');
      if (!isDone) return false;
      if (selectedDot && item.dot !== selectedDot) return false;
      if (selectedKv && item.kv !== selectedKv) return false;
      return true;
    });

    const map = new Map<string, number>();
    inScope.forEach(item => {
      const cl = (item.chungLoaiCanThay || '').trim() || 'Chưa xác định';
      map.set(cl, (map.get(cl) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [entries, selectedDot, selectedKv]);

  // Helper to normalize HSN for numerical comparison (e.g. "1.0" -> "1", "020" -> "20")
  const normalizeHsnVal = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null || val === '') return '';
    const cleaned = String(val).trim().replace(',', '.');
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      return String(num);
    }
    return cleaned.toLowerCase();
  };

  // Evaluate HSN Audit status for a given customer
  const getHsnAuditResult = (item: Entry963) => {
    // 1. Khách hàng đã được kiểm soát HSN từ trước (cột KiemSoatHSN đã có giá trị)
    if (item.kiemSoatHsn && item.kiemSoatHsn.trim() !== '') {
      const hsn963 = String(item.hsn !== undefined && item.hsn !== '' ? item.hsn : resolveHsn(item)).trim();
      return {
        status: 'checked' as const,
        hsn963,
        hsnFile: '',
        label: `Đã kiểm soát HSN: ${item.kiemSoatHsn}`,
        shortLabel: `Đã KS (${item.kiemSoatHsn})`,
        color: 'blue'
      };
    }

    if (!hsnAuditMap) return null;

    const maKhRaw = (item.maKh || '').trim();
    const maKhNorm = normalize(maKhRaw).toUpperCase();
    const hsn963 = String(item.hsn !== undefined && item.hsn !== '' ? item.hsn : resolveHsn(item)).trim();

    // Look up in audit map (exact or normalized)
    const entry = hsnAuditMap.get(maKhNorm) || hsnAuditMap.get(maKhRaw.toUpperCase());

    if (!entry) {
      return {
        status: 'missing' as const,
        hsn963,
        hsnFile: '—',
        label: 'Thiếu trong file đối soát',
        shortLabel: 'Thiếu trong file',
        color: 'rose'
      };
    }

    const hsnFile = String(entry.hsnFile || '').trim();
    const norm963 = normalizeHsnVal(hsn963);
    const normFile = normalizeHsnVal(hsnFile);

    if (norm963 === normFile) {
      return {
        status: 'match' as const,
        hsn963,
        hsnFile,
        label: `Khớp HSN (${hsn963 || norm963})`,
        shortLabel: `Khớp (${hsn963 || norm963})`,
        color: 'emerald'
      };
    } else {
      return {
        status: 'diff' as const,
        hsn963,
        hsnFile,
        label: `Sai HSN (HT: ${hsn963 || 'Trống'} ≠ File: ${hsnFile || 'Trống'})`,
        shortLabel: `Sai: ${hsn963 || '?'} ≠ ${hsnFile || '?'}`,
        color: 'amber'
      };
    }
  };

  // Compute HSN audit statistics for completed list
  const hsnAuditStats = useMemo(() => {
    let checkedCount = 0;
    let pendingCount = 0;
    let matchCount = 0;
    let diffCount = 0;
    let missingCount = 0;

    completedCustomersList.forEach(c => {
      const isChecked = Boolean(c.kiemSoatHsn && c.kiemSoatHsn.trim() !== '');
      if (isChecked) {
        checkedCount++;
      } else {
        pendingCount++;
        if (hsnAuditMap) {
          const res = getHsnAuditResult(c);
          if (res?.status === 'match') matchCount++;
          else if (res?.status === 'diff') diffCount++;
          else if (res?.status === 'missing') missingCount++;
        }
      }
    });

    const total = completedCustomersList.length;
    return {
      total,
      checkedCount,
      pendingCount,
      matchCount,
      diffCount,
      missingCount,
      checkedPercent: total > 0 ? Math.round((checkedCount / total) * 100) : 0,
      matchPercent: total > 0 ? Math.round((matchCount / total) * 100) : 0,
      diffPercent: total > 0 ? Math.round((diffCount / total) * 100) : 0,
      missingPercent: total > 0 ? Math.round((missingCount / total) * 100) : 0
    };
  }, [hsnAuditMap, completedCustomersList]);

  const getRaw963Field = (item: Entry963, keys: string[]): string => {
    if (!item?.raw) return '';
    for (const k of keys) {
      if (item.raw[k] !== undefined && item.raw[k] !== null && String(item.raw[k]).trim() !== '') {
        const val = String(item.raw[k]).trim();
        return val.startsWith("'") ? val.substring(1).trim() : val;
      }
    }
    const rKeys = Object.keys(item.raw);
    for (const opt of keys) {
      const optClean = opt.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const rk of rKeys) {
        if (rk.toLowerCase().replace(/[^a-z0-9]/g, '') === optClean) {
          const val = String(item.raw[rk] ?? '').trim();
          if (val !== '') return val.startsWith("'") ? val.substring(1).trim() : val;
        }
      }
    }
    return '';
  };

  // Distinct options for column filters
  const colFilterOptions = useMemo(() => {
    const baseList = bottomTableTab === 'search' ? filteredEntries : completedCustomersList;
    const extractUnique = (fn: (item: Entry963) => string | undefined) => {
      const s = new Set<string>();
      baseList.forEach(item => {
        const val = fn(item);
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          s.add(String(val).trim());
        }
      });
      return Array.from(s).sort((a, b) => a.localeCompare(b, 'vi'));
    };

    return {
      trangThai: ['Đã thay xong', 'Thu hồi', 'Chưa thay'],
      chungLoaiCanThay: extractUnique(item => item.chungLoaiCanThay),
      soPha: ['1 Pha', '3 Pha'],
      phien: ['TT (Trực tiếp)', 'GT (Gián tiếp)'],
      cap: extractUnique(item => item.cap || getRaw963Field(item, ['Cap', 'CAP', 'Cấp', 'cap'])),
      kv: extractUnique(item => item.kv),
      dot: extractUnique(item => item.dot),
      hsn: extractUnique(item => String(item.hsn !== undefined && item.hsn !== '' ? item.hsn : resolveHsn(item))),
      raSoatHsn: ['Khớp HSN', 'Sai lệch HSN', 'Chưa kiểm soát'],
      nv: extractUnique(item => item.nv),
      kqRaSoat: extractUnique(item => item.kqRaSoat),
      pic: ['Đã có ảnh', 'Chưa có ảnh']
    };
  }, [bottomTableTab, filteredEntries, completedCustomersList]);

  // Active list for bottom table (Completed customers vs Search results), filtered by HSN audit if selected & column filters
  const activeBottomList = useMemo(() => {
    let list = bottomTableTab === 'search' ? filteredEntries : completedCustomersList;

    // Khi ở tab khách hàng đã thay xong: Nếu bật "Ẩn KH đã kiểm soát HSN"
    if (bottomTableTab === 'completed' && hideCheckedHsn) {
      if (hsnAuditFilter !== 'checked' && hsnAuditFilter !== 'all') {
        list = list.filter(item => !item.kiemSoatHsn || item.kiemSoatHsn.trim() === '');
      }
    }

    if (hsnAuditMap) {
      if (hsnAuditFilter === 'pending') {
        list = list.filter(item => !item.kiemSoatHsn || item.kiemSoatHsn.trim() === '');
      } else if (hsnAuditFilter === 'checked') {
        list = list.filter(item => Boolean(item.kiemSoatHsn && item.kiemSoatHsn.trim() !== ''));
      } else if (hsnAuditFilter !== 'all') {
        list = list.filter(item => {
          const res = getHsnAuditResult(item);
          if (!res) return false;
          return res.status === hsnAuditFilter;
        });
      }
    }

    // Áp dụng bộ lọc từng cột (tableColFilters)
    const activeFilters = (Object.entries(tableColFilters) as [string, string][]).filter(([_, v]) => typeof v === 'string' && v.trim() !== '');
    if (activeFilters.length > 0) {
      list = list.filter(item => {
        return activeFilters.every(([key, rawFilterVal]) => {
          const val = String(rawFilterVal || '').trim().toLowerCase();
          if (key === 'trangThai') {
            const isDone = Boolean(item.ketQua && item.ketQua.trim().toLowerCase().includes('xong'));
            const isThuHoi = Boolean(item.kSuDung && item.kSuDung.trim().toLowerCase().includes('thu hồi'));
            if (val.includes('thu hồi')) return isThuHoi;
            if (val.includes('xong')) return isDone && !isThuHoi;
            if (val.includes('chưa thay')) return !isDone && !isThuHoi;
            const statusStr = isThuHoi ? 'thu hồi' : isDone ? 'đã thay xong' : 'chưa thay';
            return statusStr.includes(val);
          }
          if (key === 'maKh') return (item.maKh || '').toLowerCase().includes(val);
          if (key === 'tenKh') return (item.tenKh || '').toLowerCase().includes(val);
          if (key === 'sdt') return (item.sdt || '').toLowerCase().includes(val);
          if (key === 'chungLoaiCanThay') return (item.chungLoaiCanThay || '').toLowerCase().includes(val);
          if (key === 'soPha') {
            const sp = String(item.soPha || item.raw?.['SO_PHA'] || item.raw?.['Số pha'] || item.raw?.['So_pha'] || '').trim().toLowerCase();
            if (val.includes('1')) return sp === '1' || sp.includes('1 pha') || sp === '1p';
            if (val.includes('3')) return sp === '3' || sp.includes('3 pha') || sp === '3p';
            return sp.includes(val);
          }
          if (key === 'phien') {
            const ph = String(item.phien || item.raw?.['PHIEN'] || item.raw?.['Phiên'] || item.raw?.['Phien'] || '').trim().toLowerCase();
            if (val.includes('tt') || val.includes('trực')) return ph === 'tt' || ph.includes('tt') || ph.includes('trực tiếp');
            if (val.includes('gt') || val.includes('gián')) return ph === 'gt' || ph.includes('gt') || ph.includes('gián tiếp');
            return ph.includes(val);
          }
          if (key === 'cap') {
            const capVal = String(item.cap || getRaw963Field(item, ['Cap', 'CAP', 'Cấp', 'cap'])).trim().toLowerCase();
            return capVal.includes(val);
          }
          if (key === 'titu') {
            const ti = item.tySoTi || item.raw?.['ty0so0_TI'] || item.raw?.['TI'] || item.raw?.['TSO_TI'] || '';
            const tu = item.tySoTu || item.raw?.['ty so_TU'] || item.raw?.['TU'] || item.raw?.['TSO_TU'] || '';
            return `${ti} ${tu}`.toLowerCase().includes(val);
          }
          if (key === 'kv') return (item.kv || '').toLowerCase().includes(val);
          if (key === 'dot') return String(item.dot || '').toLowerCase().includes(val);
          if (key === 'hsn') {
            const hsnVal = String(item.hsn !== undefined && item.hsn !== '' ? item.hsn : resolveHsn(item)).toLowerCase();
            return hsnVal.includes(val);
          }
          if (key === 'raSoatHsn') {
            const audit = getHsnAuditResult(item);
            const auditStr = (audit ? audit.label : (item.kiemSoatHsn || '')).toLowerCase();
            return auditStr.includes(val);
          }
          if (key === 'nv') return (item.nv || '').toLowerCase().includes(val);
          if (key === 'ngayGio') return (item.ngayGio || '').toLowerCase().includes(val);
          if (key === 'kqRaSoat') return (item.kqRaSoat || '').toLowerCase().includes(val);
          if (key === 'pic') {
            if (val.includes('đã') || val.includes('có')) return Boolean(item.pic && item.pic.trim() !== '');
            if (val.includes('chưa') || val.includes('không')) return !item.pic || item.pic.trim() === '';
            return (item.pic || '').toLowerCase().includes(val);
          }
          return true;
        });
      });
    }

    return list;
  }, [bottomTableTab, filteredEntries, completedCustomersList, hsnAuditMap, hsnAuditFilter, hideCheckedHsn, tableColFilters]);

  // Reset bottom table page when filter or tab changes
  useEffect(() => {
    setCompletedPage(1);
  }, [selectedDot, selectedKv, searchQuery, searchTarget, searchMode, bottomTableTab, hsnAuditFilter, tableColFilters]);

  const totalCompletedPages = Math.max(1, Math.ceil(activeBottomList.length / PAGE_SIZE));
  const currentCompletedPage = Math.min(completedPage, totalCompletedPages);
  const paginatedCompletedList = useMemo(() => {
    const start = (currentCompletedPage - 1) * PAGE_SIZE;
    return activeBottomList.slice(start, start + PAGE_SIZE);
  }, [activeBottomList, currentCompletedPage]);

  // Handler to show search results in the bottom table and scroll down smoothly
  const handleShowSearchResultsInTable = () => {
    setBottomTableTab('search');
    setCollapsedSections(prev => ({ ...prev, completedList: true }));
    if (bottomTableRef.current) {
      bottomTableRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    showToast('info', `Đang hiển thị danh sách ${filteredEntries.length} khách hàng tìm kiếm ở bảng phía dưới`);
  };

  // Handle HSN audit file upload (.xlsx, .xls, .csv)
  const handleHsnAuditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!json || json.length === 0) {
          alert('File Excel không có dữ liệu để đối soát!');
          return;
        }

        const sampleRow = json[0];
        const keys = Object.keys(sampleRow);

        // Aliases for MaKH: MA_KHANG, MA_KH, Mã KH, etc.
        const maKhAliases = ['ma_khang', 'makhang', 'ma_kh', 'makh', 'mã kh', 'mã khách hàng', 'mã_kh', 'ma kh', 'customer_id'];
        // Aliases for HSN: HSN, HSNHAN_TREO, HSNHAN, etc.
        const hsnAliases = ['hsnhan_treo', 'hsn_treo', 'hsnhan', 'hsn', 'hệ số nhân', 'he_so_nhan', 'hsn_cto', 'hsn treo', 'hsnhan treo'];

        const findKey = (rowKeys: string[], aliases: string[]) => {
          return rowKeys.find(k => {
            const normKey = normalize(k).replace(/[\s_-]+/g, '');
            return aliases.some(a => {
              const normA = normalize(a).replace(/[\s_-]+/g, '');
              return normKey === normA || normKey.includes(normA);
            });
          });
        };

        const foundMaKhCol = findKey(keys, maKhAliases);
        const foundHsnCol = findKey(keys, hsnAliases);

        if (!foundMaKhCol) {
          alert('Không tìm thấy cột Mã khách hàng (MA_KHANG hoặc MA_KH) trong file! Các cột hiện có: ' + keys.join(', '));
          return;
        }

        if (!foundHsnCol) {
          alert('Không tìm thấy cột Hệ số nhân (HSN, HSNHAN_TREO hoặc HSNHAN) trong file! Các cột hiện có: ' + keys.join(', '));
          return;
        }

        const auditMap = new Map<string, HsnAuditEntry>();
        json.forEach(row => {
          const rawMaKh = String(row[foundMaKhCol] || '').trim();
          const rawHsn = String(row[foundHsnCol] !== undefined ? row[foundHsnCol] : '').trim();
          if (rawMaKh) {
            auditMap.set(rawMaKh.toUpperCase(), { hsnFile: rawHsn, rawRow: row });
            auditMap.set(normalize(rawMaKh).toUpperCase(), { hsnFile: rawHsn, rawRow: row });
          }
        });

        setHsnAuditMap(auditMap);
        setHsnAuditFileName(file.name);
        setHsnAuditTotalRows(json.length);
        setShowHsnAuditModal(false);
        setHsnAuditFilter('all');
        showToast('success', `Đã tải ${json.length} dòng từ file "${file.name}". Hoàn tất so khớp HSN!`);
      } catch (err: any) {
        console.error('Lỗi khi đọc file rà soát HSN:', err);
        alert('Lỗi đọc file: ' + (err.message || String(err)));
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
  };

  // Download template for HSN audit
  const handleDownloadHsnTemplate = () => {
    const sampleRows = [
      { 'MA_KHANG': 'PK01000123456', 'HSNHAN_TREO': 1, 'GHI_CHU': 'Ví dụ công tơ 1 pha trực tiếp' },
      { 'MA_KHANG': 'BR02000654321', 'HSNHAN_TREO': 20, 'GHI_CHU': 'Ví dụ công tơ 3 pha gián tiếp qua TI 100/5' },
      { 'MA_KHANG': 'PM03000987654', 'HSNHAN_TREO': 40, 'GHI_CHU': 'Ví dụ công tơ 3 pha gián tiếp qua TI 200/5' }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_DoiSoat_HSN');
    XLSX.writeFile(wb, 'Mau_File_DoiSoat_HSN_Treo.xlsx');
    showToast('info', 'Đã tải xuống file mẫu đối soát HSN!');
  };

  // Handle saving HSN reconciliation results into column KiemSoatHSN of Sheet 963
  const handleSaveHsnAudit = async (specificMaKh?: string) => {
    let targets: Entry963[] = [];

    if (specificMaKh) {
      const found = completedCustomersList.find(c => c.maKh === specificMaKh);
      if (found) targets = [found];
    } else {
      // Lưu toàn bộ khách hàng khớp HSN chưa được kiểm soát
      targets = completedCustomersList.filter(c => {
        if (c.kiemSoatHsn && c.kiemSoatHsn.trim() !== '') return false;
        const res = getHsnAuditResult(c);
        return res?.status === 'match';
      });
    }

    if (targets.length === 0) {
      alert('Không có khách hàng nào khớp HSN cần lưu!');
      return;
    }

    const confirmMsg = specificMaKh
      ? `Bạn có chắc muốn lưu kết quả kiểm soát HSN cho khách hàng ${specificMaKh} vào cột "KiemSoatHSN" trên Sheet 963?`
      : `Hệ thống tìm thấy ${targets.length} khách hàng có HSN khớp với file đối soát.\nBạn có chắc chắn muốn lưu kết quả vào cột "KiemSoatHSN" trên Sheet 963 và loại khỏi danh sách cần đối soát?`;

    if (!confirm(confirmMsg)) return;

    setIsSavingHsnAudit(true);
    try {
      const updates = targets.map(t => ({
        maKh: t.maKh,
        kiemSoatHsn: 'Khớp HSN'
      }));

      const res = await DataStore.save963AuditHsn(updates);
      if (res.success) {
        setEntries(DataStore.get963Entries());
        showToast('success', `Đã lưu thành công kết quả đối soát HSN cho ${res.updatedCount} khách hàng vào Sheet 963!`);
      } else {
        showToast('error', res.error || 'Lỗi khi lưu đối soát HSN');
      }
    } catch (err: any) {
      showToast('error', 'Lỗi: ' + (err.message || 'Không thể lưu đối soát HSN'));
    } finally {
      setIsSavingHsnAudit(false);
    }
  };

  // Handle confirming meter replacement and saving peak excess indicators into Sheet 963
  const handleConfirmReplacement = async (source: 'confirm' | 'calculation' = 'confirm') => {
    if (!selectedCustomer) {
      alert('Vui lòng chọn khách hàng cần thay công tơ từ sơ đồ cây bên trái!');
      return;
    }

    // Constraint 1: Customers already completed (ketQua === 'Xong') CANNOT be updated anymore
    if (selectedCustomer.ketQua && selectedCustomer.ketQua.trim().toLowerCase().includes('xong')) {
      alert('LƯU Ý: Khách hàng này đã thay công tơ xong (Kết quả: Xong), không cho phép cập nhật lại!');
      return;
    }

    // Constraint 2: Customers with KSuDung === 'Thu hồi' CANNOT be replaced
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
      // 1. Tải ảnh công tơ lên Google Drive (Folder ID: 1eze4kVWtdUr0gjKSEAB_BKSfm5CNg3fv) nếu có ảnh mới
      let uploadedPicUrl = selectedCustomer.pic || '';
      if (meterPicBase64) {
        showToast('info', `Đang tải ảnh công tơ (963_${selectedCustomer.maKh}.jpg) lên Google Drive...`);
        try {
          uploadedPicUrl = await DataStore.uploadImageToDrive(
            meterPicBase64,
            `963_${selectedCustomer.maKh}.jpg`,
            'image/jpeg',
            '1eze4kVWtdUr0gjKSEAB_BKSfm5CNg3fv',
            { maKh: selectedCustomer.maKh, sheetName: '963' }
          );
        } catch (uploadErr: any) {
          console.warn('Lỗi khi tải ảnh công tơ lên Drive:', uploadErr);
          const proceed = confirm(
            `Tải ảnh lên Google Drive chưa thành công (${uploadErr?.message || 'Lỗi mạng'}).\n\nBạn có muốn tiếp tục lưu xác nhận thay công tơ vào Sheet 963 không?`
          );
          if (!proceed) {
            setIsSubmitting(false);
            return;
          }
        }
      }

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
        slVuot: slVuotStr,
        pic: uploadedPicUrl
      });

      if (res.error) {
        showToast('error', res.error);
      } else {
        // Reset local state ảnh sau khi lưu thành công
        setMeterPicBase64(null);
        setMeterPicSizeKb(0);

        const metricSummary = [
          `HSN: ${calcHsn}`,
          uploadedPicUrl ? 'Ảnh: Đã lưu Drive' : null,
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

  // Export Tab 1 bottom table (Completed customers or Search results) to Excel
  const handleExportCompletedExcel = () => {
    if (activeBottomList.length === 0) {
      alert(`Không có dữ liệu ${bottomTableTab === 'search' ? 'kết quả tìm kiếm' : 'đã thay xong'} để xuất file Excel!`);
      return;
    }

    const exportRows = activeBottomList.map((c, idx) => {
      const isDone = c.ketQua && c.ketQua.trim().toLowerCase().includes('xong');
      const isThuHoi = c.kSuDung && c.kSuDung.trim().toLowerCase().includes('thu hồi');
      const statusStr = isThuHoi ? 'Thu hồi' : isDone ? 'Đã thay xong' : 'Chưa thay';
      const auditRes = hsnAuditMap ? getHsnAuditResult(c) : null;

      const rowData: Record<string, any> = {
        'STT': idx + 1,
        'Trạng Thái': statusStr,
      };

      if (hsnAuditMap) {
        rowData['Cảnh Báo Rà Soát HSN'] = auditRes ? auditRes.label : 'Chưa rõ';
        rowData['HSN Trong File Đối Soát'] = auditRes ? auditRes.hsnFile : '';
      }
      rowData['Kiểm Soát HSN (KiemSoatHSN)'] = c.kiemSoatHsn || '';

      rowData['Mã Khách Hàng'] = c.maKh;
      rowData['Tên Khách Hàng'] = c.tenKh;
      rowData['Số Điện Thoại (SĐT)'] = c.sdt || '';
      rowData['Chủng Loại Cần Thay'] = c.chungLoaiCanThay || '';
      rowData['Hệ Số Nhân (HSN Hiện Tại)'] = c.hsn !== undefined && c.hsn !== '' ? c.hsn : resolveHsn(c);
      rowData['Tỷ Số TU'] = c.tySoTu || '';
      rowData['Tỷ Số TI'] = c.tySoTi || '';
      rowData['Khu Vực'] = c.kv;
      rowData['Đợt'] = c.dot;
      rowData['Địa Chỉ'] = c.diaChi || '';
      rowData['Loại Công Tơ'] = c.loaiCto || '';
      rowData['Số Pha (So_pha)'] = c.soPha || c.raw?.['SO_PHA'] || c.raw?.['Số pha'] || c.raw?.['So_pha'] || '';
      rowData['Phiên (Phien)'] = c.phien || c.raw?.['PHIEN'] || c.raw?.['Phiên'] || c.raw?.['Phien'] || '';
      rowData['Cấp (Cap)'] = c.cap || getRaw963Field(c, ['Cap', 'CAP', 'Cấp', 'cap']) || '';
      rowData['MA_DS'] = c.maDs || getRaw963Field(c, ['MA_DS', 'Ma_DS', 'MADS', 'Mã ĐS', 'MaDS']) || '';
      rowData['MA_Tram'] = c.maTram || getRaw963Field(c, ['MA_Tram', 'MA_TRAM', 'Ma_Tram', 'MATRAM', 'Mã trạm', 'MaTram']) || '';
      rowData['No.'] = c.no || getRaw963Field(c, ['No.', 'No', 'NO', 'NO.']) || '';
      rowData['Công Nghệ'] = c.congNghe || '';
      rowData['Đo Xa'] = c.doXa || '';
      rowData['NV Thực Hiện'] = c.nv || '';
      rowData['Ngày Giờ Thay'] = c.ngayGio || '';
      rowData['Kết Quả'] = c.ketQua || (isDone ? 'Xong' : '');
      rowData['Kết Quả Rà Soát (KQRaSoat)'] = c.kqRaSoat || '';
      rowData['Ảnh Công Tơ (Pic)'] = c.pic || '';

      return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    const sheetName = bottomTableTab === 'search' ? 'KetQuaTimKiem' : 'DanhSachThayXong';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const filterInfo = bottomTableTab === 'search'
      ? (searchQuery ? `_Tim_${normalize(searchQuery)}` : '_TimKiem_TatCa')
      : (selectedKv ? `_KV_${selectedKv}` : selectedDot ? `_Dot_${selectedDot}` : '_TatCa');
    XLSX.writeFile(wb, `DS_${sheetName}_QD963${filterInfo}_${getCurrentDateTimeStr().replace(/[/ :]/g, '_')}.xlsx`);
    showToast('success', `Đã xuất file Excel ${bottomTableTab === 'search' ? 'kết quả tìm kiếm' : 'danh sách thay xong'} (${activeBottomList.length} KH) thành công!`);
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
    // Bổ sung Quá Hạn (Sheet QuaHan_Nam)
    quaHanTong: number;
    quaHanDaThay: number;
    quaHanChuaThay: number;
    quaHanTyLe: number;
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
      quaHanTong: number;
      quaHanDaThay: number;
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
      const isQh = isEntryQuaHan(e);

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
          rsChuaRaSoat: 0,
          quaHanTong: 0,
          quaHanDaThay: 0
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

      if (isQh) {
        item.quaHanTong++;
        if (isDone) item.quaHanDaThay++;
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

        const quaHanChuaThay = Math.max(0, item.quaHanTong - item.quaHanDaThay);
        const quaHanTyLe = item.quaHanTong > 0 ? Math.round((item.quaHanDaThay / item.quaHanTong) * 1000) / 10 : 0;

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
          rsTyLe,
          quaHanTong: item.quaHanTong,
          quaHanDaThay: item.quaHanDaThay,
          quaHanChuaThay,
          quaHanTyLe
        });
      });
    });

    return rows;
  }, [entries, quaHanMaKhSet]);

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

    let quaHanTong = 0;
    let quaHanDaThay = 0;
    let quaHanChuaThay = 0;

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

      quaHanTong += r.quaHanTong;
      quaHanDaThay += r.quaHanDaThay;
      quaHanChuaThay += r.quaHanChuaThay;
    });

    const tyLeChung = canThay > 0 ? Math.round((daThay / canThay) * 1000) / 10 : 0;
    const nlmtTyLeChung = nlmtTong > 0 ? Math.round((nlmtDaThay / nlmtTong) * 1000) / 10 : 0;
    const rsTyLeChung = thuHoiScopeTong > 0 ? Math.round((rsDaRaSoat / thuHoiScopeTong) * 1000) / 10 : 0;
    const quaHanTyLeChung = quaHanTong > 0 ? Math.round((quaHanDaThay / quaHanTong) * 1000) / 10 : 0;

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
      rsTyLeChung,
      // Quá hạn Totals
      quaHanTong,
      quaHanDaThay,
      quaHanChuaThay,
      quaHanTyLeChung
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

  // Danh sách toàn bộ khách hàng quá hạn (so khớp MA_KHANG ở sheet 963 và sheet QuaHan_Nam)
  const quaHanCustomerList = useMemo(() => {
    return entries.filter(e => isEntryQuaHan(e));
  }, [entries, quaHanMaKhSet]);

  // Danh sách khách hàng quá hạn đã lọc theo bộ lọc & tìm kiếm
  const filteredQuaHanCustomers = useMemo(() => {
    return quaHanCustomerList.filter(item => {
      const isDone = Boolean(item.ketQua && item.ketQua.trim().toLowerCase().includes('xong'));
      if (quaHanFilter === 'completed' && !isDone) return false;
      if (quaHanFilter === 'pending' && isDone) return false;

      if (quaHanSearch.trim()) {
        const q = quaHanSearch.trim().toLowerCase();
        const match =
          (item.maKh && item.maKh.toLowerCase().includes(q)) ||
          (item.tenKh && item.tenKh.toLowerCase().includes(q)) ||
          (item.sdt && item.sdt.toLowerCase().includes(q)) ||
          (item.diaChi && item.diaChi.toLowerCase().includes(q)) ||
          (item.kv && item.kv.toLowerCase().includes(q)) ||
          (item.chungLoaiCanThay && item.chungLoaiCanThay.toLowerCase().includes(q)) ||
          (item.dot && String(item.dot).toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [quaHanCustomerList, quaHanFilter, quaHanSearch]);

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

  // Bộ lọc danh sách chi tiết (hỗ trợ drill-down từ Báo cáo tiến độ thay & Báo cáo rà soát thu hồi)
  const filteredRaSoatCustomers = useMemo(() => {
    let baseList: Entry963[] = [];

    if (activeReportSelection.source === 'tien_do') {
      baseList = entries.filter(item => {
        // Lọc theo đợt nếu có
        if (activeReportSelection.dot && activeReportSelection.dot !== 'all') {
          const itemDot = item.dot || '1';
          if (String(itemDot) !== String(activeReportSelection.dot)) return false;
        }
        // Lọc theo khu vực nếu có
        if (activeReportSelection.kv && activeReportSelection.kv !== 'all') {
          const itemKv = item.kv || 'Khác';
          if (itemKv !== activeReportSelection.kv) return false;
        }

        const isDone = Boolean(item.ketQua && item.ketQua.trim().toLowerCase().includes('xong'));
        const isThuHoi = Boolean(item.kSuDung && item.kSuDung.trim().toLowerCase().includes('thu hồi'));
        const isNlmt = Boolean(item.nlmt && (item.nlmt.trim().toLowerCase() === 'x' || item.nlmt.trim().toLowerCase().includes('x')));
        const slv = typeof item.slVuot === 'number' ? item.slVuot : (parseFloat(String(item.slVuot || 0)) || 0);
        const hasKq = Boolean(item.kqRaSoat && item.kqRaSoat.trim());
        const kqNorm = (item.kqRaSoat || '').trim().toLowerCase();
        const isThuHoiScope = isThuHoi || hasKq;

        switch (activeReportSelection.metric) {
          case 'tong_kh':
            return true;
          case 'thu_hoi':
            return isThuHoi;
          case 'can_thay':
            return !isThuHoi;
          case 'da_thay':
            return isDone;
          case 'chua_thay':
            return !isThuHoi && !isDone;
          case 'nlmt_all':
            return isNlmt;
          case 'nlmt_da_thay':
            return isNlmt && isDone;
          case 'nlmt_chua_thay':
            return isNlmt && !isDone;
          case 'sl_vuot':
            return slv > 0;
          case 'da_ra_soat':
            return isThuHoiScope && hasKq;
          case 'su_dung_lai':
            return isThuHoiScope && kqNorm.includes('sử dụng lại');
          case 'thu_hoi_rs':
            return isThuHoiScope && (kqNorm.includes('thu hồi') || kqNorm === 'thu hồi');
          case 'khac':
            return isThuHoiScope && hasKq && !kqNorm.includes('sử dụng lại') && !kqNorm.includes('thu hồi');
          case 'chua_ra_soat':
            return isThuHoiScope && !hasKq;
          case 'qua_han_all':
            return isEntryQuaHan(item);
          case 'qua_han_da_thay':
            return isEntryQuaHan(item) && isDone;
          case 'qua_han_chua_thay':
            return isEntryQuaHan(item) && !isDone;
          default:
            return true;
        }
      });
    } else if (activeReportSelection.source === 'ra_soat') {
      baseList = entries.filter(item => {
        const isThuHoi = Boolean(item.kSuDung && item.kSuDung.trim().toLowerCase().includes('thu hồi'));
        const hasKq = Boolean(item.kqRaSoat && item.kqRaSoat.trim());
        const isThuHoiScope = isThuHoi || hasKq;
        if (!isThuHoiScope) return false;

        if (activeReportSelection.dot && activeReportSelection.dot !== 'all') {
          const itemDot = item.dot || '1';
          if (String(itemDot) !== String(activeReportSelection.dot)) return false;
        }
        if (activeReportSelection.kv && activeReportSelection.kv !== 'all') {
          const itemKv = item.kv || 'Khác';
          if (itemKv !== activeReportSelection.kv) return false;
        }

        const kqNorm = (item.kqRaSoat || '').trim().toLowerCase();

        switch (activeReportSelection.metric) {
          case 'tong_thu_hoi':
            return true;
          case 'da_ra_soat':
            return hasKq;
          case 'su_dung_lai':
            return kqNorm.includes('sử dụng lại');
          case 'thu_hoi':
            return kqNorm.includes('thu hồi') || kqNorm === 'thu hồi';
          case 'khac':
            return hasKq && !kqNorm.includes('sử dụng lại') && !kqNorm.includes('thu hồi');
          case 'chua_ra_soat':
            return !hasKq;
          default:
            return true;
        }
      });
    } else {
      baseList = thuHoiReviewCustomerList;
    }

    return baseList.filter(item => {
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
          (item.sdt && item.sdt.toLowerCase().includes(q)) ||
          (item.diaChi && item.diaChi.toLowerCase().includes(q)) ||
          (item.kv && item.kv.toLowerCase().includes(q)) ||
          (item.chungLoaiCanThay && item.chungLoaiCanThay.toLowerCase().includes(q)) ||
          (item.kqRaSoat && item.kqRaSoat.toLowerCase().includes(q)) ||
          (item.kSuDung && item.kSuDung.toLowerCase().includes(q)) ||
          (item.dot && String(item.dot).toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [entries, thuHoiReviewCustomerList, activeReportSelection, raSoatFilter, raSoatSearch]);

  // Xuất file Excel danh sách chi tiết sau bảng báo cáo thu hồi
  const handleExportDetailTableExcel = () => {
    if (filteredRaSoatCustomers.length === 0) {
      alert('Không có dữ liệu trong danh sách chi tiết để xuất Excel!');
      return;
    }

    const exportRows = filteredRaSoatCustomers.map((c, idx) => {
      const isDone = Boolean(c.ketQua && c.ketQua.toLowerCase().includes('xong'));
      const isThuHoiBlocked = Boolean(c.kSuDung && c.kSuDung.toLowerCase().includes('thu hồi'));
      return {
        'STT': idx + 1,
        'Mã Khách Hàng': c.maKh || '',
        'Tên Khách Hàng': c.tenKh || '',
        'Số Điện Thoại': c.sdt || '',
        'Địa Chỉ': c.diaChi || '',
        'Đợt': c.dot ? `Đợt ${c.dot}` : '',
        'Khu Vực': c.kv || '',
        'Chủng Loại Cần Thay': c.chungLoaiCanThay || '',
        'Cột KSuDung': c.kSuDung || '',
        'Kết Quả Rà Soát (KQRaSoat)': c.kqRaSoat || 'Chưa rà soát',
        'Quy Định Thay': isThuHoiBlocked ? 'Không được thay' : 'Được phép thay',
        'Trạng Thái Thay': isDone ? 'Đã thay xong' : 'Chưa thay',
        'NV Thực Hiện': c.nv || '',
        'Ngày Giờ Thay': c.ngayGio || '',
        'Chỉ Số Cao Điểm Tháo': c.cscdThao || '',
        'Chỉ Số 930': c.cs930 || c.cs9h30 || '',
        'Sản Lượng Vượt (kWh)': c.slVuot || '',
        'Khách Hàng NLMT': c.nlmt || ''
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);

    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 16 }, // Mã KH
      { wch: 28 }, // Tên KH
      { wch: 14 }, // SĐT
      { wch: 35 }, // Địa chỉ
      { wch: 10 }, // Đợt
      { wch: 12 }, // Khu vực
      { wch: 22 }, // Chủng loại cần thay
      { wch: 14 }, // KSuDung
      { wch: 25 }, // KQRaSoat
      { wch: 16 }, // Quy định thay
      { wch: 16 }, // Trạng thái thay
      { wch: 18 }, // NV thực hiện
      { wch: 18 }, // Ngày giờ thay
      { wch: 14 }, // CSCD tháo
      { wch: 14 }, // CS 930
      { wch: 18 }, // SL vượt
      { wch: 12 }, // NLMT
    ];

    const titlePrefix = activeReportSelection.source !== 'none' 
      ? activeReportSelection.label.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_').substring(0, 30)
      : 'RaSoat_ThuHoi';
    const fileName = `DS_ChiTiet_963_${titlePrefix}_${getCurrentDateTimeStr().replace(/[/ :]/g, '_')}.xlsx`;

    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachChiTiet');
    XLSX.writeFile(wb, fileName);
    showToast('success', `Đã xuất ${filteredRaSoatCustomers.length} khách hàng ra file Excel thành công!`);
  };

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
      // Bổ sung Quá Hạn (Sheet QuaHan_Nam)
      'Tổng KH Quá Hạn': r.quaHanTong,
      'Quá Hạn Đã Thay': r.quaHanDaThay,
      'Tỷ Lệ Quá Hạn (%)': `${r.quaHanTyLe}%`,
      'Quá Hạn Còn Lại': r.quaHanChuaThay,
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
      // Tổng Quá Hạn
      'Tổng KH Quá Hạn': reportTotals.quaHanTong,
      'Quá Hạn Đã Thay': reportTotals.quaHanDaThay,
      'Tỷ Lệ Quá Hạn (%)': `${reportTotals.quaHanTyLeChung}%`,
      'Quá Hạn Còn Lại': reportTotals.quaHanChuaThay,
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

    // Sheet 4: Danh sách Khách Hàng Quá Hạn (Sheet QuaHan_Nam)
    if (quaHanCustomerList.length > 0) {
      const qhRows = quaHanCustomerList.map((c, idx) => ({
        'STT': idx + 1,
        'Mã Khách Hàng': c.maKh,
        'Tên Khách Hàng': c.tenKh,
        'Số Điện Thoại': c.sdt || '',
        'Địa Chỉ': c.diaChi,
        'Khu Vực': c.kv,
        'Đợt': c.dot ? `Đợt ${c.dot}` : '',
        'Chủng Loại Cần Thay': c.chungLoaiCanThay || '',
        'Hệ Số Nhân (HSN)': c.hsn !== undefined && c.hsn !== '' ? c.hsn : resolveHsn(c),
        'Đang Quá Hạn': 'Quá hạn (QuaHan_Nam)',
        'Trạng Thái Thay': (c.ketQua && c.ketQua.toLowerCase().includes('xong')) ? 'Đã thay xong' : 'Chưa thay',
        'NV Thực Hiện': c.nv || '',
        'Ngày Giờ Thay': c.ngayGio || '',
        'Giờ Vượt (h)': c.gioVuot !== undefined ? c.gioVuot : 0,
        'SL Vượt (kWh)': c.slVuot || 0,
        'Cột KSuDung': c.kSuDung || '',
        'KQ Rà Soát': c.kqRaSoat || ''
      }));
      const ws4 = XLSX.utils.json_to_sheet(qhRows);
      XLSX.utils.book_append_sheet(wb, ws4, 'DS_KhachHang_QuaHan');
    }

    XLSX.writeFile(wb, `BaoCao_ToanDien_ThayCongTo_QD963_${getCurrentDateTimeStr().replace(/[/ :]/g, '_')}.xlsx`);
    showToast('success', 'Đã xuất file Excel báo cáo QĐ 963 toàn diện (gồm Tổng hợp, NLMT, Quá hạn và Rà soát thu hồi)!');
  };

  // Xuất file Excel riêng cho danh sách Khách hàng Quá hạn đã thay / chưa thay
  const handleExportQuaHanExcel = () => {
    if (filteredQuaHanCustomers.length === 0) {
      alert('Không có dữ liệu khách hàng quá hạn để xuất!');
      return;
    }
    const exportRows = filteredQuaHanCustomers.map((c, idx) => ({
      'STT': idx + 1,
      'Mã Khách Hàng': c.maKh,
      'Tên Khách Hàng': c.tenKh,
      'Số Điện Thoại': c.sdt || '',
      'Địa Chỉ': c.diaChi,
      'Khu Vực': c.kv,
      'Đợt': c.dot ? `Đợt ${c.dot}` : '',
      'Chủng Loại Cần Thay': c.chungLoaiCanThay || '',
      'Hệ Số Nhân (HSN)': c.hsn !== undefined && c.hsn !== '' ? c.hsn : resolveHsn(c),
      'Đang Quá Hạn': 'Quá hạn (QuaHan_Nam)',
      'Trạng Thái Thay': (c.ketQua && c.ketQua.toLowerCase().includes('xong')) ? 'Đã thay xong' : 'Chưa thay',
      'NV Thực Hiện': c.nv || '',
      'Ngày Giờ Thay': c.ngayGio || '',
      'Giờ Vượt (h)': c.gioVuot !== undefined ? c.gioVuot : 0,
      'SL Vượt (kWh)': c.slVuot || 0,
      'Cột KSuDung': c.kSuDung || '',
      'KQ Rà Soát': c.kqRaSoat || ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, ws, 'DS_KhachHang_QuaHan');
    XLSX.writeFile(wb, `DS_KH_QuaHan_DaThay_QD963_${getCurrentDateTimeStr().replace(/[/ :]/g, '_')}.xlsx`);
    showToast('success', `Đã xuất ${filteredQuaHanCustomers.length} khách hàng quá hạn ra file Excel thành công!`);
  };

  const COL_FILTER_LABELS: Record<string, string> = {
    trangThai: 'Trạng Thái',
    maKh: 'Mã KH',
    tenKh: 'Tên KH',
    sdt: 'SĐT',
    chungLoaiCanThay: 'Chủng Loại',
    soPha: 'Số Pha',
    phien: 'Phiên',
    cap: 'Cap',
    titu: 'TI / TU',
    kv: 'Khu Vực',
    dot: 'Đợt',
    hsn: 'HSN',
    raSoatHsn: 'Rà Soát HSN',
    nv: 'NV Thay',
    ngayGio: 'Ngày Giờ',
    kqRaSoat: 'KQ Rà Soát',
    pic: 'Ảnh (Pic)'
  };

  const renderColHeader = (
    colKey: string,
    label: string,
    options?: string[],
    align: 'left' | 'center' | 'right' = 'left',
    dropdownAlign: 'left' | 'right' = 'left'
  ) => {
    const activeVal = tableColFilters[colKey] || '';
    const isOpen = activeColFilterDropdown === colKey;
    const isActive = activeVal.trim() !== '';

    return (
      <th className={`py-2.5 px-2.5 relative select-none ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}>
        <div className={`inline-flex items-center gap-1 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
          <span>{label}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveColFilterDropdown(prev => (prev === colKey ? null : colKey));
            }}
            className={`p-0.5 rounded transition-colors cursor-pointer ${
              isActive
                ? 'bg-amber-500 text-white shadow-2xs'
                : isOpen
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-slate-400 hover:text-indigo-700 hover:bg-slate-200/70'
            }`}
            title={`Lọc theo cột ${label}${isActive ? ` (Đang lọc: ${activeVal})` : ''}`}
          >
            <Filter className="w-3 h-3" />
          </button>
        </div>

        {isOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute top-full mt-1 ${dropdownAlign === 'right' ? 'right-0' : 'left-0'} z-50 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 text-left normal-case font-normal text-slate-700`}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5 pb-1 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 truncate">Lọc: {label}</span>
              {isActive && (
                <button
                  type="button"
                  onClick={() => {
                    setTableColFilters(prev => {
                      const next = { ...prev };
                      delete next[colKey];
                      return next;
                    });
                    setActiveColFilterDropdown(null);
                  }}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer shrink-0"
                >
                  Xóa lọc
                </button>
              )}
            </div>
            <div className="relative mb-1.5">
              <input
                type="text"
                autoFocus
                value={activeVal}
                onChange={(e) => {
                  const val = e.target.value;
                  setTableColFilters(prev => {
                    const next = { ...prev };
                    if (val) next[colKey] = val;
                    else delete next[colKey];
                    return next;
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    setActiveColFilterDropdown(null);
                  }
                }}
                placeholder={`Tìm ${label.toLowerCase()}...`}
                className="w-full px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
              {isActive && (
                <button
                  type="button"
                  onClick={() => {
                    setTableColFilters(prev => {
                      const next = { ...prev };
                      delete next[colKey];
                      return next;
                    });
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Xóa"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {options && options.length > 0 && (
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-50 space-y-0.5 pr-0.5">
                {options
                  .filter(opt => !activeVal || opt.toLowerCase().includes(activeVal.trim().toLowerCase()))
                  .map(opt => {
                    const selected = activeVal.trim().toLowerCase() === opt.trim().toLowerCase();
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setTableColFilters(prev => {
                            const next = { ...prev };
                            if (selected) delete next[colKey];
                            else next[colKey] = opt;
                            return next;
                          });
                          setActiveColFilterDropdown(null);
                        }}
                        className={`w-full text-left px-2 py-1 rounded-md text-[11px] flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
                          selected
                            ? 'bg-indigo-50 text-indigo-800 font-bold'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{opt}</span>
                        {selected && <Check className="w-3 h-3 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}
              </div>
            )}

            <div className="pt-1.5 mt-1.5 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveColFilterDropdown(null)}
                className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </th>
    );
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

            <button
              type="button"
              onClick={() => setActiveSubTab('bao_cao_ngay')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeSubTab === 'bao_cao_ngay'
                  ? 'bg-amber-400 text-amber-950 shadow-sm'
                  : 'text-amber-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Tab 3: Báo Cáo Ngày</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (canAccessDienKe) {
                  setActiveSubTab('dien_ke');
                } else {
                  showToast('error', 'Chức năng Quản lý Điện Kế chỉ dành cho Tổ phó, Tổ trưởng trở lên theo phân quyền trong tab Hệ thống!');
                }
              }}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeSubTab === 'dien_ke'
                  ? 'bg-amber-400 text-amber-950 shadow-sm'
                  : canAccessDienKe
                  ? 'text-amber-100 hover:text-white hover:bg-white/10'
                  : 'text-amber-200/60 hover:bg-white/5 opacity-80'
              }`}
              title={canAccessDienKe ? 'Theo dõi nhập và thay điện kế' : 'Khóa: Chỉ cho phép từ Tổ phó, Tổ trưởng trở lên'}
            >
              {canAccessDienKe ? <Gauge className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-300" />}
              <span>Tab 4: Điện Kế</span>
              {!canAccessDienKe && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-amber-300 border border-amber-400/30">
                  Khóa
                </span>
              )}
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
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          
          {/* CỘT BÊN TRÁI: SƠ ĐỒ CÂY CÁC ĐỢT -> KHU VỰC -> KHÁCH HÀNG & TÌM KIẾM (THU GỌN TỪ PHẢI VỀ TRÁI) */}
          {collapsedSections.tree ? (
            <div className="w-full lg:w-[380px] xl:w-[410px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4 transition-all duration-200">
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
                    title="Thu gọn sơ đồ cây sang trái"
                  >
                    <span className="text-[10px] text-slate-500 font-semibold hidden sm:inline">
                      Thu gọn
                    </span>
                    <ChevronsLeft className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>

            {/* Tìm kiếm 5 tiêu chí: Mã KH, Tên KH, TI, TU, Chủng loại cần thay & Giọng nói */}
            <div className="space-y-2">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={
                    searchTarget === 'maKh'
                      ? 'Tìm theo Mã KH...'
                      : searchTarget === 'tenKh'
                      ? 'Tìm theo Tên KH...'
                      : searchTarget === 'ti'
                      ? 'Tìm theo Tỷ số TI...'
                      : searchTarget === 'tu'
                      ? 'Tìm theo Tỷ số TU...'
                      : searchTarget === 'cl'
                      ? 'Tìm theo Chủng loại cần thay...'
                      : 'Tìm Mã KH, Tên KH, TI, TU, Chủng loại...'
                  }
                  className="w-full pl-9 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                      title="Xóa tìm kiếm"
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

              {/* Tiêu chí tìm kiếm: Mã KH, Tên KH, TI, TU, Chủng loại cần thay */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
                  <span className="font-semibold text-slate-600">Tiêu chí:</span>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSearchMode('fuzzy')}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        searchMode === 'fuzzy'
                          ? 'bg-white text-amber-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Gần đúng
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchMode('exact')}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        searchMode === 'exact'
                          ? 'bg-white text-amber-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Chính xác
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'maKh', label: 'Mã KH' },
                    { id: 'tenKh', label: 'Tên KH' },
                    { id: 'ti', label: 'TI' },
                    { id: 'tu', label: 'TU' },
                    { id: 'cl', label: 'Chủng loại' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSearchTarget(tab.id as SearchTargetField)}
                      className={`px-1.5 py-1 rounded-lg text-center font-bold text-[10.5px] transition-all cursor-pointer border truncate ${
                        searchTarget === tab.id
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-white hover:bg-amber-50/60 text-slate-700 border-slate-200'
                      }`}
                      title={tab.id === 'all' ? 'Tìm trên cả 5 tiêu chí: Mã KH, Tên KH, TI, TU, Chủng loại cần thay' : `Chỉ tìm theo ${tab.label}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {isListening && (
                <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-2 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                  <span>Đang lắng nghe... Nói Mã KH, Tên KH, TI, TU hoặc Chủng loại cần thay (khi bạn dừng nói, tìm kiếm sẽ tự thực hiện).</span>
                </div>
              )}
            </div>

            {/* Chức năng: Hiển thị danh sách kết quả tìm kiếm ở bảng chi tiết phía dưới */}
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-amber-50 border border-purple-200 rounded-xl p-2.5 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-950 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-purple-700" />
                  <span>Danh sách tìm kiếm:</span>
                </span>
                <span className="font-mono font-black text-purple-800 bg-purple-200/80 px-2 py-0.5 rounded-full text-[11px]">
                  {filteredEntries.length} KH
                </span>
              </div>
              <button
                type="button"
                onClick={handleShowSearchResultsInTable}
                className="w-full py-2 px-3 bg-purple-700 hover:bg-purple-800 active:scale-98 text-white rounded-lg font-bold text-xs shadow-xs transition-all flex items-center justify-between cursor-pointer group"
                title="Bấm để hiển thị toàn bộ danh sách kết quả tìm kiếm ở bảng phía dưới và kết xuất Excel"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <FileSpreadsheet className="w-4 h-4 text-purple-200 group-hover:text-white shrink-0" />
                  <span className="truncate">Xem ở bảng kết quả & Xuất Excel</span>
                </div>
                <span className="text-[10px] text-purple-200 group-hover:text-white font-mono shrink-0 flex items-center gap-0.5">
                  Xem bảng ▾
                </span>
              </button>
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
                                        <div className="truncate flex-1 min-w-0 flex items-center gap-1">
                                          <span className="font-mono font-bold shrink-0">{cust.maKh}</span>
                                          <span className="text-slate-400">-</span>
                                          <span className="truncate">{cust.tenKh}</span>
                                          {cust.chungLoaiCanThay && (
                                            <span 
                                              className="text-[9px] font-mono font-black text-purple-900 bg-purple-100 border border-purple-300 px-1 py-0.2 rounded shrink-0 shadow-2xs" 
                                              title={`Chủng loại cần thay: ${cust.chungLoaiCanThay}`}
                                            >
                                              {cust.chungLoaiCanThay}
                                            </span>
                                          )}
                                          {(cust.tySoTi || cust.tySoTu) && (
                                            <span 
                                              className="text-[9px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-1 py-0.2 rounded shrink-0" 
                                              title={`TI: ${cust.tySoTi || '—'} / TU: ${cust.tySoTu || '—'}`}
                                            >
                                              {cust.tySoTi ? `TI:${cust.tySoTi}` : ''}{cust.tySoTi && cust.tySoTu ? ' ' : ''}{cust.tySoTu ? `TU:${cust.tySoTu}` : ''}
                                            </span>
                                          )}
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
        ) : (
          /* THANH THU GỌN TỪ PHẢI VỀ TRÁI (TIẾT KIỆM KHÔNG GIAN TỐI ĐA CHO CỘT BÊN PHẢI) */
          <div 
            onClick={() => toggleSection('tree')}
            className="w-full lg:w-12 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 hover:bg-amber-50/50 p-2 lg:py-5 flex lg:flex-col items-center justify-between lg:justify-start gap-4 cursor-pointer transition-all duration-200 group select-none"
            title="Nhấp để mở rộng sơ đồ cây sang phải"
          >
            <div className="p-1.5 rounded-xl bg-amber-100 text-amber-900 group-hover:scale-110 group-hover:bg-amber-200 transition-all shadow-2xs">
              <ChevronsRight className="w-4 h-4 text-amber-800" />
            </div>
            <span className="hidden lg:block [writing-mode:vertical-rl] rotate-180 uppercase text-[11px] font-black tracking-widest text-slate-600 group-hover:text-amber-900 transition-colors py-2">
              SƠ ĐỒ CÂY & TÌM KIẾM
            </span>
            <div className="flex lg:hidden items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-slate-700">Sơ đồ cây ({filteredEntries.length} KH) - Nhấp để bung ra</span>
            </div>
            <span className="text-[10px] font-mono font-black bg-amber-100 text-amber-950 px-2 py-0.5 rounded-full border border-amber-300 group-hover:bg-amber-200 transition-colors">
              {filteredEntries.length}
            </span>
          </div>
        )}

        {/* CỘT BÊN PHẢI: THÔNG TIN KHÁCH HÀNG + TÍNH SẢN LƯỢNG CAO ĐIỂM + DANH SÁCH THAY XONG (MỞ RỘNG TỐI ĐA) */}
        <div className="flex-1 min-w-0 space-y-5">
            
            {/* 1. KHỐI FORM NHẬP THAY CÔNG TƠ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-600" />
                  <h3 className="font-black text-slate-800 text-base uppercase">
                    Chi Tiết Khách Hàng & Xác Nhận Thay Xong
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedCustomer && (
                    <>
                      {selectedCustomer.chungLoaiCanThay && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                          CL Cần thay: {selectedCustomer.chungLoaiCanThay}
                        </span>
                      )}
                      {selectedCustomer.sdt && (
                        <a
                          href={`tel:${selectedCustomer.sdt.replace(/[^\d+]/g, '')}`}
                          className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition-colors flex items-center gap-1 shadow-2xs"
                          title="Bấm để gọi ngay"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{selectedCustomer.sdt}</span>
                        </a>
                      )}
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
                    </>
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
                  {/* CẢNH BÁO: KHÁCH HÀNG ĐÃ THAY XONG - KHÔNG CHO PHÉP CẬP NHẬT LẠI */}
                  {selectedCustomer.ketQua && selectedCustomer.ketQua.trim().toLowerCase().includes('xong') && (
                    <div className="p-3.5 bg-emerald-50 border-2 border-emerald-400 rounded-xl flex items-center justify-between gap-3 text-emerald-950 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-300">
                          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div>
                          <div className="font-bold text-xs uppercase text-emerald-900 flex items-center gap-1.5">
                            <span>Khách hàng đã hoàn tất thay công tơ</span>
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full font-black">ĐÃ KHÓA CẬP NHẬT</span>
                          </div>
                          <div className="text-[11px] text-emerald-800 mt-0.5">
                            Ngày giờ thay: <b>{selectedCustomer.ngayGio || '—'}</b> | NV: <b>{selectedCustomer.nv || '—'}</b> | Kết quả: <b>{selectedCustomer.ketQua}</b> | SL Vượt: <b>{selectedCustomer.slVuot || '0'} kWh</b>. Không cho phép cập nhật lại!
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg text-[11px] shrink-0 shadow-2xs">
                        Đã Thay Xong
                      </span>
                    </div>
                  )}

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
                    <div className="bg-purple-50/80 p-2.5 rounded-xl border border-purple-200 shadow-2xs">
                      <span className="text-[10px] text-purple-900 font-black uppercase tracking-wider block">
                        Chủng Loại Cần Thay
                      </span>
                      <div className="mt-0.5">
                        {selectedCustomer.chungLoaiCanThay ? (
                          <span className="font-mono font-black text-sm text-purple-900 bg-purple-200/90 border border-purple-400 px-2.5 py-1 rounded-lg inline-block shadow-2xs">
                            {selectedCustomer.chungLoaiCanThay}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal italic text-xs">Chưa có thông tin</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                      <span className="text-[10px] text-emerald-900 font-black uppercase tracking-wider block">
                        Số Điện Thoại (SĐT)
                      </span>
                      <div className="mt-0.5">
                        {selectedCustomer.sdt ? (
                          <a
                            href={`tel:${selectedCustomer.sdt.replace(/[^\d+]/g, '')}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-mono font-bold text-xs transition-colors shadow-2xs group"
                            title="Bấm vào đây để gọi trực tiếp cho khách hàng"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                            <span className="underline decoration-dotted">{selectedCustomer.sdt}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 font-normal italic text-xs">Chưa có SĐT</span>
                        )}
                      </div>
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
                      <span className="text-[10px] text-slate-500 font-bold uppercase">MA_DS</span>
                      <div className="font-mono font-bold text-slate-800 mt-0.5">
                        {selectedCustomer.maDs || getRaw963Field(selectedCustomer, ['MA_DS', 'Ma_DS', 'MADS', 'Mã ĐS', 'MaDS']) || '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">MA_Tram</span>
                      <div className="font-mono font-bold text-slate-800 mt-0.5">
                        {selectedCustomer.maTram || getRaw963Field(selectedCustomer, ['MA_Tram', 'MA_TRAM', 'Ma_Tram', 'MATRAM', 'Mã trạm', 'MaTram']) || '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">No.</span>
                      <div className="font-mono font-bold text-slate-800 mt-0.5">
                        {selectedCustomer.no || getRaw963Field(selectedCustomer, ['No.', 'No', 'NO', 'NO.']) || '—'}
                      </div>
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

                        {/* Ảnh công tơ đã lưu trên Drive (cột Pic) */}
                        {selectedCustomer.pic && (
                          <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Camera className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">Ảnh công tơ (Pic):</span>
                              <span className="font-mono text-emerald-800 text-[11px] font-bold truncate max-w-[200px] sm:max-w-xs">
                                {selectedCustomer.pic}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setZoomPicUrl({ url: selectedCustomer.pic!, title: `Ảnh công tơ KH: ${selectedCustomer.maKh} (${selectedCustomer.tenKh})` })}
                                className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Maximize2 className="w-3 h-3" />
                                <span>Xem ảnh</span>
                              </button>
                              <a
                                href={selectedCustomer.pic}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Drive</span>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Form fields: NV, NgayGio, GioVuot, Chụp/Tải Ảnh, Xác nhận Xong */}
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
                          disabled={Boolean(selectedCustomer.ketQua?.toLowerCase().includes('xong'))}
                          placeholder="Họ và tên nhân viên..."
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
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
                          disabled={Boolean(selectedCustomer.ketQua?.toLowerCase().includes('xong'))}
                          placeholder="dd/mm/yyyy hh:mm"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
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

                    {/* Phần Chụp / Tải ảnh công tơ sau khi thay (kèm sơ đồ đấu dây) */}
                    <div className="p-3.5 bg-white rounded-xl border border-amber-200/90 shadow-2xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-700 shrink-0">
                            <Camera className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                              <span>Ảnh Công Tơ Sau Khi Thay (Có Sơ Đồ Đấu Dây)</span>
                              <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-900 font-bold rounded">
                                Cột Pic
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              Tên lưu: <code className="font-mono text-amber-900 font-bold">963_{selectedCustomer.maKh}.jpg</code> • Tối ưu hóa siêu nhẹ &lt; 150KB, lưu nhanh
                            </p>
                          </div>
                        </div>

                        {/* Status badges */}
                        {meterPicBase64 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Ảnh mới ({meterPicSizeKb} KB)</span>
                          </span>
                        ) : selectedCustomer.pic ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Đã có trên Drive</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">
                            Chưa chụp/tải ảnh
                          </span>
                        )}
                      </div>

                      {/* Display image preview if newly captured or existing on Drive */}
                      {meterPicBase64 ? (
                        <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                          <div className="relative group shrink-0">
                            <img
                              src={meterPicBase64}
                              alt={`Ảnh công tơ 963_${selectedCustomer.maKh}`}
                              className="w-24 h-24 sm:w-20 sm:h-20 object-cover rounded-lg border-2 border-amber-400 shadow-sm cursor-pointer hover:opacity-95"
                              onClick={() => setZoomPicUrl({ url: meterPicBase64, title: `Ảnh công tơ mới KH: ${selectedCustomer.maKh} (${selectedCustomer.tenKh})` })}
                            />
                            <button
                              type="button"
                              onClick={() => setZoomPicUrl({ url: meterPicBase64, title: `Ảnh công tơ mới KH: ${selectedCustomer.maKh} (${selectedCustomer.tenKh})` })}
                              className="absolute inset-0 bg-black/40 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                              title="Bấm để xem ảnh phóng to"
                            >
                              <Maximize2 className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1 text-center sm:text-left">
                            <div className="text-xs font-bold text-slate-800 truncate flex items-center justify-center sm:justify-start gap-1.5">
                              <span className="font-mono text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                                963_{selectedCustomer.maKh}.jpg
                              </span>
                              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">
                                Đã nén {meterPicSizeKb} KB
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600">
                              {Boolean(selectedCustomer.ketQua?.toLowerCase().includes('xong'))
                                ? 'Ảnh công tơ bổ sung cho khách hàng đã thay xong. Bấm "Lưu Bổ Sung Ảnh" để lưu lên Google Drive và ghi vào cột Pic.'
                                : 'Đã tối ưu hóa dung lượng nhỏ nhất, lưu nhanh. Ảnh sẽ được tự động tải lên Google Drive folder và cập nhật link vào cột Pic khi bấm Xác nhận Đã Thay Xong.'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {Boolean(selectedCustomer.ketQua?.toLowerCase().includes('xong')) && (
                              <button
                                type="button"
                                onClick={() => handleSaveSupplementaryPic(selectedCustomer)}
                                disabled={isSubmittingPic}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                              >
                                {isSubmittingPic ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Đang lưu...</span>
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Lưu Bổ Sung Ảnh</span>
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setZoomPicUrl({ url: meterPicBase64, title: `Ảnh công tơ mới KH: ${selectedCustomer.maKh} (${selectedCustomer.tenKh})` })}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                              <span>Xem</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMeterPicBase64(null);
                                setMeterPicSizeKb(0);
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </div>
                      ) : selectedCustomer.pic ? (
                        <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                          <div className="relative group shrink-0">
                            <img
                              src={getDrivePreviewUrl(selectedCustomer.pic)}
                              alt={`Ảnh công tơ KH ${selectedCustomer.maKh}`}
                              className="w-24 h-24 sm:w-20 sm:h-20 object-cover rounded-lg border border-emerald-300 shadow-sm cursor-pointer"
                              onClick={() => setZoomPicUrl({ url: selectedCustomer.pic!, title: `Ảnh công tơ KH: ${selectedCustomer.maKh} (${selectedCustomer.tenKh})` })}
                              onError={(e) => {
                                // Ẩn thẻ img nếu link Google Drive không trực tiếp hiển thị qua img tag
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setZoomPicUrl({ url: selectedCustomer.pic!, title: `Ảnh công tơ KH: ${selectedCustomer.maKh} (${selectedCustomer.tenKh})` })}
                              className="absolute inset-0 bg-black/40 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                            >
                              <Maximize2 className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1 text-center sm:text-left">
                            <div className="text-xs font-bold text-emerald-950 flex items-center justify-center sm:justify-start gap-1.5">
                              <CheckCheck className="w-4 h-4 text-emerald-600" />
                              <span>Ảnh công tơ đã lưu trên Drive</span>
                            </div>
                            <div className="text-[11px] text-slate-600 truncate font-mono">
                              {selectedCustomer.pic}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setZoomPicUrl({ url: selectedCustomer.pic!, title: `Ảnh công tơ KH: ${selectedCustomer.maKh} (${selectedCustomer.tenKh})` })}
                              className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>Xem</span>
                            </button>
                            <a
                              href={selectedCustomer.pic}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Drive</span>
                            </a>
                          </div>
                        </div>
                      ) : null}

                      {/* Photo Capture / Upload buttons (enabled if not completed OR if completed but missing photo) */}
                      {(!Boolean(selectedCustomer.ketQua?.toLowerCase().includes('xong')) || !selectedCustomer.pic) && (
                        <div className="space-y-2 pt-1">
                          {Boolean(selectedCustomer.ketQua?.toLowerCase().includes('xong')) && !selectedCustomer.pic && (
                            <div className="p-2.5 bg-amber-100/70 text-amber-900 rounded-xl border border-amber-300 text-xs flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 font-medium">
                                <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                                <span>Khách hàng này đã thay xong nhưng chưa có ảnh công tơ. Hãy chụp/tải ảnh để bổ sung vào Drive & Cột Pic!</span>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Default Action: Chụp ảnh công tơ bằng Camera */}
                            <button
                              type="button"
                              onClick={() => cameraInputRef.current?.click()}
                              disabled={isProcessingPic || isSubmittingPic}
                              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Camera className="w-4 h-4" />
                              <span>{meterPicBase64 ? 'Chụp lại ảnh (Mặc định)' : 'Chụp ảnh công tơ (Mặc định)'}</span>
                            </button>

                            {/* Secondary Action: Tải ảnh từ thư viện thiết bị */}
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isProcessingPic || isSubmittingPic}
                              className="px-3.5 py-2 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-300 font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Upload className="w-4 h-4 text-slate-600" />
                              <span>Tải ảnh từ máy</span>
                            </button>

                            {isProcessingPic && (
                              <span className="text-xs text-amber-800 font-medium flex items-center gap-1.5 animate-pulse ml-2">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                                Đang nén tối ưu dung lượng siêu nhẹ...
                              </span>
                            )}
                          </div>
                        </div>
                      )}
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
                        disabled={isSubmitting || Boolean(selectedCustomer.kSuDung?.toLowerCase().includes('thu hồi')) || Boolean(selectedCustomer.ketQua?.toLowerCase().includes('xong'))}
                        className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {selectedCustomer.ketQua?.toLowerCase().includes('xong')
                            ? 'Đã Thay Xong (Đã Khóa Cập Nhật)'
                            : isSubmitting
                            ? 'Đang ghi nhận...'
                            : 'Xác nhận Đã Thay Xong'}
                        </span>
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

                {Boolean(selectedCustomer?.ketQua?.toLowerCase().includes('xong')) && !selectedCustomer?.pic && meterPicBase64 ? (
                  <button
                    type="button"
                    onClick={() => handleSaveSupplementaryPic(selectedCustomer)}
                    disabled={isSubmittingPic}
                    className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isSubmittingPic ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang tải lên Drive & Cột Pic...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Lưu Bổ Sung Ảnh Công Tơ</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleConfirmReplacement('calculation')}
                    disabled={isSubmitting || Boolean(selectedCustomer?.kSuDung?.toLowerCase().includes('thu hồi')) || Boolean(selectedCustomer?.ketQua?.toLowerCase().includes('xong')) || !selectedCustomer}
                    className="w-full sm:w-auto px-5 py-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {selectedCustomer?.ketQua?.toLowerCase().includes('xong')
                        ? 'Khách hàng đã thay xong (Đã khóa)'
                        : isSubmitting
                        ? 'Đang lưu vào Sheet...'
                        : 'Lưu & Cập Nhật Vào Sheet 963'}
                    </span>
                  </button>
                )}
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

            {/* 3. KHỐI DANH SÁCH KHÁCH HÀNG ĐÃ THAY XONG / KẾT QUẢ TÌM KIẾM (CHO PHÉP KẾT XUẤT EXCEL) */}
            <div ref={bottomTableRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  {/* Chuyển đổi chế độ xem: Đã Thay Xong vs Kết Quả Tìm Kiếm */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setBottomTableTab('completed')}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        bottomTableTab === 'completed'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã Thay Xong ({completedCustomersList.length} KH)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBottomTableTab('search')}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        bottomTableTab === 'search'
                          ? 'bg-purple-700 text-white shadow-xs ring-2 ring-purple-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Kết Quả Tìm Kiếm ({filteredEntries.length} KH)</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1">
                    {bottomTableTab === 'search'
                      ? `Hiển thị danh sách ${filteredEntries.length} khách hàng tìm kiếm theo 5 tiêu chí (Mã KH, Tên KH, TI, TU, Chủng loại). Có thể xem và kết xuất Excel.`
                      : `Hiển thị danh sách khách hàng đã thay xong (10 KH/trang).`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* Nút chức năng Rà Soát HSN Treo */}
                  <button
                    type="button"
                    onClick={() => setShowHsnAuditModal(true)}
                    className={`px-3.5 py-2 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      hsnAuditMap
                        ? 'bg-indigo-700 hover:bg-indigo-800 text-white ring-2 ring-indigo-300'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200'
                    }`}
                    title="Import file đối soát hệ số nhân (HSN / HSNHAN_TREO) khi treo công tơ"
                  >
                    <ClipboardCheck className={`w-4 h-4 ${hsnAuditMap ? 'text-white' : 'text-indigo-600'}`} />
                    <span>{hsnAuditMap ? `Rà Soát HSN (${hsnAuditStats?.diffCount || 0} Sai)` : 'Rà Soát HSN Treo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCompletedExcel}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    title={`Xuất Excel ${bottomTableTab === 'search' ? 'kết quả tìm kiếm' : 'danh sách thay xong'}`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Xuất Excel ({activeBottomList.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSection('completedList')}
                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    title={collapsedSections.completedList ? "Thu gọn danh sách" : "Bung ra danh sách"}
                  >
                    <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                      {collapsedSections.completedList ? 'Thu gọn' : 'Bung ra'}
                    </span>
                    {collapsedSections.completedList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* KHỐI KẾT QUẢ RÀ SOÁT HSN KHI TREO (HIỂN THỊ KHI ĐÃ IMPORT FILE ĐỐI SOÁT) */}
              {hsnAuditMap && hsnAuditStats && (
                <div className="p-3.5 bg-gradient-to-r from-indigo-50 via-purple-50 to-amber-50 border border-indigo-200 rounded-xl space-y-2.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-300">
                        <ClipboardCheck className="w-4 h-4 text-indigo-700" />
                      </div>
                      <div>
                        <span className="font-black text-xs text-indigo-950 uppercase">
                          Kết Quả Rà Soát Hệ Số Nhân (HSN) Khi Treo
                        </span>
                        <span className="text-[11px] text-slate-600 ml-2">
                          (File: <b>{hsnAuditFileName}</b> — {hsnAuditTotalRows} dòng)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowHsnAuditModal(true)}
                        className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Tải file khác</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHsnAuditMap(null);
                          setHsnAuditFileName('');
                          setHsnAuditFilter('all');
                          showToast('info', 'Đã hủy kết quả rà soát HSN');
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Hủy rà soát</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Buttons / KPI badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-slate-600 font-bold text-[11px] mr-1">Bộ lọc rà soát:</span>

                      <button
                        type="button"
                        onClick={() => setHsnAuditFilter('pending')}
                        className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          hsnAuditFilter === 'pending'
                            ? 'bg-indigo-700 text-white border-indigo-800 shadow-2xs ring-2 ring-indigo-300'
                            : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                        }`}
                        title="Khách hàng đã thay xong nhưng chưa kiểm soát HSN"
                      >
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Cần đối soát: <b>{hsnAuditStats.pendingCount} KH</b></span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHsnAuditFilter('match')}
                        className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          hsnAuditFilter === 'match'
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs ring-2 ring-emerald-300'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                        }`}
                        title="HSN trong Sheet 963 khớp chính xác với file đối soát"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Khớp HSN: <b>{hsnAuditStats.matchCount} KH</b></span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHsnAuditFilter('diff')}
                        className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          hsnAuditFilter === 'diff'
                            ? 'bg-amber-600 text-white border-amber-700 shadow-2xs ring-2 ring-amber-300'
                            : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                        }`}
                        title="HSN trong Sheet 963 khác với HSN trong file đối soát"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Sai HSN: <b>{hsnAuditStats.diffCount} KH</b></span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHsnAuditFilter('missing')}
                        className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          hsnAuditFilter === 'missing'
                            ? 'bg-rose-600 text-white border-rose-700 shadow-2xs ring-2 ring-rose-300'
                            : 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
                        }`}
                        title="Khách hàng đã thay xong nhưng không có trong file đối soát"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Thiếu trong file: <b>{hsnAuditStats.missingCount} KH</b></span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHsnAuditFilter('checked')}
                        className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          hsnAuditFilter === 'checked'
                            ? 'bg-blue-600 text-white border-blue-700 shadow-2xs ring-2 ring-blue-300'
                            : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                        }`}
                        title="Khách hàng đã đối soát đúng và lưu vào cột KiemSoatHSN"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Đã kiểm soát: <b>{hsnAuditStats.checkedCount} KH</b></span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHsnAuditFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                          hsnAuditFilter === 'all'
                            ? 'bg-slate-800 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Tất cả ({hsnAuditStats.total} KH)
                      </button>
                    </div>

                    {/* Actions: Toggle hide checked and Save Audit button */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 shadow-2xs hover:bg-slate-50 select-none">
                        <input
                          type="checkbox"
                          checked={hideCheckedHsn}
                          onChange={(e) => setHideCheckedHsn(e.target.checked)}
                          className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>Ẩn KH đã kiểm soát HSN</span>
                      </label>

                      {hsnAuditStats.matchCount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSaveHsnAudit()}
                          disabled={isSavingHsnAudit}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-lg shadow-sm shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Lưu các khách hàng khớp HSN vào cột KiemSoatHSN trong Sheet 963 và không đưa vào danh sách cần đối soát nữa"
                        >
                          {isSavingHsnAudit ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang lưu vào Sheet 963...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Lưu Đối Soát HSN ({hsnAuditStats.matchCount} KH Khớp)</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Thống kê các chủng loại cần thay trong phạm vi đợt / khu vực theo tìm kiếm */}
              {completedChungLoaiSummary.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950 mr-1">
                    <Layers className="w-3.5 h-3.5 text-purple-700" />
                    <span>Chủng loại cần thay ({selectedKv ? `KV ${selectedKv}` : selectedDot ? `Đợt ${selectedDot}` : 'toàn bộ'}):</span>
                  </div>
                  {completedChungLoaiSummary.map(item => {
                    const isSelected = searchQuery.trim() && normalize(item.name).includes(normalize(searchQuery.trim()));
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          const val = item.name === 'Chưa xác định' ? '' : item.name;
                          if (searchQuery === val && searchTarget === 'cl') {
                            setSearchQuery('');
                            setSearchTarget('all');
                          } else {
                            setSearchQuery(val);
                            setSearchTarget('cl');
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-purple-700 text-white shadow-xs ring-2 ring-purple-300'
                            : 'bg-white hover:bg-purple-100 text-purple-900 border border-purple-200 shadow-2xs'
                        }`}
                        title={`Lọc danh sách theo chủng loại: ${item.name}`}
                      >
                        <span>{item.name}:</span>
                        <span className={`font-sans font-black px-1.5 py-0.2 rounded-full text-[10px] ${
                          isSelected ? 'bg-purple-800 text-white' : 'bg-purple-200/70 text-purple-950'
                        }`}>
                          {item.count}
                        </span>
                      </button>
                    );
                  })}
                  {searchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchTarget('all');
                      }}
                      className="text-[11px] text-purple-700 hover:text-purple-950 font-bold underline ml-1 cursor-pointer"
                    >
                      Xóa lọc ({searchQuery})
                    </button>
                  )}
                </div>
              )}

              {collapsedSections.completedList ? (
                /* Table */
                <div className="space-y-2">
                  {activeColFilterDropdown && (
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setActiveColFilterDropdown(null)}
                    />
                  )}
                  {Object.keys(tableColFilters).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px]">
                      <span className="font-bold text-amber-900 flex items-center gap-1 mr-1">
                        <Filter className="w-3.5 h-3.5 text-amber-700" />
                        Đang lọc cột:
                      </span>
                      {Object.entries(tableColFilters).map(([k, v]) => (
                        <span
                          key={k}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-amber-300 text-amber-900 font-semibold shadow-2xs"
                        >
                          <span className="text-slate-500">{COL_FILTER_LABELS[k] || k}:</span>
                          <span className="font-bold">{v}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTableColFilters(prev => {
                                const next = { ...prev };
                                delete next[k];
                                return next;
                              });
                            }}
                            className="ml-0.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Xóa bộ lọc này"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => setTableColFilters({})}
                        className="ml-auto px-2 py-0.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold transition-colors cursor-pointer"
                      >
                        Xóa tất cả bộ lọc
                      </button>
                    </div>
                  )}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto min-h-[260px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                        <th className="py-2.5 px-3 w-10 text-center">STT</th>
                        {renderColHeader('trangThai', 'Trạng Thái', colFilterOptions.trangThai, 'center')}
                        {renderColHeader('maKh', 'Mã KH')}
                        {renderColHeader('tenKh', 'Tên Khách Hàng')}
                        {renderColHeader('sdt', 'SĐT')}
                        {renderColHeader('chungLoaiCanThay', 'Chủng Loại Cần Thay', colFilterOptions.chungLoaiCanThay)}
                        {renderColHeader('soPha', 'Số Pha', colFilterOptions.soPha, 'center')}
                        {renderColHeader('phien', 'Phiên', colFilterOptions.phien, 'center')}
                        {renderColHeader('cap', 'Cap', colFilterOptions.cap, 'center')}
                        {renderColHeader('titu', 'TI / TU', undefined, 'center')}
                        {renderColHeader('kv', 'Khu Vực', colFilterOptions.kv)}
                        {renderColHeader('dot', 'Đợt', colFilterOptions.dot)}
                        {renderColHeader('hsn', 'HSN', colFilterOptions.hsn, 'center')}
                        {renderColHeader('raSoatHsn', 'Rà Soát HSN', colFilterOptions.raSoatHsn, 'center')}
                        {renderColHeader('nv', 'NV Thay', colFilterOptions.nv)}
                        {renderColHeader('ngayGio', 'Ngày Giờ')}
                        {renderColHeader('kqRaSoat', 'KQ Rà Soát', colFilterOptions.kqRaSoat, 'left', 'right')}
                        {renderColHeader('pic', 'Ảnh Công Tơ (Pic)', colFilterOptions.pic, 'center', 'right')}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedCompletedList.length > 0 ? (
                        paginatedCompletedList.map((item, idx) => {
                          const stt = (currentCompletedPage - 1) * PAGE_SIZE + idx + 1;
                          const hsnVal = item.hsn !== undefined && item.hsn !== '' ? item.hsn : resolveHsn(item);
                          const tiVal = item.tySoTi || item.raw?.['ty0so0_TI'] || item.raw?.['TI'] || item.raw?.['TSO_TI'] || '';
                          const tuVal = item.tySoTu || item.raw?.['ty so_TU'] || item.raw?.['TU'] || item.raw?.['TSO_TU'] || '';
                          const soPhaRaw = String(item.soPha || item.raw?.['SO_PHA'] || item.raw?.['Số pha'] || item.raw?.['So_pha'] || '').trim();
                          const phienRaw = String(item.phien || item.raw?.['PHIEN'] || item.raw?.['Phiên'] || item.raw?.['Phien'] || '').trim().toUpperCase();
                          const capVal = String(item.cap || getRaw963Field(item, ['Cap', 'CAP', 'Cấp', 'cap']) || '').trim();
                          const isDone = item.ketQua && item.ketQua.trim().toLowerCase().includes('xong');
                          const isThuHoi = item.kSuDung && item.kSuDung.trim().toLowerCase().includes('thu hồi');
                          const audit = getHsnAuditResult(item);
                          return (
                            <tr
                              key={item.maKh}
                              onClick={() => setSelectedCustomer(item)}
                              className={`hover:bg-amber-50/60 cursor-pointer transition-colors ${
                                selectedCustomer?.maKh === item.maKh ? 'bg-amber-100/80 font-semibold' : ''
                              }`}
                            >
                              <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{stt}</td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                {isThuHoi ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                    Thu hồi
                                  </span>
                                ) : isDone ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <Check className="w-2.5 h-2.5" />
                                    Đã xong
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                    Chưa thay
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-amber-900">{item.maKh}</td>
                              <td className="py-2 px-3 font-medium text-slate-800">{item.tenKh}</td>
                              <td className="py-2 px-3">
                                {item.sdt ? (
                                  <a
                                    href={`tel:${item.sdt.replace(/[^\d+]/g, '')}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-mono text-[11px] font-bold transition-colors"
                                    title="Bấm để gọi ngay cho khách hàng"
                                  >
                                    <Phone className="w-3 h-3 text-emerald-600" />
                                    <span>{item.sdt}</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">—</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {item.chungLoaiCanThay ? (
                                  <span className="font-mono font-black text-xs text-purple-900 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-md shadow-2xs inline-block">
                                    {item.chungLoaiCanThay}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">—</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                {soPhaRaw ? (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                    soPhaRaw === '3' || soPhaRaw.toLowerCase().includes('3')
                                      ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                      : 'bg-sky-50 text-sky-800 border-sky-200'
                                  }`}>
                                    {soPhaRaw === '1' ? '1 Pha' : soPhaRaw === '3' ? '3 Pha' : soPhaRaw}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">—</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                {phienRaw ? (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                    phienRaw === 'GT' || phienRaw.includes('GT')
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}>
                                    {phienRaw === 'TT' ? 'TT (Trực tiếp)' : phienRaw === 'GT' ? 'GT (Gián tiếp)' : phienRaw}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">—</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                {capVal ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300 font-mono">
                                    {capVal}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">—</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-700 whitespace-nowrap">
                                {tiVal || tuVal ? `${tiVal || '—'} / ${tuVal || '—'}` : '—'}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-700">{item.kv}</td>
                              <td className="py-2 px-3 font-mono text-slate-600">{item.dot}</td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-amber-900">{hsnVal}</td>
                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                  {item.kiemSoatHsn ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300" title={`Đã kiểm soát HSN: ${item.kiemSoatHsn}`}>
                                      <CheckCheck className="w-3 h-3 text-blue-700" />
                                      <span>Đã KS ({item.kiemSoatHsn})</span>
                                    </span>
                                  ) : audit ? (
                                    audit.status === 'checked' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300" title={audit.label}>
                                        <CheckCheck className="w-3 h-3 text-blue-700" />
                                        <span>{audit.shortLabel}</span>
                                      </span>
                                    ) : audit.status === 'match' ? (
                                      <div className="inline-flex items-center gap-1">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300" title={audit.label}>
                                          <Check className="w-3 h-3 text-emerald-700" />
                                          <span>{audit.shortLabel}</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSaveHsnAudit(item.maKh);
                                          }}
                                          disabled={isSavingHsnAudit}
                                          className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-2xs cursor-pointer disabled:opacity-50"
                                          title="Lưu kiểm soát HSN cho riêng khách hàng này vào Sheet 963 và loại khỏi danh sách cần đối soát"
                                        >
                                          Lưu
                                        </button>
                                      </div>
                                    ) : audit.status === 'diff' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-400 shadow-2xs animate-pulse" title={audit.label}>
                                        <AlertTriangle className="w-3 h-3 text-amber-700" />
                                        <span>{audit.shortLabel}</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300" title={audit.label}>
                                        <AlertCircle className="w-3 h-3 text-rose-600" />
                                        <span>{audit.shortLabel}</span>
                                      </span>
                                    )
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowHsnAuditModal(true);
                                      }}
                                      className="text-[10px] text-indigo-700 hover:text-indigo-950 hover:underline font-medium cursor-pointer"
                                      title="Bấm để tải file rà soát HSN treo"
                                    >
                                      + Rà soát
                                    </button>
                                  )}
                                </td>
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
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                {item.pic ? (
                                  <div className="inline-flex items-center gap-1 justify-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setZoomPicUrl({ url: item.pic!, title: `Ảnh công tơ KH: ${item.maKh} (${item.tenKh})` });
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors shadow-2xs cursor-pointer"
                                      title="Bấm để xem ảnh công tơ & sơ đồ đấu dây phóng to"
                                    >
                                      <Camera className="w-3 h-3 text-amber-700" />
                                      <span>Xem ảnh</span>
                                    </button>
                                    <a
                                      href={item.pic}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 text-slate-500 hover:text-emerald-700 rounded hover:bg-emerald-50 transition-colors"
                                      title="Mở trực tiếp trên Google Drive"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAddPicModalCustomer(item);
                                      setMeterPicBase64(null);
                                      setMeterPicSizeKb(0);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-sans text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 hover:border-amber-400 transition-colors shadow-2xs cursor-pointer"
                                    title="Khách hàng đã thay xong nhưng chưa có ảnh - Bấm để chụp hoặc tải ảnh bổ sung vào Drive & Cột Pic"
                                  >
                                    <Camera className="w-3 h-3 text-amber-700" />
                                    <span>Bổ sung ảnh</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={18} className="py-8 text-center text-slate-400 text-xs">
                            {bottomTableTab === 'search'
                              ? 'Không tìm thấy khách hàng nào khớp với điều kiện tìm kiếm hiện tại.'
                              : 'Chưa có khách hàng nào được thay xong trong phạm vi lựa chọn này.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                </div>

                {/* Pagination Controls */}
                {totalCompletedPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs">
                    <span className="text-slate-500 text-[11px]">
                      Trang <b>{currentCompletedPage}</b> / <b>{totalCompletedPages}</b> ({activeBottomList.length} khách hàng)
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
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-1">
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

                {/* 8. Khách hàng Quá hạn đã thay (So khớp QuaHan_Nam) */}
                <div 
                  onClick={() => handleDrillDown({ source: 'tien_do', dot: 'all', kv: 'all', metric: 'qua_han_da_thay', label: `Toàn Đội • ${reportTotals.quaHanDaThay} KH Quá Hạn Đã Thay`, badgeColor: 'rose' })}
                  className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200 shadow-2xs hover:border-rose-300 hover:shadow-xs cursor-pointer transition-all"
                  title="So khớp MA_KHANG với sheet QuaHan_Nam - Bấm để xem chi tiết"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-rose-800 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Quá Hạn Thay</span>
                    </span>
                    <span className="bg-rose-200 text-rose-950 text-[9px] font-black px-1.5 py-0.2 rounded">
                      {reportTotals.quaHanTyLeChung}%
                    </span>
                  </div>
                  <div className="text-xl font-black text-rose-900 mt-1 flex items-baseline gap-1">
                    <span>{reportTotals.quaHanDaThay}</span>
                    <span className="text-xs text-slate-500 font-semibold">/ {reportTotals.quaHanTong} KH</span>
                  </div>
                  <span className="text-[10px] text-rose-700">Còn lại: {reportTotals.quaHanChuaThay} KH</span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => toggleSection('reportKpi')}
                className="p-3 bg-slate-50 hover:bg-amber-50/50 rounded-xl border border-dashed border-slate-200 flex items-center justify-between cursor-pointer transition-colors text-xs"
              >
                <span className="text-slate-600 font-medium">
                  Đã thay: <b className="text-emerald-700">{reportTotals.daThay}</b>/{reportTotals.canThay} ({reportTotals.tyLeChung}%) | Quá hạn: <b className="text-rose-800">{reportTotals.quaHanDaThay}/{reportTotals.quaHanTong} ({reportTotals.quaHanTyLeChung}%)</b> | NLMT: <b className="text-amber-800">{reportTotals.nlmtDaThay}/{reportTotals.nlmtTong} ({reportTotals.nlmtTyLeChung}%)</b> | Rà soát thu hồi: <b className="text-indigo-800">{reportTotals.rsDaRaSoat}/{reportTotals.thuHoiScopeTong} ({reportTotals.rsTyLeChung}%)</b> | Tổng SL Vượt: <b className="text-amber-900">{reportTotals.tongSlVuot} kWh</b>
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
                      {/* Cột KH Quá Hạn */}
                      <th className="py-2.5 px-3 text-center bg-rose-50/70 text-rose-900 border-x border-rose-200/60">
                        <div className="flex items-center justify-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>KH Quá Hạn (Xong/Tổng)</span>
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
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'tien_do', dot: row.dot, kv: row.kv, metric: 'tong_kh', label: `Đợt ${row.dot} - ${row.kv} • Tất cả KH`, badgeColor: 'amber' })}
                              className="font-bold text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer text-left"
                              title="Bấm để xem danh sách khách hàng đợt này"
                            >
                              Đợt {row.dot}
                            </button>
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'tien_do', dot: row.dot, kv: row.kv, metric: 'tong_kh', label: `Đợt ${row.dot} - ${row.kv} • Tất cả KH`, badgeColor: 'amber' })}
                              className="font-bold text-amber-900 hover:text-indigo-600 hover:underline cursor-pointer text-left"
                              title="Bấm để xem danh sách khách hàng khu vực này"
                            >
                              {row.kv}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'tien_do', dot: row.dot, kv: row.kv, metric: 'tong_kh', label: `Đợt ${row.dot} - ${row.kv} • Tổng ${row.tongKh} KH`, badgeColor: 'amber' })}
                              className="font-mono text-slate-800 hover:text-indigo-600 hover:underline cursor-pointer font-semibold"
                              title="Xem toàn bộ khách hàng"
                            >
                              {row.tongKh}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'tien_do', dot: row.dot, kv: row.kv, metric: 'thu_hoi', label: `Đợt ${row.dot} - ${row.kv} • ${row.thuHoi} KH Thu Hồi`, badgeColor: 'rose' })}
                              className="font-mono text-rose-600 hover:text-rose-800 hover:underline cursor-pointer font-semibold"
                              title="Xem danh sách khách hàng thu hồi"
                            >
                              {row.thuHoi}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'tien_do', dot: row.dot, kv: row.kv, metric: 'can_thay', label: `Đợt ${row.dot} - ${row.kv} • ${row.canThay} KH Cần Thay`, badgeColor: 'amber' })}
                              className="font-mono font-bold text-amber-900 hover:text-amber-700 hover:underline cursor-pointer"
                              title="Xem danh sách khách hàng cần thay"
                            >
                              {row.canThay}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'tien_do', dot: row.dot, kv: row.kv, metric: 'da_thay', label: `Đợt ${row.dot} - ${row.kv} • ${row.daThay} KH Đã Thay Xong`, badgeColor: 'emerald' })}
                              className="font-mono font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                              title="Xem danh sách khách hàng đã thay xong"
                            >
                              {row.daThay}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'tien_do', dot: row.dot, kv: row.kv, metric: 'da_thay', label: `Đợt ${row.dot} - ${row.kv} • ${row.daThay} KH Đã Thay (${row.tyLe}%)`, badgeColor: 'emerald' })}
                              className="cursor-pointer transition-transform hover:scale-105"
                              title="Bấm để xem danh sách khách hàng đã thay xong"
                            >
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                row.tyLe === 100
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : row.tyLe >= 50
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {row.tyLe}%
                              </span>
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'tien_do', dot: row.dot, kv: row.kv, metric: 'chua_thay', label: `Đợt ${row.dot} - ${row.kv} • ${row.chuaThay} KH Chưa Thay`, badgeColor: 'slate' })}
                              className="font-mono text-slate-600 hover:text-slate-900 hover:underline cursor-pointer font-semibold"
                              title="Xem danh sách khách hàng chưa thay"
                            >
                              {row.chuaThay}
                            </button>
                          </td>

                          {/* Dữ liệu KH NLMT */}
                          <td className="py-2.5 px-3 text-center bg-amber-50/40 border-x border-amber-200/50">
                            {row.nlmtTong > 0 ? (
                              <div className="inline-flex flex-col items-center">
                                <button
                                  type="button"
                                  onClick={() => handleDrillDown({ source: 'tien_do', dot: row.dot, kv: row.kv, metric: 'nlmt_all', label: `Đợt ${row.dot} - ${row.kv} • ${row.nlmtTong} KH Năng Lượng Mặt Trời`, badgeColor: 'amber' })}
                                  className="font-mono font-bold text-amber-950 hover:text-amber-700 hover:underline cursor-pointer"
                                  title="Xem danh sách KH năng lượng mặt trời"
                                >
                                  {row.nlmtDaThay} / {row.nlmtTong}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDrillDown({ source: 'tien_do', dot: row.dot, kv: row.kv, metric: 'nlmt_chua_thay', label: `Đợt ${row.dot} - ${row.kv} • ${row.nlmtChuaThay} KH NLMT Chưa Thay`, badgeColor: 'amber' })}
                                  className="cursor-pointer hover:opacity-85"
                                  title="Xem danh sách KH NLMT chưa thay"
                                >
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    row.nlmtTyLe === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                                  }`}>
                                    {row.nlmtTyLe}% (còn {row.nlmtChuaThay})
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">—</span>
                            )}
                          </td>

                          {/* Dữ liệu KH Quá Hạn */}
                          <td className="py-2.5 px-3 bg-rose-50/40 text-center border-x border-rose-200/50">
                            {row.quaHanTong > 0 ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleDrillDown({ source: 'tien_do', dot: row.dot, kv: row.kv, metric: 'qua_han_all', label: `Đợt ${row.dot} - ${row.kv} • ${row.quaHanTong} KH Quá Hạn (QuaHan_Nam)`, badgeColor: 'rose' })}
                                  className="font-mono font-bold text-rose-900 hover:text-rose-700 hover:underline cursor-pointer"
                                  title="Xem danh sách KH quá hạn đợt này"
                                >
                                  {row.quaHanDaThay} / {row.quaHanTong}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDrillDown({ source: 'tien_do', dot: row.dot, kv: row.kv, metric: 'qua_han_da_thay', label: `Đợt ${row.dot} - ${row.kv} • ${row.quaHanDaThay} KH Quá Hạn Đã Thay`, badgeColor: 'rose' })}
                                  className="cursor-pointer hover:opacity-85"
                                  title="Xem danh sách KH quá hạn đã thay"
                                >
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    row.quaHanTyLe === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-900'
                                  }`}>
                                    {row.quaHanTyLe}% (còn {row.quaHanChuaThay})
                                  </span>
                                </button>
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
                                  <button
                                    type="button"
                                    onClick={() => handleDrillDown({ source: 'ra_soat', dot: row.dot, kv: row.kv, metric: 'tong_thu_hoi', label: `Đợt ${row.dot} - ${row.kv} • ${row.thuHoiScopeTong} KH Rà Soát Thu Hồi`, badgeColor: 'indigo' })}
                                    className="font-semibold text-slate-700 hover:underline cursor-pointer text-left"
                                    title="Xem tất cả KH diện rà soát thu hồi đợt này"
                                  >
                                    Đã RS: <b className="text-indigo-900">{row.rsDaRaSoat}/{row.thuHoiScopeTong}</b>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDrillDown({ source: 'ra_soat', dot: row.dot, kv: row.kv, metric: 'da_ra_soat', label: `Đợt ${row.dot} - ${row.kv} • ${row.rsDaRaSoat} KH Đã Rà Soát`, badgeColor: 'indigo' })}
                                    className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 rounded hover:bg-indigo-200 cursor-pointer"
                                    title="Xem KH đã rà soát"
                                  >
                                    {row.rsTyLe}%
                                  </button>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                  {row.rsSuDungLai > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleDrillDown({ source: 'ra_soat', dot: row.dot, kv: row.kv, metric: 'su_dung_lai', label: `Đợt ${row.dot} - ${row.kv} • ${row.rsSuDungLai} KH Sử Dụng Lại`, badgeColor: 'emerald' })}
                                      className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded font-semibold cursor-pointer"
                                      title="Được mở khóa để thay - Bấm để xem"
                                    >
                                      Dùng lại: {row.rsSuDungLai}
                                    </button>
                                  )}
                                  {row.rsThuHoi > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleDrillDown({ source: 'ra_soat', dot: row.dot, kv: row.kv, metric: 'thu_hoi', label: `Đợt ${row.dot} - ${row.kv} • ${row.rsThuHoi} KH Thu Hồi`, badgeColor: 'rose' })}
                                      className="bg-rose-100 hover:bg-rose-200 text-rose-800 px-1.5 py-0.2 rounded font-semibold cursor-pointer"
                                      title="Giữ nguyên thu hồi - Bấm để xem"
                                    >
                                      Thu hồi: {row.rsThuHoi}
                                    </button>
                                  )}
                                  {row.rsKhac > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleDrillDown({ source: 'ra_soat', dot: row.dot, kv: row.kv, metric: 'khac', label: `Đợt ${row.dot} - ${row.kv} • ${row.rsKhac} KH Khác`, badgeColor: 'slate' })}
                                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold cursor-pointer"
                                      title="Trường hợp khác - Bấm để xem"
                                    >
                                      Khác: {row.rsKhac}
                                    </button>
                                  )}
                                  {row.rsChuaRaSoat > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleDrillDown({ source: 'ra_soat', dot: row.dot, kv: row.kv, metric: 'chua_ra_soat', label: `Đợt ${row.dot} - ${row.kv} • ${row.rsChuaRaSoat} KH Chưa Rà Soát`, badgeColor: 'amber' })}
                                      className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-1.5 py-0.2 rounded font-semibold cursor-pointer"
                                      title="Chưa rà soát - Bấm để xem"
                                    >
                                      Chưa RS: {row.rsChuaRaSoat}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">—</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'tien_do', dot: row.dot, kv: row.kv, metric: 'sl_vuot', label: `Đợt ${row.dot} - ${row.kv} • KH Có Giờ Vượt (${row.tongGioVuot}h)`, badgeColor: 'indigo' })}
                              className="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                              title="Xem danh sách KH có giờ vượt"
                            >
                              {row.tongGioVuot}h
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'tien_do', dot: row.dot, kv: row.kv, metric: 'sl_vuot', label: `Đợt ${row.dot} - ${row.kv} • KH Có SL Vượt (${row.tongSlVuot} kWh)`, badgeColor: 'amber' })}
                              className="font-mono font-bold text-amber-900 hover:text-amber-700 hover:underline cursor-pointer"
                              title="Xem danh sách KH có sản lượng vượt"
                            >
                              {row.tongSlVuot} kWh
                            </button>
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
                          <button
                            type="button"
                            onClick={() => handleDrillDown({ source: 'tien_do', dot: 'all', kv: 'all', metric: 'tong_kh', label: 'Toàn Đội • Tất Cả Khách Hàng', badgeColor: 'amber' })}
                            className="hover:underline cursor-pointer font-bold uppercase text-amber-950"
                            title="Bấm để xem toàn bộ khách hàng toàn công ty"
                          >
                            TỔNG CỘNG TOÀN CÔNG TY:
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDrillDown({ source: 'tien_do', dot: 'all', kv: 'all', metric: 'tong_kh', label: `Toàn Đội • Tổng ${reportTotals.tongKh} KH`, badgeColor: 'amber' })}
                            className="font-mono hover:text-indigo-700 hover:underline cursor-pointer font-bold"
                            title="Xem toàn bộ khách hàng"
                          >
                            {reportTotals.tongKh}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDrillDown({ source: 'tien_do', dot: 'all', kv: 'all', metric: 'thu_hoi', label: `Toàn Đội • ${reportTotals.thuHoi} KH Thu Hồi`, badgeColor: 'rose' })}
                            className="font-mono text-rose-700 hover:text-rose-900 hover:underline cursor-pointer font-bold"
                            title="Xem tất cả KH thu hồi toàn công ty"
                          >
                            {reportTotals.thuHoi}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDrillDown({ source: 'tien_do', dot: 'all', kv: 'all', metric: 'can_thay', label: `Toàn Đội • ${reportTotals.canThay} KH Cần Thay`, badgeColor: 'amber' })}
                            className="font-mono hover:text-amber-700 hover:underline cursor-pointer font-bold"
                            title="Xem tất cả KH cần thay toàn công ty"
                          >
                            {reportTotals.canThay}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDrillDown({ source: 'tien_do', dot: 'all', kv: 'all', metric: 'da_thay', label: `Toàn Đội • ${reportTotals.daThay} KH Đã Thay Xong`, badgeColor: 'emerald' })}
                            className="font-mono text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer font-bold"
                            title="Xem tất cả KH đã thay xong toàn công ty"
                          >
                            {reportTotals.daThay}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDrillDown({ source: 'tien_do', dot: 'all', kv: 'all', metric: 'da_thay', label: `Toàn Đội • Đã Thay ${reportTotals.daThay} KH (${reportTotals.tyLeChung}%)`, badgeColor: 'emerald' })}
                            className="font-mono text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer font-bold"
                            title="Xem danh sách KH đã hoàn tất"
                          >
                            {reportTotals.tyLeChung}%
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDrillDown({ source: 'tien_do', dot: 'all', kv: 'all', metric: 'chua_thay', label: `Toàn Đội • ${reportTotals.chuaThay} KH Chưa Thay`, badgeColor: 'slate' })}
                            className="font-mono hover:text-slate-900 hover:underline cursor-pointer font-bold"
                            title="Xem tất cả KH chưa thay toàn công ty"
                          >
                            {reportTotals.chuaThay}
                          </button>
                        </td>
                        {/* Tổng NLMT */}
                        <td className="py-3 px-3 text-center font-mono text-amber-950 bg-amber-100 border-x border-amber-300">
                          <button
                            type="button"
                            onClick={() => handleDrillDown({ source: 'tien_do', dot: 'all', kv: 'all', metric: 'nlmt_all', label: `Toàn Đội • ${reportTotals.nlmtTong} KH Năng Lượng Mặt Trời`, badgeColor: 'amber' })}
                            className="font-bold hover:underline cursor-pointer block w-full"
                            title="Xem tất cả KH NLMT toàn công ty"
                          >
                            {reportTotals.nlmtDaThay} / {reportTotals.nlmtTong} ({reportTotals.nlmtTyLeChung}%)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDrillDown({ source: 'tien_do', dot: 'all', kv: 'all', metric: 'nlmt_chua_thay', label: `Toàn Đội • ${reportTotals.nlmtChuaThay} KH NLMT Chưa Thay`, badgeColor: 'amber' })}
                            className="text-[10px] normal-case text-amber-800 font-normal hover:underline cursor-pointer"
                            title="Xem KH NLMT chưa thay toàn công ty"
                          >
                            Còn lại: {reportTotals.nlmtChuaThay} KH
                          </button>
                        </td>
                        {/* Tổng Quá Hạn */}
                        <td className="py-3 px-3 text-center font-mono text-rose-950 bg-rose-100/80 border-x border-rose-300">
                          <button
                            type="button"
                            onClick={() => handleDrillDown({ source: 'tien_do', dot: 'all', kv: 'all', metric: 'qua_han_all', label: `Toàn Đội • ${reportTotals.quaHanTong} KH Quá Hạn (QuaHan_Nam)`, badgeColor: 'rose' })}
                            className="font-bold hover:underline cursor-pointer block w-full text-rose-950"
                            title="Xem tất cả KH quá hạn toàn công ty"
                          >
                            {reportTotals.quaHanDaThay} / {reportTotals.quaHanTong} ({reportTotals.quaHanTyLeChung}%)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDrillDown({ source: 'tien_do', dot: 'all', kv: 'all', metric: 'qua_han_chua_thay', label: `Toàn Đội • ${reportTotals.quaHanChuaThay} KH Quá Hạn Chưa Thay`, badgeColor: 'rose' })}
                            className="text-[10px] normal-case text-rose-800 font-normal hover:underline cursor-pointer"
                            title="Xem KH quá hạn chưa thay toàn công ty"
                          >
                            Còn lại: {reportTotals.quaHanChuaThay} KH
                          </button>
                        </td>
                        {/* Tổng Rà Soát */}
                        <td className="py-3 px-3 text-left font-mono text-indigo-950 bg-indigo-100 border-r border-indigo-300">
                          <button
                            type="button"
                            onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'tong_thu_hoi', label: `Toàn Đội • ${reportTotals.thuHoiScopeTong} KH Diện Thu Hồi & Rà Soát`, badgeColor: 'indigo' })}
                            className="font-bold hover:underline cursor-pointer text-left block"
                            title="Xem toàn bộ KH diện thu hồi toàn công ty"
                          >
                            Đã RS: {reportTotals.rsDaRaSoat} / {reportTotals.thuHoiScopeTong} ({reportTotals.rsTyLeChung}%)
                          </button>
                          <div className="text-[10px] normal-case text-indigo-800 font-normal flex flex-wrap gap-1 mt-0.5">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'su_dung_lai', label: `Toàn Đội • ${reportTotals.rsSuDungLai} KH Sử Dụng Lại`, badgeColor: 'emerald' })}
                              className="hover:underline cursor-pointer"
                              title="Xem KH sử dụng lại toàn công ty"
                            >
                              Dùng lại: <b>{reportTotals.rsSuDungLai}</b>
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'thu_hoi', label: `Toàn Đội • ${reportTotals.rsThuHoi} KH Thu Hồi`, badgeColor: 'rose' })}
                              className="hover:underline cursor-pointer"
                              title="Xem KH giữ nguyên thu hồi toàn công ty"
                            >
                              Thu hồi: <b>{reportTotals.rsThuHoi}</b>
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'khac', label: `Toàn Đội • ${reportTotals.rsKhac} KH Khác`, badgeColor: 'slate' })}
                              className="hover:underline cursor-pointer"
                              title="Xem KH khác toàn công ty"
                            >
                              Khác: <b>{reportTotals.rsKhac}</b>
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'chua_ra_soat', label: `Toàn Đội • ${reportTotals.rsChuaRaSoat} KH Chưa Rà Soát`, badgeColor: 'amber' })}
                              className="hover:underline cursor-pointer"
                              title="Xem KH chưa rà soát toàn công ty"
                            >
                              Chưa: <b>{reportTotals.rsChuaRaSoat}</b>
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDrillDown({ source: 'tien_do', dot: 'all', kv: 'all', metric: 'sl_vuot', label: 'Toàn Đội • KH Có Giờ Vượt', badgeColor: 'indigo' })}
                            className="font-mono text-indigo-900 hover:underline cursor-pointer font-bold"
                            title="Xem tất cả KH có giờ vượt toàn công ty"
                          >
                            {reportTotals.tongGioVuot}h
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDrillDown({ source: 'tien_do', dot: 'all', kv: 'all', metric: 'sl_vuot', label: 'Toàn Đội • KH Có Sản Lượng Vượt', badgeColor: 'amber' })}
                            className="font-mono text-amber-950 font-black hover:underline cursor-pointer"
                            title="Xem tất cả KH có sản lượng vượt toàn công ty"
                          >
                            {reportTotals.tongSlVuot} kWh
                          </button>
                        </td>
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
          {/* 3. KHỐI BÁO CÁO CHUYÊN ĐỀ: KHÁCH HÀNG QUÁ HẠN ĐÃ THAY (SO KHỚP SHEET QUAHAN_NAM) */}
          {/* ========================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-rose-100 text-rose-800">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                </span>
                <div>
                  <h3 className="font-black text-slate-800 text-base uppercase flex items-center gap-2 flex-wrap">
                    <span>Báo Cáo Khách Hàng Quá Hạn Đã Thay (So Khớp Sheet QuaHan_Nam)</span>
                    <span className="bg-rose-100 text-rose-900 font-bold text-xs px-2 py-0.5 rounded-full normal-case">
                      {quaHanCustomerList.length} khách hàng quá hạn
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thống kê danh sách khách hàng đang quá hạn kiểm định định kỳ theo dõi trong sheet QuaHan_Nam có trong kế hoạch thay QĐ 963.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportQuaHanExcel}
                  disabled={filteredQuaHanCustomers.length === 0}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Xuất file Excel cho danh sách khách hàng quá hạn"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất Excel Quá Hạn</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQuaHanDetails(prev => !prev)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                    showQuaHanDetails 
                      ? 'bg-rose-100 text-rose-900 border-rose-300' 
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showQuaHanDetails ? 'Ẩn danh sách từng KH' : 'Xem danh sách từng KH'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleSection('reportQuaHan')}
                  className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  title={collapsedSections.reportQuaHan ? "Thu gọn báo cáo Quá Hạn" : "Bung ra báo cáo Quá Hạn"}
                >
                  <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                    {collapsedSections.reportQuaHan ? 'Thu gọn' : 'Bung ra'}
                  </span>
                  {collapsedSections.reportQuaHan ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {collapsedSections.reportQuaHan ? (
              <div className="space-y-4">
                {/* 3 Thẻ thống kê nhanh */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200/80">
                    <span className="text-[10px] uppercase font-bold text-rose-800">Tổng KH Quá Hạn (Sheet QuaHan_Nam)</span>
                    <div className="text-xl font-black text-rose-950 mt-1 flex items-baseline gap-1.5">
                      <span>{reportTotals.quaHanTong}</span>
                      <span className="text-xs font-normal text-slate-500">khách hàng</span>
                    </div>
                    <span className="text-[10px] text-rose-700">Khớp mã MA_KHANG giữa 963 & QuaHan_Nam</span>
                  </div>

                  <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/80">
                    <span className="text-[10px] uppercase font-bold text-emerald-800">Đã Thay Xong</span>
                    <div className="text-xl font-black text-emerald-950 mt-1 flex items-baseline gap-1.5">
                      <span>{reportTotals.quaHanDaThay}</span>
                      <span className="text-xs font-bold text-emerald-700">({reportTotals.quaHanTyLeChung}%)</span>
                    </div>
                    <span className="text-[10px] text-emerald-700">Tỷ lệ xử lý KH quá hạn</span>
                  </div>

                  <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80">
                    <span className="text-[10px] uppercase font-bold text-amber-800">Còn Lại Chưa Thay</span>
                    <div className="text-xl font-black text-amber-950 mt-1 flex items-baseline gap-1.5">
                      <span>{reportTotals.quaHanChuaThay}</span>
                      <span className="text-xs font-normal text-slate-500">khách hàng</span>
                    </div>
                    <span className="text-[10px] text-amber-700">Cần tiếp tục đôn đốc thực hiện</span>
                  </div>
                </div>

                {/* Danh sách chi tiết từng khách hàng quá hạn */}
                {showQuaHanDetails && (
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-rose-900 mr-1">Lọc trạng thái:</span>
                        <button
                          type="button"
                          onClick={() => { setQuaHanFilter('all'); setQuaHanPage(1); }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            quaHanFilter === 'all' ? 'bg-rose-700 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Tất cả ({quaHanCustomerList.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setQuaHanFilter('completed'); setQuaHanPage(1); }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            quaHanFilter === 'completed' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          Đã thay xong ({reportTotals.quaHanDaThay})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setQuaHanFilter('pending'); setQuaHanPage(1); }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            quaHanFilter === 'pending' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                          }`}
                        >
                          Chưa thay ({reportTotals.quaHanChuaThay})
                        </button>
                      </div>

                      {/* Ô tìm kiếm khách hàng quá hạn */}
                      <div className="relative w-full sm:w-64">
                        <input
                          type="text"
                          value={quaHanSearch}
                          onChange={(e) => { setQuaHanSearch(e.target.value); setQuaHanPage(1); }}
                          placeholder="Tìm Mã KH, Tên, SĐT, KV..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      </div>
                    </div>

                    {/* Bảng chi tiết Quá Hạn */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase">
                              <th className="py-2 px-3 w-10 text-center">STT</th>
                              <th className="py-2 px-3">Mã KH</th>
                              <th className="py-2 px-3">Tên Khách Hàng</th>
                              <th className="py-2 px-3">Số Điện Thoại</th>
                              <th className="py-2 px-3">Địa Chỉ</th>
                              <th className="py-2 px-3">Khu Vực</th>
                              <th className="py-2 px-3">Đợt</th>
                              <th className="py-2 px-3">Chủng Loại Cần Thay</th>
                              <th className="py-2 px-3 text-center">HSN</th>
                              <th className="py-2 px-3 text-center">Quá Hạn</th>
                              <th className="py-2 px-3 text-center">Trạng Thái</th>
                              <th className="py-2 px-3">NV / Ngày giờ</th>
                              <th className="py-2 px-3 text-center">Thao Tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredQuaHanCustomers.length > 0 ? (
                              filteredQuaHanCustomers.slice((quaHanPage - 1) * PAGE_SIZE, quaHanPage * PAGE_SIZE).map((c, idx) => {
                                const stt = (quaHanPage - 1) * PAGE_SIZE + idx + 1;
                                const isDone = Boolean(c.ketQua && c.ketQua.toLowerCase().includes('xong'));
                                const hsnVal = c.hsn !== undefined && c.hsn !== '' ? c.hsn : resolveHsn(c);
                                return (
                                  <tr key={c.maKh} className="hover:bg-rose-50/40 transition-colors">
                                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{stt}</td>
                                    <td className="py-2 px-3 font-mono font-bold text-rose-900">{c.maKh}</td>
                                    <td className="py-2 px-3 font-medium text-slate-800">{c.tenKh}</td>
                                    <td className="py-2 px-3 font-mono">
                                      {c.sdt ? (
                                        <a
                                          href={`tel:${c.sdt}`}
                                          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-full font-bold text-[11px] transition-colors"
                                          title={`Bấm để gọi điện: ${c.sdt}`}
                                        >
                                          <Phone className="w-3 h-3 text-emerald-600" />
                                          <span>{c.sdt}</span>
                                        </a>
                                      ) : (
                                        <span className="text-slate-300 font-mono text-[11px]">—</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-slate-600 truncate max-w-xs" title={c.diaChi}>{c.diaChi}</td>
                                    <td className="py-2 px-3 font-semibold text-slate-700">{c.kv}</td>
                                    <td className="py-2 px-3 font-mono text-slate-600">Đợt {c.dot}</td>
                                    <td className="py-2 px-3">
                                      {c.chungLoaiCanThay ? (
                                        <span className="font-bold text-amber-950 bg-amber-100/80 px-2 py-0.5 rounded text-[11px] border border-amber-300/80 inline-block">
                                          {c.chungLoaiCanThay}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300 text-[11px] font-mono">—</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-center font-mono font-bold text-amber-900">{hsnVal}</td>
                                    <td className="py-2 px-3 text-center">
                                      <span className="bg-rose-100 text-rose-900 text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-rose-300">
                                        <ShieldAlert className="w-3 h-3 text-rose-600" /> Quá hạn
                                      </span>
                                    </td>
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
                                    <td className="py-2 px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleSelectCustomerFromReport(c)}
                                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
                                        title="Chuyển sang Tab 1 để cập nhật / thay công tơ cho khách hàng quá hạn này"
                                      >
                                        Chọn xử lý ➔
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={13} className="py-6 text-center text-slate-400 text-xs">
                                  Không tìm thấy khách hàng quá hạn nào phù hợp với bộ lọc.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Phân trang Quá Hạn */}
                      {Math.ceil(filteredQuaHanCustomers.length / PAGE_SIZE) > 1 && (
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs">
                          <span className="text-slate-500 text-[11px]">
                            Trang <b>{quaHanPage}</b> / <b>{Math.ceil(filteredQuaHanCustomers.length / PAGE_SIZE)}</b> ({filteredQuaHanCustomers.length} khách hàng quá hạn)
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setQuaHanPage(p => Math.max(1, p - 1))}
                              disabled={quaHanPage <= 1}
                              className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold"
                            >
                              Trước
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuaHanPage(p => Math.min(Math.ceil(filteredQuaHanCustomers.length / PAGE_SIZE), p + 1))}
                              disabled={quaHanPage >= Math.ceil(filteredQuaHanCustomers.length / PAGE_SIZE)}
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
                onClick={() => toggleSection('reportQuaHan')}
                className="p-3 bg-slate-50 hover:bg-rose-50/50 rounded-xl border border-dashed border-slate-200 flex items-center justify-between cursor-pointer transition-colors text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold text-slate-700 truncate">
                    Báo cáo tiến độ khách hàng Quá hạn đang thu gọn ({reportTotals.quaHanDaThay}/{reportTotals.quaHanTong} KH - {reportTotals.quaHanTyLeChung}%)
                  </span>
                </div>
                <span className="text-[11px] text-rose-700 font-bold hover:underline shrink-0 ml-2">
                  Bung ra ▾
                </span>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 4. KHỐI BÁO CÁO CHUYÊN ĐỀ: KẾT QUẢ RÀ SOÁT KHÁCH HÀNG THU HỒI (CỘT KQRASOAT) */}
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
                  <div
                    onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'tong_thu_hoi', label: 'Toàn Đội • Tổng Diện Thu Hồi & Rà Soát', badgeColor: 'indigo' })}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 cursor-pointer transition-all hover:shadow-2xs group"
                    title="Bấm để xem danh sách toàn bộ khách hàng diện thu hồi"
                  >
                    <span className="text-[10px] font-bold uppercase text-slate-600 group-hover:text-slate-900">Tổng Diện Thu Hồi</span>
                    <div className="text-xl font-black text-slate-900 mt-1">{reportTotals.thuHoiScopeTong}</div>
                    <span className="text-[10px] text-slate-400 group-hover:text-slate-600">KH không sử dụng / có KQ</span>
                  </div>

                  <div
                    onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'da_ra_soat', label: 'Toàn Đội • Khách Hàng Đã Rà Soát', badgeColor: 'indigo' })}
                    className="p-3 rounded-xl bg-indigo-50/60 hover:bg-indigo-100/60 border border-indigo-200/80 hover:border-indigo-300 cursor-pointer transition-all hover:shadow-2xs group"
                    title="Bấm để xem danh sách khách hàng đã rà soát"
                  >
                    <span className="text-[10px] font-bold uppercase text-indigo-700 group-hover:text-indigo-900">Đã Rà Soát</span>
                    <div className="text-xl font-black text-indigo-900 mt-1 flex items-baseline gap-1">
                      <span>{reportTotals.rsDaRaSoat}</span>
                      <span className="text-xs font-bold text-indigo-600">({reportTotals.rsTyLeChung}%)</span>
                    </div>
                    <span className="text-[10px] text-indigo-600 group-hover:text-indigo-800">Đã cập nhật KQRaSoat</span>
                  </div>

                  <div
                    onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'su_dung_lai', label: 'Toàn Đội • Rà Soát Sử Dụng Lại (Được Phép Thay)', badgeColor: 'emerald' })}
                    className="p-3 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200 hover:border-emerald-300 cursor-pointer transition-all hover:shadow-2xs group"
                    title="Bấm để xem danh sách KH sử dụng lại"
                  >
                    <span className="text-[10px] font-bold uppercase text-emerald-800 group-hover:text-emerald-900">Sử Dụng Lại</span>
                    <div className="text-xl font-black text-emerald-900 mt-1">{reportTotals.rsSuDungLai}</div>
                    <span className="text-[10px] text-emerald-700 group-hover:text-emerald-900">Đã mở khóa, được phép thay</span>
                  </div>

                  <div
                    onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'thu_hoi', label: 'Toàn Đội • Rà Soát Xác Nhận Thu Hồi (Giữ Nguyên)', badgeColor: 'rose' })}
                    className="p-3 rounded-xl bg-rose-50/60 hover:bg-rose-100/60 border border-rose-200/80 hover:border-rose-300 cursor-pointer transition-all hover:shadow-2xs group"
                    title="Bấm để xem danh sách KH xác nhận thu hồi"
                  >
                    <span className="text-[10px] font-bold uppercase text-rose-700 group-hover:text-rose-900">Thu Hồi (Giữ Nguyên)</span>
                    <div className="text-xl font-black text-rose-800 mt-1">{reportTotals.rsThuHoi}</div>
                    <span className="text-[10px] text-rose-600 group-hover:text-rose-800">Xác nhận không sử dụng</span>
                  </div>

                  <div
                    onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'khac', label: 'Toàn Đội • Rà Soát Trường Hợp Khác', badgeColor: 'slate' })}
                    className="p-3 rounded-xl bg-amber-50/50 hover:bg-amber-100/60 border border-amber-200/60 hover:border-amber-300 cursor-pointer transition-all hover:shadow-2xs group"
                    title="Bấm để xem danh sách KH rà soát trường hợp khác"
                  >
                    <span className="text-[10px] font-bold uppercase text-amber-800 group-hover:text-amber-950">Khác</span>
                    <div className="text-xl font-black text-amber-900 mt-1">{reportTotals.rsKhac}</div>
                    <span className="text-[10px] text-amber-700 group-hover:text-amber-900">Có kèm nội dung diễn giải</span>
                  </div>

                  <div
                    onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'chua_ra_soat', label: 'Toàn Đội • Khách Hàng Chưa Rà Soát', badgeColor: 'amber' })}
                    className="p-3 rounded-xl bg-amber-50/80 hover:bg-amber-100/90 border border-amber-300 hover:border-amber-400 cursor-pointer transition-all hover:shadow-2xs group"
                    title="Bấm để xem danh sách KH chưa rà soát"
                  >
                    <span className="text-[10px] font-bold uppercase text-amber-900 group-hover:text-amber-950">Chưa Rà Soát</span>
                    <div className="text-xl font-black text-amber-950 mt-1">{reportTotals.rsChuaRaSoat}</div>
                    <span className="text-[10px] text-amber-800 group-hover:text-amber-950 font-medium">Cần hoàn tất rà soát</span>
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
                            <td className="py-2.5 px-3">
                              <button
                                type="button"
                                onClick={() => handleDrillDown({ source: 'ra_soat', dot: r.dot, kv: r.kv, metric: 'tong_thu_hoi', label: `Đợt ${r.dot} - ${r.kv} • Tổng ${r.thuHoiScopeTong} Thu Hồi`, badgeColor: 'indigo' })}
                                className="font-bold text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer text-left"
                                title="Bấm để xem danh sách diện thu hồi của đợt này"
                              >
                                Đợt {r.dot}
                              </button>
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                type="button"
                                onClick={() => handleDrillDown({ source: 'ra_soat', dot: r.dot, kv: r.kv, metric: 'tong_thu_hoi', label: `Đợt ${r.dot} - ${r.kv} • Tổng ${r.thuHoiScopeTong} Thu Hồi`, badgeColor: 'indigo' })}
                                className="font-bold text-amber-900 hover:text-indigo-600 hover:underline cursor-pointer text-left"
                                title="Bấm để xem danh sách diện thu hồi của khu vực này"
                              >
                                {r.kv}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDrillDown({ source: 'ra_soat', dot: r.dot, kv: r.kv, metric: 'tong_thu_hoi', label: `Đợt ${r.dot} - ${r.kv} • Tổng ${r.thuHoiScopeTong} Thu Hồi`, badgeColor: 'indigo' })}
                                className="font-mono font-bold text-slate-800 hover:text-indigo-600 hover:underline cursor-pointer"
                                title="Xem tất cả KH diện thu hồi"
                              >
                                {r.thuHoiScopeTong}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDrillDown({ source: 'ra_soat', dot: r.dot, kv: r.kv, metric: 'da_ra_soat', label: `Đợt ${r.dot} - ${r.kv} • ${r.rsDaRaSoat} Đã Rà Soát`, badgeColor: 'indigo' })}
                                className="font-mono font-bold text-indigo-800 hover:text-indigo-950 hover:underline cursor-pointer"
                                title="Xem danh sách KH đã rà soát"
                              >
                                {r.rsDaRaSoat}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDrillDown({ source: 'ra_soat', dot: r.dot, kv: r.kv, metric: 'da_ra_soat', label: `Đợt ${r.dot} - ${r.kv} • Đã Rà Soát (${r.rsTyLe}%)`, badgeColor: 'indigo' })}
                                className="cursor-pointer transition-transform hover:scale-105"
                                title="Xem danh sách KH đã rà soát"
                              >
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  r.rsTyLe === 100
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : r.rsTyLe >= 50
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {r.rsTyLe}%
                                </span>
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDrillDown({ source: 'ra_soat', dot: r.dot, kv: r.kv, metric: 'su_dung_lai', label: `Đợt ${r.dot} - ${r.kv} • ${r.rsSuDungLai} KH Sử Dụng Lại`, badgeColor: 'emerald' })}
                                className="font-mono font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                                title="Xem danh sách KH sử dụng lại"
                              >
                                {r.rsSuDungLai}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDrillDown({ source: 'ra_soat', dot: r.dot, kv: r.kv, metric: 'thu_hoi', label: `Đợt ${r.dot} - ${r.kv} • ${r.rsThuHoi} KH Thu Hồi`, badgeColor: 'rose' })}
                                className="font-mono font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                                title="Xem danh sách KH thu hồi"
                              >
                                {r.rsThuHoi}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDrillDown({ source: 'ra_soat', dot: r.dot, kv: r.kv, metric: 'khac', label: `Đợt ${r.dot} - ${r.kv} • ${r.rsKhac} KH Khác`, badgeColor: 'slate' })}
                                className="font-mono font-bold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
                                title="Xem danh sách KH khác"
                              >
                                {r.rsKhac}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDrillDown({ source: 'ra_soat', dot: r.dot, kv: r.kv, metric: 'chua_ra_soat', label: `Đợt ${r.dot} - ${r.kv} • ${r.rsChuaRaSoat} KH Chưa Rà Soát`, badgeColor: 'amber' })}
                                className="font-mono font-bold text-amber-900 hover:text-amber-700 hover:underline cursor-pointer"
                                title="Xem danh sách KH chưa rà soát"
                              >
                                {r.rsChuaRaSoat}
                              </button>
                            </td>
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
                          <td colSpan={3} className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'tong_thu_hoi', label: 'Toàn Đội • Tổng Cộng Diện Thu Hồi', badgeColor: 'indigo' })}
                              className="hover:underline cursor-pointer uppercase font-bold"
                              title="Bấm để xem toàn bộ KH diện thu hồi toàn công ty"
                            >
                              TỔNG CỘNG DIỆN THU HỒI:
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'tong_thu_hoi', label: `Toàn Đội • ${reportTotals.thuHoiScopeTong} KH Diện Thu Hồi`, badgeColor: 'indigo' })}
                              className="font-mono hover:underline cursor-pointer font-bold"
                              title="Xem toàn bộ KH diện thu hồi"
                            >
                              {reportTotals.thuHoiScopeTong}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-indigo-900">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'da_ra_soat', label: `Toàn Đội • ${reportTotals.rsDaRaSoat} KH Đã Rà Soát`, badgeColor: 'indigo' })}
                              className="font-mono text-indigo-900 hover:underline cursor-pointer font-bold"
                              title="Xem toàn bộ KH đã rà soát"
                            >
                              {reportTotals.rsDaRaSoat}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-indigo-900">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'da_ra_soat', label: `Toàn Đội • Đã Rà Soát (${reportTotals.rsTyLeChung}%)`, badgeColor: 'indigo' })}
                              className="font-mono text-indigo-900 hover:underline cursor-pointer font-bold"
                              title="Xem KH đã rà soát"
                            >
                              {reportTotals.rsTyLeChung}%
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'su_dung_lai', label: `Toàn Đội • ${reportTotals.rsSuDungLai} KH Sử Dụng Lại`, badgeColor: 'emerald' })}
                              className="font-mono text-emerald-800 hover:underline cursor-pointer font-bold"
                              title="Xem KH sử dụng lại"
                            >
                              {reportTotals.rsSuDungLai}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'thu_hoi', label: `Toàn Đội • ${reportTotals.rsThuHoi} KH Thu Hồi`, badgeColor: 'rose' })}
                              className="font-mono text-rose-700 hover:underline cursor-pointer font-bold"
                              title="Xem KH thu hồi"
                            >
                              {reportTotals.rsThuHoi}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'khac', label: `Toàn Đội • ${reportTotals.rsKhac} KH Khác`, badgeColor: 'slate' })}
                              className="font-mono text-slate-800 hover:underline cursor-pointer font-bold"
                              title="Xem KH khác"
                            >
                              {reportTotals.rsKhac}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-950 font-black">
                            <button
                              type="button"
                              onClick={() => handleDrillDown({ source: 'ra_soat', dot: 'all', kv: 'all', metric: 'chua_ra_soat', label: `Toàn Đội • ${reportTotals.rsChuaRaSoat} KH Chưa Rà Soát`, badgeColor: 'amber' })}
                              className="font-mono text-amber-950 font-black hover:underline cursor-pointer"
                              title="Xem KH chưa rà soát"
                            >
                              {reportTotals.rsChuaRaSoat}
                            </button>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Danh sách chi tiết từng khách hàng diện thu hồi & KQ rà soát (Bật/Tắt) */}
                {showRaSoatDetails && (
                  <div
                    ref={detailTableRef}
                    className="mt-4 p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 space-y-3 animate-in fade-in duration-200 scroll-mt-6"
                  >
                    {/* Banner hiển thị khi người dùng click vào phần tử từ bảng báo cáo để drill-down */}
                    {activeReportSelection.source !== 'none' && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-indigo-100/70 border border-indigo-300 text-xs shadow-2xs">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="p-1.5 rounded-lg bg-indigo-700 text-white shadow-2xs">
                            <Filter className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Đang lọc danh sách chi tiết:</div>
                            <div className="font-bold text-indigo-950 text-sm flex items-center gap-2 mt-0.5">
                              <span>{activeReportSelection.label}</span>
                              <span className="bg-white text-indigo-900 border border-indigo-300 px-2 py-0.5 rounded-full text-xs font-black shadow-2xs">
                                {filteredRaSoatCustomers.length} khách hàng
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearDrillDown}
                          className="px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-50 border border-rose-300 rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          title="Bỏ lọc và quay về danh sách mặc định"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Bỏ lọc / Về mặc định</span>
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-indigo-900 mr-1">Lọc kết quả:</span>
                        <button
                          type="button"
                          onClick={() => { setRaSoatFilter('all'); setRaSoatPage(1); }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            raSoatFilter === 'all' ? 'bg-indigo-700 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Tất cả ({activeReportSelection.source === 'none' ? thuHoiReviewCustomerList.length : filteredRaSoatCustomers.length})
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

                      <div className="flex items-center gap-2 w-full lg:w-auto">
                        {/* Ô tìm kiếm khách hàng */}
                        <div className="relative flex-1 sm:w-64">
                          <input
                            type="text"
                            value={raSoatSearch}
                            onChange={(e) => { setRaSoatSearch(e.target.value); setRaSoatPage(1); }}
                            placeholder="Tìm Mã KH, Tên, SĐT, Chủng loại..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        </div>

                        {/* Nút Kết xuất Excel cho Bảng danh sách chi tiết */}
                        <button
                          type="button"
                          onClick={handleExportDetailTableExcel}
                          disabled={filteredRaSoatCustomers.length === 0}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="Xuất file Excel cho toàn bộ danh sách khách hàng đang hiển thị ở bảng này"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Xuất Excel Chi Tiết</span>
                          <span className="sm:hidden">Xuất Excel</span>
                          <span className="bg-emerald-800 px-1.5 py-0.2 rounded text-[10px]">
                            {filteredRaSoatCustomers.length}
                          </span>
                        </button>
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
                              <th className="py-2 px-3">Số Điện Thoại</th>
                              <th className="py-2 px-3">Khu Vực</th>
                              <th className="py-2 px-3">Đợt</th>
                              <th className="py-2 px-3">Chủng Loại Cần Thay</th>
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
                                    <td className="py-2 px-3 font-mono">
                                      {c.sdt ? (
                                        <a
                                          href={`tel:${c.sdt}`}
                                          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-full font-bold text-[11px] transition-colors"
                                          title={`Bấm để gọi điện: ${c.sdt}`}
                                        >
                                          <Phone className="w-3 h-3 text-emerald-600" />
                                          <span>{c.sdt}</span>
                                        </a>
                                      ) : (
                                        <span className="text-slate-300 font-mono text-[11px]">—</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 font-semibold text-slate-700">{c.kv}</td>
                                    <td className="py-2 px-3 font-mono text-slate-600">Đợt {c.dot}</td>
                                    <td className="py-2 px-3">
                                      {c.chungLoaiCanThay ? (
                                        <span className="font-bold text-amber-950 bg-amber-100/80 px-2 py-0.5 rounded text-[11px] border border-amber-300/80 inline-block">
                                          {c.chungLoaiCanThay}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300 text-[11px] font-mono">—</span>
                                      )}
                                    </td>
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
                                <td colSpan={12} className="py-6 text-center text-slate-400 text-xs">
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

      {/* ========================================================= */}
      {/* SUB-TAB 3: BÁO CÁO NGÀY & KẾ HOẠCH TUẦN (QĐ 963)           */}
      {/* ========================================================= */}
      {activeSubTab === 'bao_cao_ngay' && (
        <Tab963BaoCaoNgay
          entries963={entries}
          sessionUser={sessionUser}
          showToast={showToast}
        />
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 4: ĐIỆN KẾ (THEO DÕI NHẬP & THAY ĐIỆN KẾ QĐ 963) */}
      {/* ========================================================= */}
      {activeSubTab === 'dien_ke' && (
        canAccessDienKe ? (
          <Tab963DienKe
            entries963={entries}
            sessionUser={sessionUser}
            onRefreshData={() => refreshData(true)}
            showToast={showToast}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Không Đủ Quyền Truy Cập Tab Điện Kế
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Chức năng Quản lý Điện Kế (Tab 3 QĐ 963) không cho phép tài khoản nhân viên sử dụng, chỉ cho phép từ cấp <b>Tổ phó, Tổ trưởng trở lên</b> theo quy định phân quyền trong tab <b>Hệ thống</b>.
            </p>
            <button
              type="button"
              onClick={() => setActiveSubTab('thuc_hien')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Quay lại Tab Thực Hiện
            </button>
          </div>
        )
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

      {/* Hidden File Input for HSN Audit */}
      <input
        type="file"
        ref={hsnFileInputRef}
        accept=".xlsx, .xls, .csv"
        onChange={handleHsnAuditFileUpload}
        className="hidden"
      />

      {/* MODAL RÀ SOÁT HỆ SỐ NHÂN (HSN / HSNHAN) KHI TREO CÔNG TƠ */}
      {showHsnAuditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                  <ClipboardCheck className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wide">
                    Rà Soát Hệ Số Nhân (HSN) Khi Treo Công Tơ
                  </h3>
                  <p className="text-[11px] text-indigo-200 font-medium">
                    Đối soát HSN giữa dữ liệu Sheet 963 và file thực tế treo tháo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHsnAuditModal(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
              {/* Giới thiệu tính năng */}
              <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-xl space-y-2 text-indigo-950">
                <div className="font-bold flex items-center gap-1.5 text-xs text-indigo-900">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Mục đích & Cách thức hoạt động:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11px] leading-relaxed text-indigo-900/90">
                  <li>
                    So sánh <b>Hệ Số Nhân (HSN)</b> của các khách hàng <b>đã thay xong</b> trong Sheet 963 với file biên bản / số liệu treo từ CMIS.
                  </li>
                  <li>
                    Tự động nhận diện cột Mã KH (<code>MA_KHANG</code>, <code>MA_KH</code>, <code>Mã KH</code>...) và cột HSN (<code>HSNHAN_TREO</code>, <code>HSN_TREO</code>, <code>HSNHAN</code>, <code>HSN</code>...).
                  </li>
                  <li>
                    Cảnh báo <b>Sai HSN</b> nếu HSN đã nhập khác với file đưa vào; cảnh báo <b>Thiếu trong file</b> nếu khách hàng đã thay xong nhưng không có trong file đối soát.
                  </li>
                </ul>
              </div>

              {/* Trạng thái file hiện tại nếu đã tải */}
              {hsnAuditMap && hsnAuditStats && (
                <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl space-y-2 text-amber-950">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      File đối soát hiện tại: <u>{hsnAuditFileName}</u> ({hsnAuditTotalRows} dòng)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setHsnAuditMap(null);
                        setHsnAuditFileName('');
                        setHsnAuditFilter('all');
                        showToast('info', 'Đã xóa file đối soát HSN');
                      }}
                      className="text-[11px] text-rose-700 font-bold hover:underline cursor-pointer"
                    >
                      Xóa file này
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 bg-white rounded-lg border border-amber-200">
                      <div className="text-[10px] text-slate-500 font-medium">Khớp HSN</div>
                      <div className="text-sm font-black text-emerald-600">{hsnAuditStats.matchCount}</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-rose-300">
                      <div className="text-[10px] text-rose-700 font-medium">Sai HSN</div>
                      <div className="text-sm font-black text-rose-600">{hsnAuditStats.diffCount}</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-amber-300">
                      <div className="text-[10px] text-amber-800 font-medium">Thiếu trong file</div>
                      <div className="text-sm font-black text-amber-700">{hsnAuditStats.missingCount}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Khu vực chọn file import */}
              <div className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-slate-50/70 hover:bg-indigo-50/30 p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-3 text-indigo-700 shadow-inner">
                  <FileUp className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-slate-800 mb-1">
                  Chọn file Excel đối soát (.xlsx, .xls, .csv)
                </h4>
                <p className="text-[11px] text-slate-500 max-w-md mb-4">
                  File cần có cột <b>MA_KHANG</b> (hoặc MA_KH) và cột <b>HSNHAN_TREO</b> (hoặc HSNHAN, HSN). Hệ thống sẽ tự động quét và đối chiếu ngay lập tức.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => hsnFileInputRef.current?.click()}
                    className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{hsnAuditMap ? 'Chọn Tải Lại File Khác...' : 'Chọn File Đối Soát Từ Máy Tính'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadHsnTemplate}
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Tải file Excel mẫu (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Hướng dẫn quy chuẩn các cột */}
              <div className="p-3 bg-slate-100 rounded-xl space-y-1.5 text-[11px] text-slate-600">
                <div className="font-bold text-slate-700 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span>Quy định tiêu đề cột được tự động nhận diện:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="font-bold text-indigo-700">Cột Mã Khách Hàng:</span>
                    <p className="text-slate-600 mt-0.5">MA_KHANG, MA_KH, Mã KH, Mã khách hàng, Customer_ID...</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="font-bold text-indigo-700">Cột Hệ Số Nhân:</span>
                    <p className="text-slate-600 mt-0.5">HSNHAN_TREO, HSN_TREO, HSNHAN, HSN, Hệ số nhân, HSN treo...</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {hsnAuditMap ? `✓ Đang áp dụng kết quả từ file: ${hsnAuditFileName}` : 'Chưa tải file đối soát'}
              </span>
              <div className="flex items-center gap-2">
                {hsnAuditMap && (
                  <button
                    type="button"
                    onClick={() => setShowHsnAuditModal(false)}
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Xem kết quả trong bảng
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowHsnAuditModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bổ Sung Ảnh Công Tơ Cho KH Đã Thay Xong */}
      {addPicModalCustomer && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          onClick={() => {
            if (!isSubmittingPic) {
              setAddPicModalCustomer(null);
              setMeterPicBase64(null);
              setMeterPicSizeKb(0);
            }
          }}
        >
          <div 
            className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Bổ Sung Ảnh Công Tơ Sau Khi Thay</h4>
                  <p className="text-[11px] text-amber-100">Lưu vào Google Drive & ghi link vào cột Pic (Sheet 963)</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmittingPic}
                onClick={() => {
                  setAddPicModalCustomer(null);
                  setMeterPicBase64(null);
                  setMeterPicSizeKb(0);
                }}
                className="p-1.5 hover:bg-white/20 text-white/90 hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Thông tin khách hàng */}
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="font-bold text-slate-900 text-sm">{addPicModalCustomer.tenKh}</span>
                  <span className="font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold border border-amber-300">
                    {addPicModalCustomer.maKh}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  <b>Địa chỉ:</b> {addPicModalCustomer.diaChi || '—'}
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-600 flex-wrap">
                  <span><b>Ngày thay:</b> {addPicModalCustomer.ngayGio || '—'}</span>
                  <span><b>NV thực hiện:</b> {addPicModalCustomer.nv || '—'}</span>
                  <span><b>HSN:</b> {addPicModalCustomer.hsn || '—'}</span>
                </div>
              </div>

              {/* Ảnh đã chọn hoặc khung chụp ảnh */}
              {meterPicBase64 ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={meterPicBase64}
                      alt={`Ảnh công tơ 963_${addPicModalCustomer.maKh}`}
                      className="w-24 h-24 object-cover rounded-lg border-2 border-amber-500 shadow-sm shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded inline-block">
                        963_{addPicModalCustomer.maKh}.jpg
                      </div>
                      <div className="text-[11px] text-emerald-700 font-bold">
                        Đã tối ưu hóa: {meterPicSizeKb} KB
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Ảnh đã sẵn sàng để lưu vào Google Drive folder và cập nhật link vào cột Pic.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isProcessingPic || isSubmittingPic}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Chụp lại</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingPic || isSubmittingPic}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Chọn ảnh khác</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMeterPicBase64(null);
                        setMeterPicSizeKb(0);
                      }}
                      disabled={isSubmittingPic}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hủy ảnh</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 border-2 border-dashed border-amber-300 bg-amber-50/40 rounded-xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">Chưa có ảnh công tơ cho khách hàng này</p>
                    <p className="text-[11px] text-slate-500">Chụp ảnh công tơ rõ nét số hiệu, chỉ số và sơ đồ đấu dây</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isProcessingPic}
                      className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Chụp ảnh (Mặc định)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingPic}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4 text-slate-600" />
                      <span>Tải ảnh từ máy</span>
                    </button>
                  </div>
                  {isProcessingPic && (
                    <div className="text-xs text-amber-800 font-medium flex items-center justify-center gap-1.5 animate-pulse pt-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      Đang nén tối ưu dung lượng siêu nhẹ...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isSubmittingPic}
                onClick={() => {
                  setAddPicModalCustomer(null);
                  setMeterPicBase64(null);
                  setMeterPicSizeKb(0);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-xl cursor-pointer disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleSaveSupplementaryPic(addPicModalCustomer)}
                disabled={!meterPicBase64 || isSubmittingPic}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingPic ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang lưu lên Drive & Cột Pic...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu Vào Google Drive & Cột Pic</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Inputs for Meter Photo: Camera & Device File Picker */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleProcessImageFile(f);
          e.target.value = '';
        }}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleProcessImageFile(f);
          e.target.value = '';
        }}
      />

      {/* Lightbox / Zoom Modal for Meter Photo & Wiring Diagram */}
      {zoomPicUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          onClick={() => setZoomPicUrl(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-3 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
              <div className="font-bold text-xs truncate flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">{zoomPicUrl.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {zoomPicUrl.url.startsWith('http') && (
                  <a
                    href={zoomPicUrl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 text-xs font-semibold shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở Drive</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setZoomPicUrl(null)}
                  className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-2 sm:p-4 flex items-center justify-center max-h-[75vh] overflow-auto bg-black/50">
              <img
                src={getDrivePreviewUrl(zoomPicUrl.url)}
                alt={zoomPicUrl.title}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
              />
            </div>
            <div className="p-2.5 bg-slate-800/90 text-[11px] text-slate-300 text-center border-t border-slate-700/80">
              Ảnh công tơ kèm sơ đồ đấu dây sau khi thay • Lưu trữ an toàn tại Google Drive
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
