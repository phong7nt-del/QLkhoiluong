import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FolderTree,
  Search,
  Mic,
  MicOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Users,
  Building2,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Save,
  Download,
  Filter,
  X,
  Phone,
  PhoneCall,
  MessageCircle,
  Navigation,
  MapPin,
  FileSpreadsheet,
  Check,
  Clock,
  Layers,
  BarChart3,
  ListFilter,
  SlidersHorizontal,
  Info,
  Maximize2,
  Minimize2,
  RotateCcw,
  Zap,
  ScanBarcode,
  Crosshair,
  Pencil,
  Plus,
  Camera,
  Image as ImageIcon,
  Trash2,
  Eye,
  ExternalLink,
  Loader2,
  Upload,
  FolderOpen
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { DataStore, KthtddEntry, SheetMember } from '../store/DataStore';
import BarcodeScannerModal from './BarcodeScannerModal';

export interface StationNode {
  maTram: string;
  tenTram: string;
  khuVuc: string;
  nguoiThucHien: string;
  totalKh: number;
  checkedKh: number;
  customers: KthtddEntry[];
}

export interface AreaNode {
  khuVuc: string;
  totalKh: number;
  checkedKh: number;
  stations: Record<string, StationNode>;
}

interface KthtddTabProps {
  sessionUser: SheetMember | null;
  refreshToggle?: number;
}

// Helper: Normalize string for diacritic-insensitive search & role comparison
export const normalizeSearchStr = (s: any): string =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();

// Helper: Format phone number with leading 0 (e.g. 989667788 -> 0989667788, 0989667788 -> 0989667788)
// Quy tắc: Nếu số điện thoại không có số 0 ở đầu thì thêm số 0 vào đầu, nếu đã có số 0 đầu thì không cần thêm.
export const formatPhoneNumber = (rawPhone?: string | number): string => {
  if (rawPhone === undefined || rawPhone === null) return '';
  let p = String(rawPhone).trim();
  if (!p || p === '0' || p === '-' || p === 'N/A' || p === 'null' || p === 'undefined') return '';
  // Xóa các ký tự khoảng trắng, dấu chấm, dấu gạch ngang
  let clean = p.replace(/[\s\.\-_]/g, '');
  // Xử lý mã quốc gia Việt Nam (+84 hoặc 84)
  if (clean.startsWith('+84')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('84') && clean.length >= 11) {
    clean = '0' + clean.slice(2);
  }
  // Nếu là chuỗi số: nếu không có số 0 ở đầu thì thêm số 0, nếu đã có số 0 đầu thì không cần thêm
  if (/^\d+$/.test(clean)) {
    if (!clean.startsWith('0')) {
      clean = '0' + clean;
    }
    return clean;
  }
  // Dự phòng trường hợp còn ký tự khác nhưng bắt đầu bằng số
  if (!p.startsWith('0') && /^\d/.test(p)) {
    return '0' + p;
  }
  return p;
};

// Bộ nhớ đệm tọa độ GPS để lấy tức thì trong 0ms khi người dùng bấm Lưu
let cachedGPSCoords: { x: string; y: string; time: number } | null = null;

if (typeof window !== 'undefined' && 'geolocation' in navigator) {
  try {
    navigator.geolocation.watchPosition(
      (pos) => {
        cachedGPSCoords = {
          x: pos.coords.latitude.toFixed(6),
          y: pos.coords.longitude.toFixed(6),
          time: Date.now()
        };
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 }
    );
  } catch (e) {}
}

// Helper: Tự động lấy tọa độ GPS của thiết bị khi lưu kết quả kiểm tra (Tối ưu phản hồi tức thì)
export const getCurrentGPSCoords = (): Promise<{ x: string; y: string } | null> => {
  // 1. Nếu có tọa độ vừa lấy trong vòng 3 phút -> trả về ngay lập tức (0ms)
  if (cachedGPSCoords && Date.now() - cachedGPSCoords.time < 180000) {
    return Promise.resolve({ x: cachedGPSCoords.x, y: cachedGPSCoords.y });
  }

  // 2. Nếu chưa có, yêu cầu nhanh với timeout ngắn 600ms để không làm người dùng phải chờ đợi
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(cachedGPSCoords ? { x: cachedGPSCoords.x, y: cachedGPSCoords.y } : null);
      }
    }, 600);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          const x = position.coords.latitude.toFixed(6);
          const y = position.coords.longitude.toFixed(6);
          cachedGPSCoords = { x, y, time: Date.now() };
          resolve({ x, y });
        }
      },
      (error) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(cachedGPSCoords ? { x: cachedGPSCoords.x, y: cachedGPSCoords.y } : null);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 600,
        maximumAge: 60000
      }
    );
  });
};

// Helper: Tính khoảng cách theo mét giữa 2 tọa độ GPS (Công thức Haversine)
export const calculateDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 0;
  const R = 6371000; // Bán kính Trái Đất (mét)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper: Nén ảnh chụp công tơ để đạt kích thước nhỏ nhất (~35-50KB) siêu nhanh nhưng vẫn cực kỳ rõ nét mặt số
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

// Helper: Trích xuất ID file từ URL Google Drive để xóa hoặc thao tác O(1) < 50ms
export const extractDriveFileId = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  const match = trimmed.match(/(?:id=|file\/d\/)([a-zA-Z0-9_-]+)/);
  return match && match[1] ? match[1] : '';
};

// Helper: Chuyển đổi link Google Drive thành link thumbnail trực tiếp có thể hiển thị trong thẻ <img> mượt mà
export const getDrivePreviewUrl = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image')) return trimmed;
  const match = trimmed.match(/(?:id=|file\/d\/)([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return trimmed;
};

// Helper: Lấy liên kết mở trực tiếp file trên Google Drive
export const getDriveDirectViewUrl = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image')) return '';
  const match = trimmed.match(/(?:id=|file\/d\/)([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/view?usp=drivesdk`;
  }
  return trimmed;
};

// Helper: Tạo liên kết chỉ đường Google Maps đến tọa độ GPS hoặc địa chỉ của khách hàng
export const getCustomerDirectionsUrl = (
  diaChi?: string,
  khuVuc?: string,
  tenTram?: string,
  x?: string | number,
  y?: string | number
): string => {
  // 1. Ưu tiên: Nếu khách hàng có tọa độ X và Y thì chỉ đường trực tiếp tới tọa độ GPS đó
  if (x !== undefined && y !== undefined && String(x).trim() !== '' && String(y).trim() !== '') {
    const rawX = String(x).trim().replace(',', '.');
    const rawY = String(y).trim().replace(',', '.');
    const numX = parseFloat(rawX);
    const numY = parseFloat(rawY);
    if (!isNaN(numX) && !isNaN(numY) && numX !== 0 && numY !== 0) {
      // Phân biệt Lat/Lng thông minh (ở VN: Vĩ độ ~8-24, Kinh độ ~102-110)
      let lat = numX;
      let lng = numY;
      if (numX > 50 && numY < 50) {
        lat = numY;
        lng = numX;
      }
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
  }

  // 2. Không có tọa độ X, Y -> sử dụng chỉ đường theo địa chỉ hiện hữu
  if (!diaChi && !tenTram) return '';
  const parts: string[] = [];
  if (diaChi) parts.push(diaChi.trim());
  if (khuVuc && khuVuc !== 'Chưa phân khu vực' && !diaChi?.toLowerCase().includes(khuVuc.toLowerCase())) {
    parts.push(khuVuc.trim());
  }
  const full = parts.join(', ');
  const hasProvince = /vũng tàu|vung tau|bà rịa|ba ria|phú mỹ|phu my/i.test(full);
  const finalQuery = hasProvince ? full : `${full}, Bà Rịa - Vũng Tàu`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(finalQuery)}`;
};

// Helper: Chuyển chuỗi ngày (dd/mm/yyyy hoặc yyyy-mm-dd) sang đối tượng Date an toàn
export const parseAnyDate = (val?: string | Date | null): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();
  if (!s) return null;

  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      return isNaN(dt.getTime()) ? null : dt;
    }
  }

  if (s.includes('-')) {
    const parts = s.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      return isNaN(dt.getTime()) ? null : dt;
    }
  }

  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
};

export const formatDateToISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatDisplayDate = (d: Date): string => {
  const day = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return `${day}/${m}/${y}`;
};

export const getWeekBoundaries = (d: Date) => {
  const day = d.getDay() || 7; // Thứ 2 = 1, CN = 7
  const monday = new Date(d);
  monday.setDate(d.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
};

export const getISOWeekNumber = (d: Date): number => {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
};

export default function KthtddTab({ sessionUser, refreshToggle = 0 }: KthtddTabProps) {
  // Data state
  const [entries, setEntries] = useState<KthtddEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Horizontal collapse state for Section 2.1 (Sơ đồ cây) - co lại & mở ra theo hướng ngang
  const [treeHorizontalOpen, setTreeHorizontalOpen] = useState(true);

  // Collapsible sections state (Requirement 2)
  const [openSections, setOpenSections] = useState<{
    tree: boolean;
    inspect: boolean;
    list: boolean;
    stats: boolean;
  }>({
    tree: true,
    inspect: true,
    list: true,
    stats: true
  });

  const toggleSection = (sec: 'tree' | 'inspect' | 'list' | 'stats') => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const collapseAllSections = () => {
    setTreeHorizontalOpen(false);
    setOpenSections({ tree: false, inspect: false, list: false, stats: false });
  };

  const expandAllSections = () => {
    setTreeHorizontalOpen(true);
    setOpenSections({ tree: true, inspect: true, list: true, stats: true });
  };

  // Mobile view tab selector: 'tree' | 'inspect' | 'list' | 'stats'
  const [mobileTab, setMobileTab] = useState<'tree' | 'inspect' | 'list' | 'stats'>('tree');

  // Selected customer for inspection (Section 2.2)
  const [selectedMaKh, setSelectedMaKh] = useState<string>('');
  const selectedCustomer = useMemo(() => {
    if (!selectedMaKh) return null;
    return entries.find(e => e.maKh.toLowerCase().trim() === selectedMaKh.toLowerCase().trim()) || null;
  }, [entries, selectedMaKh]);

  // Inspection Form State (Section 2.2)
  const [inspectNgay, setInspectNgay] = useState<string>('');
  const [inspectKetQua, setInspectKetQua] = useState<'Bình thường' | 'Không' | ''>('');
  const [inspectChi, setInspectChi] = useState<'Có' | 'Không' | ''>('');
  const [inspectDeXuat, setInspectDeXuat] = useState<string>('');
  const [isSavingInspect, setIsSavingInspect] = useState(false);
  const [inspectSuccessMsg, setInspectSuccessMsg] = useState<string>('');

  // Meter Photo State (Requirement: Lưu ảnh công tơ lên Google Drive & trường Pic sheet KTHTDD)
  const [inspectPicUrl, setInspectPicUrl] = useState<string>('');
  const [inspectPicPreview, setInspectPicPreview] = useState<string>('');
  const [isUploadingPic, setIsUploadingPic] = useState<boolean>(false);
  const [uploadPicError, setUploadPicError] = useState<string>('');
  const [picSizeKb, setPicSizeKb] = useState<number | null>(null);
  const [showEnlargeModal, setShowEnlargeModal] = useState<boolean>(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPromiseRef = useRef<Promise<string> | null>(null);

  // Voice Input for Đề xuất (Requirement 1)
  const [isListeningDeXuat, setIsListeningDeXuat] = useState(false);
  const [speechDeXuatError, setSpeechDeXuatError] = useState('');
  const recognitionDeXuatRef = useRef<any>(null);

  // Sơ đồ cây (Tree view) State (Section 2.1)
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [speechError, setSpeechError] = useState('');
  const [expandedKhuVuc, setExpandedKhuVuc] = useState<Record<string, boolean>>({});
  const [expandedTram, setExpandedTram] = useState<Record<string, boolean>>({});

  // Barcode Scanner State (Section 2.1)
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeScanToast, setBarcodeScanToast] = useState('');

  // Xử lý khi quét mã Barcode số điện kế (Số No) thành công
  const handleBarcodeScanned = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;
    setSearchQuery(cleanCode);

    // Tìm khách hàng khớp theo Số No, Danh số hoặc Mã KH
    const cleanLower = cleanCode.toLowerCase();
    const matched = entries.find(
      e =>
        (e.soNo && e.soNo.toLowerCase().trim() === cleanLower) ||
        (e.danhSo && e.danhSo.toLowerCase().trim() === cleanLower) ||
        (e.maKh && e.maKh.toLowerCase().trim() === cleanLower)
    );

    if (matched) {
      setSelectedMaKh(matched.maKh);
      setMobileTab('inspect');
      setOpenSections(prev => ({ ...prev, inspect: true }));
      setBarcodeScanToast(`✓ Đã tìm thấy: ${matched.tenKh} (Số No: ${matched.soNo || cleanCode})`);
      setTimeout(() => setBarcodeScanToast(''), 4500);
    } else {
      setBarcodeScanToast(`Đã lọc mã: "${cleanCode}" trên sơ đồ cây`);
      setTimeout(() => setBarcodeScanToast(''), 4500);
    }
  };

  // Assignment Modal State (Section 2.1)
  const [assignStation, setAssignStation] = useState<{ maTram: string; tenTram: string; khuVuc: string; totalKh: number; currentAssignee: string } | null>(null);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [isSavingAssign, setIsSavingAssign] = useState(false);
  const [assignMsg, setAssignMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Section 2.3: Danh sách đã / chưa kiện toàn
  const [listType, setListType] = useState<'done' | 'pending'>('done');
  const [filterKhuVuc, setFilterKhuVuc] = useState('ALL');
  const [filterTram, setFilterTram] = useState('ALL');
  const [filterAssignee, setFilterAssignee] = useState('ALL');
  const [filterKetQua, setFilterKetQua] = useState('ALL');
  const [filterChi, setFilterChi] = useState('ALL');
  const [listSearchText, setListSearchText] = useState('');
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(25);

  // Section 2.4: Thống kê (cho phép chọn giá trị cụ thể theo ngày, tuần, tháng)
  const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month' | 'all'>('day');
  const [statsSelectedDate, setStatsSelectedDate] = useState<string>(() => {
    const d = new Date();
    return formatDateToISO(d);
  });
  const [statsSelectedWeekDate, setStatsSelectedWeekDate] = useState<string>(() => {
    const d = new Date();
    return formatDateToISO(d);
  });
  const [statsSelectedMonth, setStatsSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Navigation handlers for Section 2.4
  const handlePrevDay = () => {
    const d = parseAnyDate(statsSelectedDate) || new Date();
    d.setDate(d.getDate() - 1);
    setStatsSelectedDate(formatDateToISO(d));
  };
  const handleNextDay = () => {
    const d = parseAnyDate(statsSelectedDate) || new Date();
    d.setDate(d.getDate() + 1);
    setStatsSelectedDate(formatDateToISO(d));
  };
  const handleToday = () => {
    setStatsSelectedDate(formatDateToISO(new Date()));
  };

  const handlePrevWeek = () => {
    const d = parseAnyDate(statsSelectedWeekDate) || new Date();
    d.setDate(d.getDate() - 7);
    setStatsSelectedWeekDate(formatDateToISO(d));
  };
  const handleNextWeek = () => {
    const d = parseAnyDate(statsSelectedWeekDate) || new Date();
    d.setDate(d.getDate() + 7);
    setStatsSelectedWeekDate(formatDateToISO(d));
  };
  const handleCurrentWeek = () => {
    setStatsSelectedWeekDate(formatDateToISO(new Date()));
  };

  const handlePrevMonth = () => {
    const parts = statsSelectedMonth.split('-').map(Number);
    const d = new Date(parts[0] || new Date().getFullYear(), (parts[1] || 1) - 1 - 1, 1);
    setStatsSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const handleNextMonth = () => {
    const parts = statsSelectedMonth.split('-').map(Number);
    const d = new Date(parts[0] || new Date().getFullYear(), (parts[1] || 1) - 1 + 1, 1);
    setStatsSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const handleCurrentMonth = () => {
    const now = new Date();
    setStatsSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  // Thông tin nhãn hiển thị và xuất file của khoảng thời gian thống kê được chọn (Section 2.4)
  const statsPeriodInfo = useMemo(() => {
    const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const now = new Date();

    if (statsPeriod === 'day') {
      const dt = parseAnyDate(statsSelectedDate) || now;
      const isToday = formatDateToISO(dt) === formatDateToISO(now);
      const weekday = dayNames[dt.getDay()];
      const displayDate = formatDisplayDate(dt);
      return {
        label: `Ngày ${displayDate}${isToday ? ' (Hôm nay)' : ''}`,
        shortLabel: displayDate,
        subLabel: `${weekday}, ngày ${displayDate}`,
        isCurrent: isToday,
        exportText: `Ngày ${displayDate} (${weekday})`,
        fileSuffix: `Ngay_${statsSelectedDate}`
      };
    }

    if (statsPeriod === 'week') {
      const dt = parseAnyDate(statsSelectedWeekDate) || now;
      const { monday, sunday } = getWeekBoundaries(dt);
      const currentBounds = getWeekBoundaries(now);
      const isCurrentWeek = formatDateToISO(monday) === formatDateToISO(currentBounds.monday);
      const weekNum = getISOWeekNumber(dt);
      const startStr = formatDisplayDate(monday);
      const endStr = formatDisplayDate(sunday);
      return {
        label: `Tuần ${weekNum} (${startStr} - ${endStr})${isCurrentWeek ? ' (Tuần này)' : ''}`,
        shortLabel: `Tuần ${weekNum}`,
        subLabel: `Tuần ${weekNum} (Từ Thứ hai ${startStr} đến Chủ nhật ${endStr})`,
        isCurrent: isCurrentWeek,
        exportText: `Tuần ${weekNum} năm ${monday.getFullYear()} (Từ ${startStr} đến ${endStr})`,
        fileSuffix: `Tuan_${weekNum}_${monday.getFullYear()}`
      };
    }

    if (statsPeriod === 'month') {
      const parts = statsSelectedMonth.split('-').map(Number);
      const targetYear = parts[0] || now.getFullYear();
      const targetMonth = parts[1] || (now.getMonth() + 1);
      const isCurrentMonth = targetYear === now.getFullYear() && targetMonth === (now.getMonth() + 1);
      const monthStr = `Tháng ${String(targetMonth).padStart(2, '0')}/${targetYear}`;
      return {
        label: `${monthStr}${isCurrentMonth ? ' (Tháng này)' : ''}`,
        shortLabel: monthStr,
        subLabel: `${monthStr}`,
        isCurrent: isCurrentMonth,
        exportText: `${monthStr}`,
        fileSuffix: `Thang_${String(targetMonth).padStart(2, '0')}_${targetYear}`
      };
    }

    return {
      label: 'Tất cả thời gian',
      shortLabel: 'Tất cả',
      subLabel: 'Toàn bộ dữ liệu kiểm tra',
      isCurrent: true,
      exportText: 'Toàn bộ thời gian',
      fileSuffix: 'Tat_ca'
    };
  }, [statsPeriod, statsSelectedDate, statsSelectedWeekDate, statsSelectedMonth]);

  // Speech recognition ref for search
  const recognitionRef = useRef<any>(null);

  // Helper: Format today as dd/mm/yyyy
  const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Check if current user is leadership/management (Tổ trưởng, Đội trưởng, Giám đốc, etc.)
  const userRoleStr = (
    sessionUser?.role ||
    (sessionUser as any)?.chucDanh ||
    (sessionUser as any)?.chucVu ||
    ''
  ).toLowerCase();

  const isToTruong = useMemo(() => {
    const norm = normalizeSearchStr(userRoleStr);
    const normName = normalizeSearchStr(sessionUser?.name || '');
    if (
      normName.includes('nguyen thanh phong') ||
      normName.includes('thanh phong') ||
      (sessionUser as any)?.email?.includes('phong7nt')
    ) {
      return true;
    }
    return (
      norm.includes('to truong') ||
      norm.includes('to pho') ||
      norm.includes('doi truong') ||
      norm.includes('doi pho') ||
      norm.includes('giam doc') ||
      norm.includes('pho giam doc') ||
      norm.includes('truong phong') ||
      norm.includes('pho phong') ||
      norm.includes('quan tri') ||
      norm.includes('admin')
    );
  }, [userRoleStr, sessionUser]);

  // Requirement: Khi người dùng là nhân viên vào thì phần 2.3 và 2.4 sẽ ẩn đi!
  const isEmployee = useMemo(() => {
    return !isToTruong;
  }, [isToTruong]);

  // Bộ lọc dữ liệu sơ đồ cây:
  // - 'assigned': chỉ đã phân công (Mặc định cho nhân viên đi kiện toàn - Tối ưu dữ liệu)
  // - 'unassigned': nhập phát sinh kiện toàn (ngoài phân công, tìm kiếm các KH chưa phân công)
  // - 'mine': phân công cho tôi
  // - 'all': tất cả dữ liệu
  const [filterAssignedMode, setFilterAssignedMode] = useState<'all' | 'assigned' | 'unassigned' | 'mine'>(
    isEmployee ? 'assigned' : 'all'
  );

  // Tự động đồng bộ chế độ lọc khi vai trò người dùng thay đổi
  useEffect(() => {
    if (isEmployee) {
      setFilterAssignedMode('assigned');
    }
  }, [isEmployee]);

  // Thống kê số lượng phân công
  const assignedCounts = useMemo(() => {
    let totalAssigned = 0;
    let totalUnassigned = 0;
    let myAssigned = 0;
    const myNorm = sessionUser?.name ? normalizeSearchStr(sessionUser.name) : '';
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.nguoiThucHien && e.nguoiThucHien.trim().length > 0) {
        totalAssigned++;
        if (myNorm && normalizeSearchStr(e.nguoiThucHien).includes(myNorm)) {
          myAssigned++;
        }
      } else {
        totalUnassigned++;
      }
    }
    return { totalAssigned, totalUnassigned, myAssigned, total: entries.length };
  }, [entries, sessionUser]);

  // Tọa độ GPS thời gian thực của thiết bị
  const [currentGps, setCurrentGps] = useState<{ x: string; y: string } | null>(
    cachedGPSCoords ? { x: cachedGPSCoords.x, y: cachedGPSCoords.y } : null
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    getCurrentGPSCoords().then(pos => {
      if (pos) setCurrentGps(pos);
    });

    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const x = pos.coords.latitude.toFixed(6);
        const y = pos.coords.longitude.toFixed(6);
        cachedGPSCoords = { x, y, time: Date.now() };
        setCurrentGps({ x, y });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Tính khoảng cách giữa vị trí người dùng đang đứng và tọa độ cũ của khách hàng (khi KH có tọa độ)
  const coordDiffDistance = useMemo(() => {
    if (!selectedCustomer || !selectedCustomer.x || !selectedCustomer.y || !currentGps) {
      return null;
    }
    const oldLat = parseFloat(String(selectedCustomer.x).replace(',', '.'));
    const oldLng = parseFloat(String(selectedCustomer.y).replace(',', '.'));
    const curLat = parseFloat(currentGps.x);
    const curLng = parseFloat(currentGps.y);

    if (isNaN(oldLat) || isNaN(oldLng) || isNaN(curLat) || isNaN(curLng)) {
      return null;
    }
    return calculateDistanceMeters(oldLat, oldLng, curLat, curLng);
  }, [selectedCustomer, currentGps]);

  // Cập nhật lại tọa độ tại điểm đứng hiện tại cho khách hàng
  const handleUpdateCoordsToCurrent = async () => {
    if (!selectedCustomer || !currentGps) return;
    const newX = currentGps.x;
    const newY = currentGps.y;
    const distText = coordDiffDistance !== null ? `${Math.round(coordDiffDistance)}m` : '';

    // Cập nhật React state ngay lập tức (0ms)
    setEntries(prev => {
      const idx = prev.findIndex(e => e.maKh === selectedCustomer.maKh);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        x: newX,
        y: newY
      };
      return updated;
    });

    setInspectSuccessMsg(
      `✓ Đã cập nhật tọa độ mới cho KH ${selectedCustomer.tenKh} (${selectedCustomer.maKh}): X=${newX}, Y=${newY}${distText ? ` (cách vị trí cũ ${distText})` : ''}`
    );

    // Đồng bộ ngầm xuống Google Sheets
    DataStore.updateKthtdd({
      maKh: selectedCustomer.maKh,
      x: newX,
      y: newY
    }).catch(err => {
      console.warn('Lỗi đồng bộ tọa độ mới:', err);
    });
  };

  // State chỉnh sửa / cập nhật số điện thoại cho khách hàng
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editingPhoneVal, setEditingPhoneVal] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // Lưu số điện thoại mới cho khách hàng
  const handleSavePhone = async () => {
    if (!selectedCustomer) return;
    let cleanPhone = editingPhoneVal.trim().replace(/[\s\.\-_]/g, '');
    if (cleanPhone.startsWith('+84')) {
      cleanPhone = '0' + cleanPhone.slice(3);
    } else if (cleanPhone.startsWith('84') && cleanPhone.length >= 11) {
      cleanPhone = '0' + cleanPhone.slice(2);
    }
    if (cleanPhone && /^\d+$/.test(cleanPhone) && !cleanPhone.startsWith('0')) {
      cleanPhone = '0' + cleanPhone;
    }

    setIsSavingPhone(true);
    // Cập nhật React state ngay lập tức (0ms)
    setEntries(prev => {
      const idx = prev.findIndex(e => e.maKh === selectedCustomer.maKh);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        soDienThoai: cleanPhone
      };
      return updated;
    });

    setIsEditingPhone(false);
    setIsSavingPhone(false);
    setInspectSuccessMsg(
      cleanPhone
        ? `✓ Đã cập nhật số điện thoại ${formatPhoneNumber(cleanPhone)} cho KH ${selectedCustomer.tenKh}`
        : `✓ Đã xóa số điện thoại cho KH ${selectedCustomer.tenKh}`
    );

    // Đồng bộ ngầm xuống Google Sheets
    DataStore.updateKthtdd({
      maKh: selectedCustomer.maKh,
      soDienThoai: cleanPhone
    }).catch(err => {
      console.warn('Lỗi đồng bộ số điện thoại:', err);
    });
  };

  // Auto reset mobile tab if employee somehow landed on 'list' or 'stats'
  useEffect(() => {
    if (isEmployee && (mobileTab === 'list' || mobileTab === 'stats')) {
      setMobileTab('inspect');
    }
  }, [isEmployee, mobileTab]);

  // All members belonging to current user's team from CongTac
  const teamMembers = useMemo(() => {
    const allMembers = DataStore.getMembers();
    const myTeam = String(sessionUser?.team || '').trim().toLowerCase();
    if (!myTeam || myTeam === 'không xác định') {
      return allMembers;
    }
    const filtered = allMembers.filter(m => String(m.team || '').trim().toLowerCase() === myTeam);
    return filtered.length > 0 ? filtered : allMembers;
  }, [sessionUser, refreshToggle]);

  // Load Initial Data from IndexedDB cache
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    DataStore.getKthtddEntriesAsync().then(cached => {
      if (!isMounted) return;
      if (cached && cached.length > 0) {
        setEntries(cached);
        setLoading(false);
      } else {
        handleSyncFromSheet();
      }
    });

    const handleKthtddUpdate = () => {
      DataStore.getKthtddEntriesAsync().then(updated => {
        if (isMounted && updated) setEntries(updated);
      });
    };
    window.addEventListener('kthtdd_updated', handleKthtddUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('kthtdd_updated', handleKthtddUpdate);
    };
  }, []);

  // Fetch or sync from sheet
  const handleSyncFromSheet = async (forceAll: boolean = false) => {
    try {
      setSyncing(true);
      // Nạp toàn bộ sheet KTHTDD vào bộ nhớ/IndexedDB để nhân viên ra ngoài vừa có dữ liệu phân công, vừa có sẵn dữ liệu chưa phân công phục vụ nhập phát sinh kiện toàn
      setSyncProgress('Đang đồng bộ dữ liệu KTHTDD từ Google Sheets...');
      const fresh = await DataStore.fetchKthtddFromSheet(
        undefined,
        msg => {
          setSyncProgress(msg);
        },
        false // Nạp đầy đủ để người dùng tra cứu được cả khách hàng chưa phân công khi chọn phát sinh
      );
      setEntries(fresh);
      const now = new Date();
      setLastSyncTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`
      );
      setSyncProgress('');
    } catch (err: any) {
      console.error('Error syncing KTHTDD:', err);
      alert('Không thể tải dữ liệu từ Google Sheets: ' + (err.message || 'Lỗi mạng'));
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  // Populate inspection form when selectedCustomer changes
  useEffect(() => {
    if (selectedCustomer) {
      setInspectNgay(selectedCustomer.ngay || getTodayFormatted());
      setInspectKetQua((selectedCustomer.ketQua as any) || '');
      setInspectChi((selectedCustomer.chi as any) || '');
      setInspectDeXuat(selectedCustomer.deXuat || '');
      setInspectPicUrl(selectedCustomer.pic || '');
      setInspectPicPreview(selectedCustomer.pic || '');
      setUploadPicError('');
      setPicSizeKb(null);
      setInspectSuccessMsg('');
      setIsEditingPhone(false);
      setEditingPhoneVal(selectedCustomer.soDienThoai || '');
      // Auto open inspect section if closed
      setOpenSections(prev => ({ ...prev, inspect: true }));
    }
  }, [selectedCustomer]);

  // Kích hoạt mở Camera trực tiếp
  const handleTriggerCamera = () => {
    if (!selectedCustomer) {
      alert('Vui lòng chọn khách hàng trước khi chụp ảnh công tơ.');
      return;
    }
    cameraInputRef.current?.click();
  };

  // Kích hoạt chọn ảnh từ thư viện
  const handleTriggerFile = () => {
    if (!selectedCustomer) {
      alert('Vui lòng chọn khách hàng trước khi chọn ảnh công tơ.');
      return;
    }
    fileInputRef.current?.click();
  };

  // Xử lý nén ảnh tối ưu kích thước siêu nhẹ & tải lên Google Drive siêu tốc
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedCustomer) return;

    setIsUploadingPic(true);
    setUploadPicError('');

    try {
      // 1. Tối ưu nén ảnh siêu nhẹ (~35-50KB) cực nhanh (~30ms) nhưng sắc nét từng vạch số & niêm chì
      const { base64, sizeKb } = await compressImageFile(file, 960, 960, 0.65);
      setPicSizeKb(sizeKb);
      // Hiển thị khung ảnh ngay lập tức 0ms!
      setInspectPicPreview(base64);

      const targetCustomer = selectedCustomer;
      const fileName = `KT_${targetCustomer.maKh}.jpg`;
      const folderId = '1eze4kVWtdUr0gjKSEAB_BKSfm5CNg3fv';
      const oldFileId = extractDriveFileId(targetCustomer.pic || inspectPicUrl);

      // 2. Tải lên Google Drive siêu tốc 2-trong-1 (chạy nền, không làm đơ giao diện)
      const uploadTask = DataStore.uploadImageToDrive(base64, fileName, 'image/jpeg', folderId, {
        maKh: targetCustomer.maKh,
        oldFileId
      });
      uploadPromiseRef.current = uploadTask;

      uploadTask
        .then(driveUrl => {
          setInspectPicUrl(driveUrl);
          setIsUploadingPic(false);
          setInspectSuccessMsg(`✓ Đã lưu ảnh công tơ (${fileName}, ${sizeKb}KB) lên Google Drive thành công!`);

          // Cập nhật ngay vào RAM state
          setEntries(prev => {
            const idx = prev.findIndex(item => item.maKh === targetCustomer.maKh);
            if (idx === -1) return prev;
            const updated = [...prev];
            updated[idx] = { ...updated[idx], pic: driveUrl };
            return updated;
          });
        })
        .catch(err => {
          console.error('Lỗi upload ảnh nền:', err);
          setUploadPicError(err?.message || 'Không thể tải ảnh lên Google Drive. Vui lòng kiểm tra kết nối mạng.');
          setIsUploadingPic(false);
        });
    } catch (err: any) {
      console.error('Lỗi nén ảnh:', err);
      setUploadPicError('Lỗi xử lý ảnh: ' + (err?.message || 'Không xác định'));
      setIsUploadingPic(false);
    }
  };

  // Xóa ảnh công tơ
  const handleRemovePic = () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa liên kết ảnh công tơ này không?')) return;
    setInspectPicUrl('');
    setInspectPicPreview('');
    setPicSizeKb(null);
    if (selectedCustomer) {
      setEntries(prev => {
        const idx = prev.findIndex(item => item.maKh === selectedCustomer.maKh);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], pic: '' };
        return updated;
      });
      DataStore.updateKthtdd({
        maKh: selectedCustomer.maKh,
        pic: ''
      }).catch(err => console.warn('Lỗi xóa trường pic:', err));
    }
  };

  // Voice Search Setup for Search Query (Web Speech API)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError('');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setSearchQuery(transcript.trim());
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition search error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Vui lòng cấp quyền micro cho trình duyệt.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Lỗi giọng nói: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      setVoiceSupported(false);
    }
  }, []);

  const toggleVoiceSearch = () => {
    if (!voiceSupported) {
      alert('Trình duyệt chưa hỗ trợ nhận diện giọng nói tiếng Việt. Vui lòng thử Chrome hoặc Edge.');
      return;
    }
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
    } else {
      setSpeechError('');
      try {
        recognitionRef.current?.start();
      } catch (e: any) {
        console.warn('Failed to start speech recognition for search:', e);
        setIsListening(false);
      }
    }
  };

  // Voice Input for "Đề xuất xử lý" (Requirement 1)
  const toggleVoiceDeXuat = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Trình duyệt chưa hỗ trợ nhận diện giọng nói tiếng Việt. Vui lòng thử Chrome hoặc Edge.');
      return;
    }

    if (isListeningDeXuat) {
      try {
        recognitionDeXuatRef.current?.stop();
      } catch (e) {}
      setIsListeningDeXuat(false);
    } else {
      setSpeechDeXuatError('');
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsListeningDeXuat(true);
          setSpeechDeXuatError('');
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript || '';
          if (transcript) {
            setInspectDeXuat(prev => {
              const trimmed = (prev || '').trim();
              return trimmed ? `${trimmed}; ${transcript.trim()}` : transcript.trim();
            });
          }
          setIsListeningDeXuat(false);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition DeXuat error:', event.error);
          if (event.error === 'not-allowed') {
            setSpeechDeXuatError('Vui lòng cấp quyền truy cập micro cho trình duyệt.');
          } else if (event.error !== 'no-speech') {
            setSpeechDeXuatError(`Lỗi nhận diện: ${event.error}`);
          }
          setIsListeningDeXuat(false);
        };

        recognition.onend = () => {
          setIsListeningDeXuat(false);
        };

        recognitionDeXuatRef.current = recognition;
        recognition.start();
      } catch (e: any) {
        console.warn('Failed to start speech recognition for DeXuat:', e);
        setIsListeningDeXuat(false);
      }
    }
  };

  // Tối ưu hóa thuật toán tìm kiếm siêu tốc O(1):
  // Tiền lập chỉ mục (Index) 1 lần duy nhất khi danh sách entries thay đổi
  const indexedEntries = useMemo(() => {
    return entries.map(e => {
      const raw = `${e.maTram} ${e.tenTram} ${e.maKh} ${e.tenKh} ${e.danhSo || ''} ${e.soNo || ''} ${e.diaChi || ''} ${e.soDienThoai || ''}`.toLowerCase();
      const norm = normalizeSearchStr(raw);
      return {
        entry: e,
        raw,
        norm
      };
    });
  }, [entries]);

  // Grouping for Tree View (Khu vực -> Mã trạm -> Tên trạm -> Mã KH -> Tên KH -> Số No)
  // Hỗ trợ tìm kiếm siêu tốc theo: Mã trạm, Tên trạm, Mã KH, Tên KH, Số No, Danh số, Địa chỉ, Số ĐT
  const treeData = useMemo<Record<string, AreaNode>>(() => {
    const qRaw = searchQuery.trim();
    const qLower = qRaw.toLowerCase();
    const qNorm = qRaw ? normalizeSearchStr(qRaw) : '';
    const myNorm = sessionUser?.name ? normalizeSearchStr(sessionUser.name) : '';

    const areaMap: Record<string, AreaNode> = {};

    for (let i = 0; i < indexedEntries.length; i++) {
      const item = indexedEntries[i];
      const e = item.entry;

      // 1. Bộ lọc phân công (tối ưu hóa dữ liệu & tốc độ cho nhân viên đi kiện toàn)
      if (filterAssignedMode === 'assigned') {
        if (!e.nguoiThucHien || e.nguoiThucHien.trim().length === 0) continue;
      } else if (filterAssignedMode === 'unassigned') {
        // Chế độ nhập phát sinh kiện toàn (ngoài phân công): chỉ tìm kiếm & hiển thị các KH CHƯA phân công
        if (e.nguoiThucHien && e.nguoiThucHien.trim().length > 0) continue;
      } else if (filterAssignedMode === 'mine') {
        if (!e.nguoiThucHien || !myNorm || !normalizeSearchStr(e.nguoiThucHien).includes(myNorm)) continue;
      }

      // 2. Tìm kiếm siêu tốc qua index đã tiền xử lý
      if (qRaw) {
        if (!item.raw.includes(qLower) && !item.norm.includes(qNorm)) {
          continue;
        }
      }

      // 3. Gom nhóm theo Khu vực & Trạm
      const kv = e.khuVuc || 'Chưa phân khu vực';
      const stKey = e.maTram || e.tenTram || 'Không rõ trạm';

      if (!areaMap[kv]) {
        areaMap[kv] = {
          khuVuc: kv,
          totalKh: 0,
          checkedKh: 0,
          stations: {}
        };
      }
      areaMap[kv].totalKh++;
      if (e.ketQua && e.ketQua.trim().length > 0) {
        areaMap[kv].checkedKh++;
      }

      if (!areaMap[kv].stations[stKey]) {
        areaMap[kv].stations[stKey] = {
          maTram: e.maTram || '',
          tenTram: e.tenTram || 'Trạm không tên',
          khuVuc: kv,
          nguoiThucHien: e.nguoiThucHien || '',
          totalKh: 0,
          checkedKh: 0,
          customers: []
        };
      }

      areaMap[kv].stations[stKey].totalKh++;
      if (e.ketQua && e.ketQua.trim().length > 0) {
        areaMap[kv].stations[stKey].checkedKh++;
      }
      if (!areaMap[kv].stations[stKey].nguoiThucHien && e.nguoiThucHien) {
        areaMap[kv].stations[stKey].nguoiThucHien = e.nguoiThucHien;
      }
      areaMap[kv].stations[stKey].customers.push(e);
    }

    return areaMap;
  }, [indexedEntries, searchQuery, filterAssignedMode, sessionUser]);

  // Thống kê kết quả tìm kiếm trên sơ đồ cây
  const treeMatchStats = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return null;
    let stationCount = 0;
    let custCount = 0;
    (Object.values(treeData) as AreaNode[]).forEach(area => {
      stationCount += Object.keys(area.stations).length;
      custCount += area.totalKh;
    });
    return { stationCount, custCount };
  }, [searchQuery, treeData]);

  // Chuỗi tìm kiếm chuẩn hóa một lần dùng cho toàn bộ sơ đồ cây
  const searchNorm = useMemo(() => normalizeSearchStr(searchQuery), [searchQuery]);
  const searchLower = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

  // Auto-expand branches when searching (tự động mở nhánh khi có từ khóa tìm kiếm)
  useEffect(() => {
    if (searchQuery.trim().length >= 1) {
      const newKv: Record<string, boolean> = {};
      const newSt: Record<string, boolean> = {};
      Object.keys(treeData).forEach(kv => {
        newKv[kv] = true;
        Object.keys(treeData[kv].stations).forEach(st => {
          newSt[`${kv}___${st}`] = true;
        });
      });
      setExpandedKhuVuc(newKv);
      setExpandedTram(newSt);
    }
  }, [searchQuery, treeData]);

  // Toggle tree node expansion
  const toggleKvExpand = (kv: string) => {
    setExpandedKhuVuc(prev => ({ ...prev, [kv]: !prev[kv] }));
  };

  const toggleTramExpand = (kv: string, stKey: string) => {
    const key = `${kv}___${stKey}`;
    setExpandedTram(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Open Assignment Dialog
  const handleOpenAssign = (
    e: React.MouseEvent,
    station: { maTram: string; tenTram: string; khuVuc: string; totalKh: number; currentAssignee: string }
  ) => {
    e.stopPropagation();
    if (station.currentAssignee && station.currentAssignee.trim().length > 0) {
      alert(`Trạm ${station.maTram} - ${station.tenTram} đã được phân công cho: ${station.currentAssignee}. Không thể phân công lại.`);
      return;
    }
    setAssignStation(station);
    setSelectedAssignees([]);
    setAssignMsg(null);
  };

  // Save Assignment - Đồng bộ xác nhận kết quả lưu vào Google Sheets
  const handleSaveAssign = async () => {
    if (!assignStation) return;
    if (selectedAssignees.length === 0) {
      setAssignMsg({ text: 'Vui lòng chọn ít nhất 1 nhân viên để phân công.', type: 'error' });
      return;
    }

    const nguoiThucHien = selectedAssignees.join('; ');
    const targetTram = assignStation.maTram;
    const targetTenTram = assignStation.tenTram;

    setIsSavingAssign(true);
    setAssignMsg({ text: `Đang gửi phân công trạm ${targetTenTram} lên Google Sheets...`, type: 'success' });

    try {
      const res = await DataStore.assignKthtdd({
        maTram: targetTram,
        tenTram: targetTenTram,
        nguoiThucHien
      });

      if (res.ok) {
        setAssignMsg({
          text: `✓ ${res.message || `Đã phân công thành công cho trạm ${targetTenTram} và đồng bộ lên Google Sheets!`}`,
          type: 'success'
        });

        // Cập nhật React state ngay sau khi Google Sheets xác nhận
        setEntries(prev => {
          const cleanT = targetTram.trim().toLowerCase();
          const cleanName = targetTenTram.trim().toLowerCase();
          let changed = false;
          const updated = prev.map(item => {
            const mMatch = item.maTram && item.maTram.trim().toLowerCase() === cleanT;
            const nMatch = cleanName && item.tenTram && item.tenTram.trim().toLowerCase() === cleanName;
            if (mMatch || nMatch) {
              changed = true;
              return { ...item, nguoiThucHien };
            }
            return item;
          });
          return changed ? updated : prev;
        });

        setTimeout(() => {
          setAssignStation(null);
          setAssignMsg(null);
          setIsSavingAssign(false);
        }, 800);
      } else {
        setIsSavingAssign(false);
        setAssignMsg({
          text: `❌ Lỗi lưu Google Sheets: ${res.message || 'Không thể ghi nhận'}. Dữ liệu chưa vào được Sheet. Vui lòng kiểm tra mạng hoặc thử lại!`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setIsSavingAssign(false);
      setAssignMsg({
        text: `❌ Lỗi kết nối Google Sheets: ${err.message || 'Mất kết nối mạng'}. Vui lòng thử lại!`,
        type: 'error'
      });
    }
  };

  // Save Customer Inspection Result (Section 2.2 - Tối ưu phản hồi tức thì 0ms)
  const handleSaveInspection = async (andNext: boolean = false) => {
    if (!selectedCustomer) {
      alert('Vui lòng chọn khách hàng cần cập nhật kết quả.');
      return;
    }
    if (!inspectKetQua) {
      alert('Vui lòng chọn Kết quả kiểm tra ("Bình thường" hoặc "Không").');
      return;
    }
    if (!inspectChi) {
      alert('Vui lòng chọn tình trạng Chì ("Có" hoặc "Không").');
      return;
    }

    // 1. Lấy tọa độ GPS siêu nhanh (từ bộ nhớ đệm cache hoặc timeout tối đa 600ms)
    const gps = await getCurrentGPSCoords();
    const toadoX = gps?.x || selectedCustomer.x || '';
    const toadoY = gps?.y || selectedCustomer.y || '';
    const targetNgay = inspectNgay || getTodayFormatted();
    const targetCustomer = selectedCustomer;

    // Ghi nhận Người thực hiện: nếu khách hàng chưa có phân công hoặc đang ở chế độ nhập phát sinh kiện toàn
    // thì tự động ghi nhận người thực hiện là tài khoản đang đăng nhập / cập nhật
    let targetNguoiThucHien = targetCustomer.nguoiThucHien;
    if (!targetNguoiThucHien || filterAssignedMode === 'unassigned') {
      targetNguoiThucHien = sessionUser?.name || 'Nhân viên';
    }

    // Lấy link ảnh (nếu đang tải lên nền thì đợi nhanh để lấy link Drive chính thức)
    let targetPic = inspectPicUrl || targetCustomer.pic || '';
    if (uploadPromiseRef.current && isUploadingPic) {
      try {
        const uploadedUrl = await Promise.race([
          uploadPromiseRef.current,
          new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
        ]);
        if (uploadedUrl) targetPic = uploadedUrl;
      } catch (err) {
        console.warn('Lưu kết quả với URL ảnh hiện tại:', err);
      }
    }

    // 2. Cập nhật state entries trong React NGAY LẬP TỨC (0ms)
    setEntries(prev => {
      const idx = prev.findIndex(e => e.maKh === targetCustomer.maKh);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        ngay: targetNgay,
        ketQua: inspectKetQua,
        chi: inspectChi,
        deXuat: inspectDeXuat,
        nguoiThucHien: targetNguoiThucHien,
        pic: targetPic,
        ...(toadoX ? { x: toadoX } : {}),
        ...(toadoY ? { y: toadoY } : {})
      };
      return updated;
    });

    const gpsNotice = toadoX && toadoY ? ` [Tọa độ X: ${toadoX}, Y: ${toadoY}]` : '';
    const assigneeNotice = targetNguoiThucHien ? ` [Người TH: ${targetNguoiThucHien}]` : '';
    const picNotice = targetPic ? ` [Ảnh: KT_${targetCustomer.maKh}.jpg]` : '';
    setInspectSuccessMsg(`✓ Đã lưu kết quả kiểm tra & tọa độ GPS${gpsNotice}${assigneeNotice}${picNotice} cho khách hàng ${targetCustomer.tenKh} (${targetCustomer.maKh})`);

    // 3. Nếu chọn "Lưu & Tiếp tục KH sau", chuyển ngay lập tức sang KH tiếp theo mà không cần chờ mạng!
    if (andNext) {
      const sameStationKhs = entries.filter(
        e => e.maTram === targetCustomer.maTram && e.maKh !== targetCustomer.maKh && !e.ketQua
      );
      if (sameStationKhs.length > 0) {
        setSelectedMaKh(sameStationKhs[0].maKh);
      } else {
        const allInStation = entries.filter(e => e.maTram === targetCustomer.maTram);
        const currIdx = allInStation.findIndex(e => e.maKh === targetCustomer.maKh);
        if (currIdx !== -1 && currIdx < allInStation.length - 1) {
          setSelectedMaKh(allInStation[currIdx + 1].maKh);
        }
      }
    }

    // 4. Đồng bộ nền xuống DataStore và Google Sheets (Background Sync)
    DataStore.updateKthtdd({
      maKh: targetCustomer.maKh,
      ngay: targetNgay,
      ketQua: inspectKetQua,
      chi: inspectChi,
      deXuat: inspectDeXuat,
      nguoiThucHien: targetNguoiThucHien,
      x: toadoX,
      y: toadoY,
      pic: targetPic
    }).catch(e => {
      console.warn('Lỗi đồng bộ kết quả kiểm tra:', e);
    });
  };

  // Next / Previous customer navigation in Section 2.2
  const handleNavigateCustomer = (direction: 'prev' | 'next') => {
    if (!selectedCustomer) return;
    const sameStation = entries.filter(e => e.maTram === selectedCustomer.maTram);
    if (sameStation.length <= 1) return;
    const idx = sameStation.findIndex(e => e.maKh === selectedCustomer.maKh);
    if (idx === -1) return;

    if (direction === 'prev' && idx > 0) {
      setSelectedMaKh(sameStation[idx - 1].maKh);
    } else if (direction === 'next' && idx < sameStation.length - 1) {
      setSelectedMaKh(sameStation[idx + 1].maKh);
    }
  };

  // Section 2.3: Danh sách đã / chưa kiện toàn Filtering
  const allKhuVucs = useMemo(() => {
    const s = new Set<string>();
    entries.forEach(e => {
      if (e.khuVuc) s.add(e.khuVuc);
    });
    return Array.from(s).sort();
  }, [entries]);

  const allTramsForFilter = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach(e => {
      if (e.maTram && (filterKhuVuc === 'ALL' || e.khuVuc === filterKhuVuc)) {
        map.set(e.maTram, `${e.maTram} - ${e.tenTram}`);
      }
    });
    return Array.from(map.entries());
  }, [entries, filterKhuVuc]);

  const allAssigneesForFilter = useMemo(() => {
    const s = new Set<string>();
    entries.forEach(e => {
      if (e.nguoiThucHien) {
        e.nguoiThucHien.split(';').forEach(p => {
          const t = p.trim();
          if (t) s.add(t);
        });
      }
    });
    return Array.from(s).sort();
  }, [entries]);

  const filteredListEntries = useMemo(() => {
    const q = listSearchText.toLowerCase().trim();
    return entries.filter(item => {
      const isDone = Boolean(item.ketQua && item.ketQua.trim().length > 0);
      if (listType === 'done' && !isDone) return false;
      if (listType === 'pending' && isDone) return false;

      if (filterKhuVuc !== 'ALL' && item.khuVuc !== filterKhuVuc) return false;
      if (filterTram !== 'ALL' && item.maTram !== filterTram) return false;
      if (filterAssignee !== 'ALL' && (!item.nguoiThucHien || !item.nguoiThucHien.includes(filterAssignee))) return false;
      if (filterKetQua !== 'ALL' && item.ketQua !== filterKetQua) return false;
      if (filterChi !== 'ALL' && item.chi !== filterChi) return false;

      if (q) {
        const match =
          item.maKh.toLowerCase().includes(q) ||
          item.tenKh.toLowerCase().includes(q) ||
          item.diaChi.toLowerCase().includes(q) ||
          item.soNo.toLowerCase().includes(q) ||
          item.danhSo.toLowerCase().includes(q) ||
          item.tenTram.toLowerCase().includes(q) ||
          item.maTram.toLowerCase().includes(q) ||
          (item.soDienThoai && item.soDienThoai.includes(q)) ||
          (item.soDienThoai && formatPhoneNumber(item.soDienThoai).includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [entries, listType, filterKhuVuc, filterTram, filterAssignee, filterKetQua, filterChi, listSearchText]);

  // Paginated List
  const totalPages = Math.ceil(filteredListEntries.length / listPageSize) || 1;
  const paginatedEntries = useMemo(() => {
    const start = (listPage - 1) * listPageSize;
    return filteredListEntries.slice(start, start + listPageSize);
  }, [filteredListEntries, listPage, listPageSize]);

  // Export Section 2.3 List to Excel (Format Phone number with leading 0)
  const handleExportExcel = () => {
    if (filteredListEntries.length === 0) {
      alert('Không có dữ liệu để xuất Excel.');
      return;
    }

    const exportRows = filteredListEntries.map((item, idx) => ({
      'STT': idx + 1,
      'Mã KH': item.maKh,
      'Tên khách hàng': item.tenKh,
      'Địa chỉ': item.diaChi,
      'Mã trạm': item.maTram,
      'Tên trạm': item.tenTram,
      'Danh số': item.danhSo,
      'Số No công tơ': item.soNo,
      'Số ĐT': formatPhoneNumber(item.soDienThoai),
      'Khu vực': item.khuVuc,
      'Người thực hiện': item.nguoiThucHien,
      'Ngày KT': item.ngay,
      'Kết quả': item.ketQua,
      'Chì?': item.chi,
      'Đề xuất': item.deXuat,
      'Tọa độ X': item.x || '',
      'Tọa độ Y': item.y || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 26 },
      { wch: 35 },
      { wch: 12 },
      { wch: 24 },
      { wch: 12 },
      { wch: 15 },
      { wch: 14 },
      { wch: 16 },
      { wch: 24 },
      { wch: 12 },
      { wch: 15 },
      { wch: 10 },
      { wch: 32 },
      { wch: 14 },
      { wch: 14 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, listType === 'done' ? 'Đã kiện toàn' : 'Chưa kiện toàn');

    const fileName = `Kien_Toan_HTDD_${listType === 'done' ? 'Da_Kien_Toan' : 'Chua_Kien_Toan'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Section 2.4: Thống kê số liệu thực hiện (đã có kết quả) theo ngày, tuần, tháng
  const statsData = useMemo(() => {
    const doneEntries = entries.filter(e => e.ketQua && e.ketQua.trim().length > 0);

    const filteredByTime = doneEntries.filter(item => {
      if (statsPeriod === 'all') return true;

      const itemDate = parseAnyDate(item.ngay);
      if (!itemDate) return false;

      if (statsPeriod === 'day') {
        return formatDateToISO(itemDate) === statsSelectedDate;
      }

      if (statsPeriod === 'week') {
        const selectedWeekDateObj = parseAnyDate(statsSelectedWeekDate) || new Date();
        const { monday, sunday } = getWeekBoundaries(selectedWeekDateObj);
        return itemDate >= monday && itemDate <= sunday;
      }

      if (statsPeriod === 'month') {
        const parts = statsSelectedMonth.split('-').map(Number);
        const targetYear = parts[0] || new Date().getFullYear();
        const targetMonth = parts[1] || (new Date().getMonth() + 1);
        return itemDate.getFullYear() === targetYear && (itemDate.getMonth() + 1) === targetMonth;
      }

      return true;
    });

    const totalDone = filteredByTime.length;
    const totalBinhThuong = filteredByTime.filter(e => e.ketQua === 'Bình thường').length;
    const totalKhong = filteredByTime.filter(e => e.ketQua === 'Không').length;
    const totalCoChi = filteredByTime.filter(e => e.chi === 'Có').length;
    const totalMatChi = filteredByTime.filter(e => e.chi === 'Không').length;
    const totalDeXuat = filteredByTime.filter(e => e.deXuat && e.deXuat.trim().length > 0).length;

    const areaStatsMap: Record<
      string,
      {
        khuVuc: string;
        totalInSheet: number;
        doneCount: number;
        binhThuong: number;
        khong: number;
        coChi: number;
        matChi: number;
      }
    > = {};

    entries.forEach(e => {
      const kv = e.khuVuc || 'Chưa phân khu vực';
      if (!areaStatsMap[kv]) {
        areaStatsMap[kv] = {
          khuVuc: kv,
          totalInSheet: 0,
          doneCount: 0,
          binhThuong: 0,
          khong: 0,
          coChi: 0,
          matChi: 0
        };
      }
      areaStatsMap[kv].totalInSheet++;
    });

    filteredByTime.forEach(e => {
      const kv = e.khuVuc || 'Chưa phân khu vực';
      if (!areaStatsMap[kv]) {
        areaStatsMap[kv] = {
          khuVuc: kv,
          totalInSheet: 0,
          doneCount: 0,
          binhThuong: 0,
          khong: 0,
          coChi: 0,
          matChi: 0
        };
      }
      areaStatsMap[kv].doneCount++;
      if (e.ketQua === 'Bình thường') areaStatsMap[kv].binhThuong++;
      if (e.ketQua === 'Không') areaStatsMap[kv].khong++;
      if (e.chi === 'Có') areaStatsMap[kv].coChi++;
      if (e.chi === 'Không') areaStatsMap[kv].matChi++;
    });

    const assigneeStatsMap: Record<
      string,
      {
        name: string;
        doneCount: number;
        binhThuong: number;
        khong: number;
        coChi: number;
        deXuatCount: number;
      }
    > = {};

    filteredByTime.forEach(e => {
      const names = e.nguoiThucHien ? e.nguoiThucHien.split(';').map(n => n.trim()).filter(Boolean) : ['Chưa ghi nhận người TH'];
      names.forEach(name => {
        if (!assigneeStatsMap[name]) {
          assigneeStatsMap[name] = {
            name,
            doneCount: 0,
            binhThuong: 0,
            khong: 0,
            coChi: 0,
            deXuatCount: 0
          };
        }
        assigneeStatsMap[name].doneCount++;
        if (e.ketQua === 'Bình thường') assigneeStatsMap[name].binhThuong++;
        if (e.ketQua === 'Không') assigneeStatsMap[name].khong++;
        if (e.chi === 'Có') assigneeStatsMap[name].coChi++;
        if (e.deXuat) assigneeStatsMap[name].deXuatCount++;
      });
    });

    return {
      totalDone,
      totalBinhThuong,
      totalKhong,
      totalCoChi,
      totalMatChi,
      totalDeXuat,
      filteredByTime,
      areaList: Object.values(areaStatsMap),
      assigneeList: Object.values(assigneeStatsMap).sort((a, b) => b.doneCount - a.doneCount)
    };
  }, [entries, statsPeriod, statsSelectedDate, statsSelectedWeekDate, statsSelectedMonth]);

  // Xuất Excel Báo cáo Thống kê Phần 2.4
  const handleExportStatsExcel = () => {
    if (statsData.totalDone === 0) {
      alert('Không có dữ liệu thống kê trong khoảng thời gian đã chọn để xuất Excel.');
      return;
    }

    const periodText = statsPeriodInfo.exportText;

    const wb = XLSX.utils.book_new();

    // 1. SHEET BÁO CÁO TỔNG HỢP (Chỉ số KPI, Bảng theo Khu vực, Bảng theo Người thực hiện)
    const summaryAoa: any[][] = [
      ['BÁO CÁO THỐNG KÊ SỐ LIỆU KIỆN TOÀN HỆ THỐNG ĐO ĐẾM (KTHTDD)'],
      [`Khoảng thời gian: ${periodText}`],
      [`Thời gian kết xuất: ${new Date().toLocaleString('vi-VN')}`],
      [],
      ['I. CHỈ SỐ KPI TOÀN BỘ'],
      ['Chỉ số đánh giá', 'Số lượng (Công tơ / KH)', 'Tỷ lệ %'],
      ['Tổng số khách hàng đã kiểm tra', statsData.totalDone, '100%'],
      ['Kết quả: Bình thường', statsData.totalBinhThuong, statsData.totalDone > 0 ? `${Math.round((statsData.totalBinhThuong / statsData.totalDone) * 100)}%` : '0%'],
      ['Kết quả: Không bình thường', statsData.totalKhong, statsData.totalDone > 0 ? `${Math.round((statsData.totalKhong / statsData.totalDone) * 100)}%` : '0%'],
      ['Tình trạng niêm chì: Còn chì', statsData.totalCoChi, statsData.totalDone > 0 ? `${Math.round((statsData.totalCoChi / statsData.totalDone) * 100)}%` : '0%'],
      ['Tình trạng niêm chì: Không chì / mất chì', statsData.totalMatChi, statsData.totalDone > 0 ? `${Math.round((statsData.totalMatChi / statsData.totalDone) * 100)}%` : '0%'],
      ['Số lượng có đề xuất xử lý', statsData.totalDeXuat, statsData.totalDone > 0 ? `${Math.round((statsData.totalDeXuat / statsData.totalDone) * 100)}%` : '0%'],
      [],
      ['II. TIẾN ĐỘ THỰC HIỆN THEO KHU VỰC'],
      ['STT', 'Khu vực', 'Tổng KH trong khu vực', 'Số KH đã kiểm tra', 'Tỷ lệ hoàn thành %', 'Bình thường', 'Không bình thường', 'Còn chì', 'Không chì'],
    ];

    statsData.areaList.forEach((area, idx) => {
      const pct = area.totalInSheet > 0 ? `${Math.round((area.doneCount / area.totalInSheet) * 100)}%` : '0%';
      summaryAoa.push([
        idx + 1,
        area.khuVuc,
        area.totalInSheet,
        area.doneCount,
        pct,
        area.binhThuong,
        area.khong,
        area.coChi,
        area.matChi
      ]);
    });

    summaryAoa.push([]);
    summaryAoa.push(['III. THỐNG KÊ THEO NGƯỜI THỰC HIỆN / ĐỘI CÔNG TÁC']);
    summaryAoa.push(['STT', 'Người thực hiện / Tổ', 'Số KH đã kiểm tra', 'Bình thường', 'Không bình thường', 'Còn chì', 'Có đề xuất']);

    statsData.assigneeList.forEach((person, idx) => {
      summaryAoa.push([
        idx + 1,
        person.name,
        person.doneCount,
        person.binhThuong,
        person.khong,
        person.coChi,
        person.deXuatCount
      ]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
    wsSummary['!cols'] = [
      { wch: 6 },
      { wch: 32 },
      { wch: 22 },
      { wch: 20 },
      { wch: 18 },
      { wch: 15 },
      { wch: 18 },
      { wch: 12 },
      { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Báo cáo Tổng hợp');

    // 2. SHEET CHI TIẾT CÁC CÔNG TƠ ĐÃ KIỂM TRA TRONG KHOẢNG THỜI GIAN
    if (statsData.filteredByTime && statsData.filteredByTime.length > 0) {
      const detailRows = statsData.filteredByTime.map((item, idx) => ({
        'STT': idx + 1,
        'Mã KH': item.maKh,
        'Tên khách hàng': item.tenKh,
        'Địa chỉ': item.diaChi,
        'Mã trạm': item.maTram,
        'Tên trạm': item.tenTram,
        'Danh số': item.danhSo,
        'Số No công tơ': item.soNo,
        'Số ĐT': formatPhoneNumber(item.soDienThoai),
        'Khu vực': item.khuVuc,
        'Người thực hiện': item.nguoiThucHien,
        'Ngày KT': item.ngay,
        'Kết quả': item.ketQua,
        'Chì?': item.chi,
        'Đề xuất': item.deXuat,
        'Tọa độ X': item.x || '',
        'Tọa độ Y': item.y || ''
      }));

      const wsDetails = XLSX.utils.json_to_sheet(detailRows);
      wsDetails['!cols'] = [
        { wch: 6 },
        { wch: 15 },
        { wch: 26 },
        { wch: 35 },
        { wch: 12 },
        { wch: 24 },
        { wch: 12 },
        { wch: 15 },
        { wch: 14 },
        { wch: 16 },
        { wch: 24 },
        { wch: 12 },
        { wch: 14 },
        { wch: 10 },
        { wch: 32 },
        { wch: 14 },
        { wch: 14 }
      ];
      XLSX.utils.book_append_sheet(wb, wsDetails, 'Chi tiết KH đã KT');
    }

    const safeDate = new Date().toISOString().slice(0, 10);
    const fileName = `Thong_Ke_KTHTDD_${statsPeriodInfo.fileSuffix}_${safeDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Overall Global KPI
  const globalKpi = useMemo(() => {
    const total = entries.length;
    const done = entries.filter(e => e.ketQua && e.ketQua.trim().length > 0).length;
    const pending = total - done;
    const assignedStations = new Set<string>();
    entries.forEach(e => {
      if (e.nguoiThucHien && e.nguoiThucHien.trim().length > 0) {
        assignedStations.add(e.maTram || e.tenTram);
      }
    });
    return {
      total,
      done,
      pending,
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
      assignedStationsCount: assignedStations.size
    };
  }, [entries]);

  return (
    <div className="flex flex-col gap-5 min-w-0 pb-16">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-[#005a9c] via-[#004b87] to-teal-800 text-white rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 shadow-inner">
                <FolderTree className="w-6 h-6 text-teal-300" />
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-black uppercase tracking-tight text-white drop-shadow-md">
                  Kiện toàn Hệ thống Đo đếm (KTHTDD)
                </h1>
                <p className="text-xs md:text-sm text-teal-100 font-medium">
                  Phân công kiểm tra trạm & Cập nhật kết quả kiểm tra hệ thống đo đếm hàng ngày
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-stretch md:self-auto justify-end">
            {/* Quick Collapse / Expand All Buttons (Requirement 2) */}
            <div className="flex items-center bg-white/10 backdrop-blur-md rounded-xl p-0.5 border border-white/20">
              <button
                type="button"
                onClick={collapseAllSections}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/20 rounded-lg transition-colors"
                title="Thu gọn tất cả các phần"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Thu gọn hết</span>
              </button>
              <button
                type="button"
                onClick={expandAllSections}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/20 rounded-lg transition-colors"
                title="Mở rộng tất cả các phần"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mở rộng hết</span>
              </button>
            </div>

            {lastSyncTime && (
              <span className="text-[11px] text-teal-200 bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/15">
                Đồng bộ: <b>{lastSyncTime}</b>
              </span>
            )}
            <button
              onClick={() => handleSyncFromSheet(false)}
              disabled={syncing}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-700/60 text-white text-xs md:text-sm font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              title="Tải lại dữ liệu mới nhất từ Google Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Đang đồng bộ...' : 'Đồng bộ Google Sheets'}</span>
            </button>
          </div>
        </div>

        {/* Sync Progress Bar */}
        {syncing && (
          <div className="mt-3 bg-white/20 rounded-lg p-2 flex items-center gap-2 text-xs font-semibold text-teal-100 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-teal-300" />
            <span>{syncProgress || 'Đang tải dữ liệu...'}</span>
          </div>
        )}

        {/* Global Summary KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center border border-white/10">
            <span className="text-[10px] text-teal-200 uppercase font-bold block">Tổng công tơ / KH</span>
            <span className="text-lg md:text-xl font-black text-white">{globalKpi.total.toLocaleString('vi-VN')}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center border border-white/10">
            <span className="text-[10px] text-emerald-300 uppercase font-bold block">Đã kiện toàn</span>
            <span className="text-lg md:text-xl font-black text-emerald-300">
              {globalKpi.done.toLocaleString('vi-VN')}{' '}
              <span className="text-xs font-normal opacity-90">({globalKpi.percent}%)</span>
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center border border-white/10">
            <span className="text-[10px] text-amber-300 uppercase font-bold block">Chưa kiện toàn</span>
            <span className="text-lg md:text-xl font-black text-amber-300">
              {globalKpi.pending.toLocaleString('vi-VN')}
            </span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center border border-white/10">
            <span className="text-[10px] text-teal-200 uppercase font-bold block">Trạm đã phân công</span>
            <span className="text-lg md:text-xl font-black text-cyan-200">
              {globalKpi.assignedStationsCount.toLocaleString('vi-VN')}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Tab Segmented Controls (for easy thumb switching on phones) */}
      <div className="flex md:hidden bg-slate-200 p-1 rounded-xl shadow-inner text-xs font-bold gap-1 sticky top-2 z-30">
        <button
          onClick={() => setMobileTab('tree')}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'tree' ? 'bg-white text-[#005a9c] shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Sơ đồ cây</span>
        </button>
        <button
          onClick={() => setMobileTab('inspect')}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'inspect' ? 'bg-white text-[#005a9c] shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          <span>Kiểm tra</span>
          {selectedCustomer && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
        </button>

        {/* Ẩn tab Danh sách & Thống kê khi người dùng là nhân viên */}
        {!isEmployee && (
          <>
            <button
              onClick={() => setMobileTab('list')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mobileTab === 'list' ? 'bg-white text-[#005a9c] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Danh sách</span>
            </button>
            <button
              onClick={() => setMobileTab('stats')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mobileTab === 'stats' ? 'bg-white text-[#005a9c] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Thống kê</span>
            </button>
          </>
        )}
      </div>

      {/* Main Flex Layout: Left (Tree View) + Right (Inspect + List + Stats) */}
      <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
        {/* ======================================================== */}
        {/* SECTION 2.1: BÊN TRÁI - SƠ ĐỒ CÂY (CO / MỞ THEO HƯỚNG NGANG) */}
        {/* ======================================================== */}
        {treeHorizontalOpen ? (
          <div
            className={`w-full lg:w-[400px] xl:w-[440px] 2xl:w-[480px] shrink-0 flex flex-col gap-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 transition-all duration-300 ${
              mobileTab !== 'tree' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Header with Horizontal Collapse Button (Thu gọn theo hướng ngang ◀) */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 select-none">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm md:text-base">
                <FolderTree className="w-4 h-4 text-[#005a9c]" />
                <span>SƠ ĐỒ CÂY PHÂN CẤP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full hidden sm:inline">
                  Khu vực ➔ Trạm ➔ DS ➔ Mã ➔ Tên ➔ No
                </span>
                {/* Nút co lại theo hướng ngang */}
                <button
                  type="button"
                  onClick={() => setTreeHorizontalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-[#005a9c] transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                  title="Thu gọn sơ đồ cây sang trái (theo hướng ngang)"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-[11px]">Thu gọn ngang</span>
                </button>
              </div>
            </div>

            {/* Chế độ tối ưu hóa cho nhân viên ra ngoài đi kiện toàn */}
            {isEmployee && (
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-sky-50 border border-sky-200 rounded-xl text-[11px] text-[#005a9c]">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Chế độ nhân viên: Chỉ load {assignedCounts.totalAssigned} KH đã phân công</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSyncFromSheet(true)}
                  disabled={syncing}
                  className="text-[10px] text-slate-500 hover:text-[#005a9c] underline cursor-pointer shrink-0 ml-1 font-medium"
                  title="Tải toàn bộ sheet nếu cần tra cứu thêm"
                >
                  Tải tất cả
                </button>
              </div>
            )}

            {/* Quick Filter: Đã phân công / Phát sinh kiện toàn / Của tôi / Tất cả */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterAssignedMode('assigned')}
                className={`flex-1 min-w-[105px] py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer text-xs ${
                  filterAssignedMode === 'assigned'
                    ? 'bg-white text-[#005a9c] shadow-xs font-bold ring-1 ring-[#005a9c]/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Chỉ hiển thị dữ liệu các trạm/KH đã được phân công (Mặc định)"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Đã phân công</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                  {assignedCounts.totalAssigned}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterAssignedMode('unassigned')}
                className={`flex-1 min-w-[105px] py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer text-xs ${
                  filterAssignedMode === 'unassigned'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-amber-700'
                }`}
                title="Nhập phát sinh kiện toàn ngoài phân công: Tìm kiếm & kiểm tra các KH chưa phân công. Khi lưu, Người thực hiện sẽ tự động được ghi nhận là bạn!"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Phát sinh KT</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${filterAssignedMode === 'unassigned' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                  {assignedCounts.totalUnassigned}
                </span>
              </button>

              {sessionUser?.name && (
                <button
                  type="button"
                  onClick={() => setFilterAssignedMode('mine')}
                  className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer text-xs ${
                    filterAssignedMode === 'mine'
                      ? 'bg-white text-[#005a9c] shadow-xs font-bold ring-1 ring-[#005a9c]/20'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={`Chỉ hiển thị các trạm phân công cho ${sessionUser.name}`}
                >
                  <span>Của tôi</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-[#005a9c] rounded-full font-bold">
                    {assignedCounts.myAssigned}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setFilterAssignedMode('all')}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer text-xs ${
                  filterAssignedMode === 'all'
                    ? 'bg-white text-[#005a9c] shadow-xs font-bold ring-1 ring-[#005a9c]/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Hiển thị tất cả dữ liệu (kể cả đã và chưa phân công)"
              >
                <span>Tất cả</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full font-bold">
                  {assignedCounts.total}
                </span>
              </button>
            </div>

            {/* Hướng dẫn khi bật chế độ Phát sinh kiện toàn */}
            {filterAssignedMode === 'unassigned' && (
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Chế độ phát sinh: Tìm & chọn KH chưa phân công. Khi lưu, Người thực hiện sẽ là bạn ({sessionUser?.name || 'Nhân viên'})</span>
                </div>
              </div>
            )}

            {/* Search Input with Voice Mic & Barcode Scanner - Hỗ trợ tìm kiếm theo Mã trạm, Tên trạm, Mã KH, Tên KH, Số No, Danh số, Địa chỉ */}
            <div className="relative flex items-center mt-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm Mã trạm, Tên trạm, Mã KH, Số No, Danh số, Địa chỉ..."
                className="w-full pl-9 pr-24 py-2.5 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#005a9c] focus:ring-2 focus:ring-[#005a9c]/20 outline-none transition-all placeholder:text-slate-400 font-medium"
              />

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-17 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Barcode Scanner Button - Quét mã vạch Số No điện kế bằng Camera */}
              <button
                type="button"
                onClick={() => setIsBarcodeModalOpen(true)}
                className="absolute right-9 p-1.5 rounded-lg bg-slate-200/80 hover:bg-[#005a9c] text-slate-600 hover:text-white transition-all cursor-pointer"
                title="Quét Barcode / Mã vạch Số No điện kế bằng Camera"
              >
                <ScanBarcode className="w-4 h-4" />
              </button>

              {/* Voice Input Mic Button */}
              <button
                type="button"
                onClick={toggleVoiceSearch}
                className={`absolute right-1.5 p-1.5 rounded-lg transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md ring-2 ring-rose-300'
                    : 'bg-slate-200/80 hover:bg-[#005a9c] text-slate-600 hover:text-white'
                }`}
                title={isListening ? 'Đang lắng nghe... bấm để dừng' : 'Nhập bằng giọng nói (Voice Search)'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            {/* Barcode Scan Toast Feedback */}
            {barcodeScanToast && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-xl animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{barcodeScanToast}</span>
              </div>
            )}

            {/* Listening Feedback / Error */}
            {isListening && (
              <div className="flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg animate-in fade-in">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>Đang nghe giọng nói... Hãy đọc Mã trạm, Tên trạm, Mã KH, Tên KH hoặc Địa chỉ...</span>
              </div>
            )}
            {speechError && (
              <div className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                {speechError}
              </div>
            )}

            {/* Thống kê kết quả tìm kiếm */}
            {searchQuery.trim() && treeMatchStats && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-teal-50 border border-teal-200/80 rounded-xl text-xs text-teal-900 font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <Search className="w-3.5 h-3.5 text-[#005a9c] shrink-0" />
                  <span className="truncate">
                    Khớp: <b>"{searchQuery}"</b>
                  </span>
                </div>
                <span className="text-[11px] font-bold text-teal-800 bg-white px-2 py-0.5 rounded-full border border-teal-200 shrink-0">
                  {treeMatchStats.stationCount} trạm • {treeMatchStats.custCount} KH
                </span>
              </div>
            )}

            {/* Tree Structure Content */}
            <div className="max-h-[580px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#005a9c]" />
                  <span>Đang nạp sơ đồ cây dữ liệu...</span>
                </div>
              ) : Object.keys(treeData).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Không tìm thấy dữ liệu phù hợp với từ khóa "{searchQuery}"
                </div>
              ) : (
                (Object.values(treeData) as AreaNode[]).map(area => {
                  const isKvOpen = Boolean(expandedKhuVuc[area.khuVuc]);
                  const kvStations = Object.values(area.stations) as StationNode[];
                  const percentKv = area.totalKh > 0 ? Math.round((area.checkedKh / area.totalKh) * 100) : 0;

                  return (
                    <div key={area.khuVuc} className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      {/* Level 1: Khu vực */}
                      <div
                        onClick={() => toggleKvExpand(area.khuVuc)}
                        className="flex items-center justify-between p-2.5 bg-slate-100/90 hover:bg-slate-200/80 cursor-pointer select-none transition-colors border-b border-slate-200/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isKvOpen ? (
                            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                          )}
                          <Building2 className="w-4 h-4 text-[#005a9c] shrink-0" />
                          <span className="font-bold text-xs md:text-sm text-slate-800 truncate">
                            {area.khuVuc}
                          </span>
                          <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                            {kvStations.length} trạm
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {area.checkedKh}/{area.totalKh} ({percentKv}%)
                          </span>
                        </div>
                      </div>

                      {/* Level 2: Mã trạm -> Tên trạm */}
                      {isKvOpen && (
                        <div className="divide-y divide-slate-100 bg-white">
                          {kvStations.map(station => {
                            const stKey = `${area.khuVuc}___${station.maTram || station.tenTram}`;
                            const isStOpen = Boolean(expandedTram[stKey]);
                            const isAssigned = Boolean(station.nguoiThucHien && station.nguoiThucHien.trim().length > 0);
                            const isStationMatched = searchLower.length > 0 && (
                              station.maTram?.toLowerCase().includes(searchLower) ||
                              station.tenTram?.toLowerCase().includes(searchLower) ||
                              (searchNorm ? (
                                normalizeSearchStr(station.maTram).includes(searchNorm) ||
                                normalizeSearchStr(station.tenTram).includes(searchNorm)
                              ) : false)
                            );

                            return (
                              <div key={stKey} className="pl-3">
                                <div
                                  onClick={() => toggleTramExpand(area.khuVuc, station.maTram || station.tenTram)}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 py-2 pr-2.5 hover:bg-slate-50 cursor-pointer select-none transition-colors"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {isStOpen ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    )}
                                    <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <div className="flex flex-col min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-slate-800 truncate">
                                          {station.maTram ? `${station.maTram} ➔ ${station.tenTram}` : station.tenTram}
                                        </span>
                                        {isStationMatched && (
                                          <span className="text-[9px] font-bold text-teal-800 bg-teal-100 border border-teal-300 px-1 rounded shrink-0">
                                            Khớp trạm
                                          </span>
                                        )}
                                      </div>
                                      {isAssigned ? (
                                        <span className="text-[10px] text-emerald-600 font-medium truncate" title={station.nguoiThucHien}>
                                          Người TH: {station.nguoiThucHien}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-amber-600 font-medium">Chưa phân công</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 pl-6 sm:pl-0">
                                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                      {station.checkedKh}/{station.totalKh}
                                    </span>

                                    {/* Phân công button for Tổ trưởng */}
                                    {isToTruong && (
                                      <>
                                        {!isAssigned ? (
                                          <button
                                            type="button"
                                            onClick={e =>
                                              handleOpenAssign(e, {
                                                maTram: station.maTram,
                                                tenTram: station.tenTram,
                                                khuVuc: station.khuVuc,
                                                totalKh: station.totalKh,
                                                currentAssignee: station.nguoiThucHien
                                              })
                                            }
                                            className="text-[10px] font-bold px-2 py-0.5 bg-[#005a9c] hover:bg-[#004b87] text-white rounded shadow-xs active:scale-95 transition-all cursor-pointer"
                                            title="Phân công công nhân kiểm tra trạm này"
                                          >
                                            Phân công
                                          </button>
                                        ) : (
                                          <span
                                            className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded cursor-not-allowed border border-slate-200"
                                            title="Trạm đã được phân công, không được phân công lại"
                                          >
                                            Đã PC (khóa)
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Level 3: Danh số -> Mã KH -> Tên KH -> Số No */}
                                {isStOpen && (
                                  <div className="pl-5 pr-1 py-1 space-y-1 bg-slate-50/60 border-l border-slate-200 mb-1 rounded-r-lg">
                                    {station.customers.map(customer => {
                                      const isDone = Boolean(customer.ketQua && customer.ketQua.trim().length > 0);
                                      const isSelected = selectedMaKh === customer.maKh;

                                      return (
                                        <div
                                          key={customer.maKh}
                                          onClick={() => {
                                            setSelectedMaKh(customer.maKh);
                                            setMobileTab('inspect');
                                            setOpenSections(prev => ({ ...prev, inspect: true }));
                                          }}
                                          title={`Danh số: ${customer.danhSo || '---'}\nMã KH: ${customer.maKh}\nTên KH: ${customer.tenKh}${customer.soNo ? '\nSố No (Điện kế): ' + customer.soNo : ''}${customer.diaChi ? '\nĐịa chỉ: ' + customer.diaChi : ''}${customer.soDienThoai ? '\nSĐT: ' + formatPhoneNumber(customer.soDienThoai) : ''}`}
                                          className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                                            isSelected
                                              ? 'bg-[#005a9c] text-white font-bold shadow-xs'
                                              : 'hover:bg-white text-slate-700 font-medium'
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            {isDone ? (
                                              <CheckCircle2
                                                className={`w-3.5 h-3.5 shrink-0 ${
                                                  isSelected ? 'text-white' : customer.ketQua === 'Bình thường' ? 'text-emerald-500' : 'text-rose-500'
                                                }`}
                                              />
                                            ) : (
                                              <span
                                                className={`w-2 h-2 rounded-full shrink-0 ${
                                                  isSelected ? 'bg-white' : 'bg-slate-300'
                                                }`}
                                              />
                                            )}
                                            <span className="truncate">
                                              {customer.danhSo || '---'} ➔ <b>{customer.maKh}</b> ➔ {customer.tenKh} ➔ {customer.soNo || '---'}
                                            </span>
                                          </div>

                                          {isDone && (
                                            <span
                                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                                                isSelected
                                                  ? 'bg-white/20 text-white'
                                                  : customer.ketQua === 'Bình thường'
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : 'bg-rose-100 text-rose-800'
                                              }`}
                                            >
                                              {customer.ketQua}
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
                })
              )}
            </div>
          </div>
        ) : (
          /* Trạng thái Sơ đồ cây đang thu gọn theo hướng ngang */
          <>
            {/* Trên Desktop: Cột đứng siêu gọn với nút mở rộng ngang ▶ */}
            <div
              className="hidden lg:flex flex-col items-center py-4 px-2 w-14 shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 gap-4 cursor-pointer hover:border-[#005a9c]/50 group select-none"
              onClick={() => setTreeHorizontalOpen(true)}
              title="Nhấp để mở rộng sơ đồ cây sang phải (theo hướng ngang)"
            >
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setTreeHorizontalOpen(true);
                }}
                className="p-2 rounded-xl bg-teal-50 hover:bg-[#005a9c] text-[#005a9c] hover:text-white transition-all shadow-xs group-hover:scale-105 cursor-pointer"
                title="Mở rộng sơ đồ cây theo hướng ngang"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <FolderTree className="w-5 h-5 text-[#005a9c]" />
              <div className="py-2 flex items-center justify-center select-none">
                <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-bold text-slate-600 tracking-wider uppercase group-hover:text-[#005a9c] transition-colors">
                  SƠ ĐỒ CÂY
                </span>
              </div>
              <div className="mt-auto flex flex-col items-center gap-1 text-[10px] text-slate-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>

            {/* Trên Mobile: Dòng ngang với nút mở rộng */}
            <div
              className={`flex lg:hidden w-full items-center justify-between p-3 bg-white rounded-2xl border border-slate-200 shadow-xs cursor-pointer ${
                mobileTab !== 'tree' ? 'hidden' : 'flex'
              }`}
              onClick={() => setTreeHorizontalOpen(true)}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <FolderTree className="w-4 h-4 text-[#005a9c]" />
                <span>Sơ đồ cây (đang thu gọn theo hướng ngang)</span>
              </div>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setTreeHorizontalOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-[#005a9c] hover:bg-[#005a9c] hover:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                <span>Mở rộng</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {/* ======================================================== */}
        {/* RIGHT COLUMN: SECTION 2.2, 2.3, 2.4                     */}
        {/* ======================================================== */}
        <div className="flex-1 min-w-0 flex flex-col gap-5 w-full">
          {/* ======================================================== */}
          {/* SECTION 2.2: BÊN PHẢI TRÊN - CHI TIẾT KH & NHẬP KẾT QUẢ   */}
          {/* ======================================================== */}
          <div
            className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 md:p-5 flex flex-col gap-4 ${
              mobileTab !== 'inspect' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Header with Collapsible Toggle */}
            <div
              onClick={() => toggleSection('inspect')}
              className="flex items-center justify-between pb-3 border-b border-slate-100 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                {/* Nút mở nhanh sơ đồ cây khi đang co lại theo hướng ngang */}
                {!treeHorizontalOpen && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setTreeHorizontalOpen(true);
                    }}
                    className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#005a9c] text-xs font-bold rounded-xl border border-teal-200 transition-colors shadow-xs cursor-pointer mr-1"
                    title="Mở rộng sơ đồ cây sang phải"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>Mở sơ đồ cây</span>
                  </button>
                )}
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  2.2
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-sm md:text-base uppercase tracking-tight">
                    Chi tiết Khách hàng & Cập nhật Kết quả kiểm tra
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Cập nhật kết quả đo đếm, niêm chì và đề xuất xử lý vào Google Sheets
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedCustomer && openSections.inspect && (
                  <div className="hidden sm:flex items-center gap-1">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleNavigateCustomer('prev');
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                      title="Khách hàng trước trong trạm"
                    >
                      ◀ Trước
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleNavigateCustomer('next');
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                      title="Khách hàng tiếp theo trong trạm"
                    >
                      Tiếp ▶
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                  title={openSections.inspect ? 'Thu gọn phần nhập kết quả' : 'Mở rộng phần nhập kết quả'}
                >
                  {openSections.inspect ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!openSections.inspect ? (
              <div
                onClick={() => toggleSection('inspect')}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 border border-dashed border-slate-300 flex items-center justify-between cursor-pointer transition-colors"
              >
                <span>
                  📝 {selectedCustomer ? (
                    <span>
                      Đang chọn: <b>{selectedCustomer.maKh}</b> - <b>{selectedCustomer.tenKh}</b> • KQ:{' '}
                      <b className={selectedCustomer.ketQua === 'Bình thường' ? 'text-emerald-600' : 'text-rose-600'}>
                        {selectedCustomer.ketQua || 'Chưa kiểm tra'}
                      </b>
                    </span>
                  ) : (
                    'Chưa chọn khách hàng kiểm tra'
                  )}
                </span>
                <span className="text-teal-600 font-bold text-[11px] underline">Mở rộng ➔</span>
              </div>
            ) : !selectedCustomer ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs md:text-sm flex flex-col items-center gap-2">
                <Info className="w-8 h-8 text-slate-400" />
                <span className="font-bold text-slate-700">Chưa chọn khách hàng</span>
                <span>Vui lòng nhấp chọn một khách hàng từ <b>Sơ đồ cây (bên trái)</b> hoặc <b>Danh sách (bên dưới)</b> để nhập kết quả kiểm tra.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Customer Information Card */}
                <div className="bg-slate-50/80 rounded-xl p-3 md:p-4 border border-slate-200/70 text-xs flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-[#005a9c] text-white font-mono font-bold rounded-md text-xs">
                        {selectedCustomer.maKh}
                      </span>
                      <span className="font-bold text-slate-900 text-sm md:text-base">
                        {selectedCustomer.tenKh}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {selectedCustomer.pic && (
                        <button
                          type="button"
                          onClick={() => setShowEnlargeModal(true)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-teal-100 text-teal-800 hover:bg-teal-200 transition-colors cursor-pointer border border-teal-200 shadow-2xs"
                          title="Bấm để xem phóng to ảnh công tơ đã lưu"
                        >
                          <Camera className="w-3 h-3 text-teal-700" />
                          <span>Có ảnh công tơ</span>
                        </button>
                      )}

                      {selectedCustomer.ketQua ? (
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            selectedCustomer.ketQua === 'Bình thường'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          ✓ Đã kiểm tra: {selectedCustomer.ketQua}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800">
                          Chưa kiểm tra
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Grid details (Địa chỉ có chỉ đường, Phone có Gọi Call & Zalo) */}
                  {(() => {
                    const customerPhone = formatPhoneNumber(selectedCustomer.soDienThoai);
                    const directionsUrl = getCustomerDirectionsUrl(
                      selectedCustomer.diaChi,
                      selectedCustomer.khuVuc,
                      selectedCustomer.tenTram,
                      selectedCustomer.x,
                      selectedCustomer.y
                    );
                    const hasCoords = Boolean(selectedCustomer.x && selectedCustomer.y);

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-slate-600">
                        {/* Hàng Địa chỉ - Icon vị trí chính là nút chỉ đường (kết hợp) */}
                        <div className="flex items-center gap-2.5 sm:col-span-2 lg:col-span-3 bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-rose-200 transition-all group">
                          {directionsUrl ? (
                            <a
                              href={directionsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-9 h-9 rounded-xl bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-90 cursor-pointer"
                              title={
                                hasCoords
                                  ? `Bấm vào biểu tượng vị trí này để chỉ đường Google Maps đến tọa độ GPS (${selectedCustomer.x}, ${selectedCustomer.y})`
                                  : 'Bấm vào biểu tượng vị trí này để mở chỉ đường Google Maps'
                              }
                            >
                              <MapPin className="w-4 h-4 transition-transform group-hover:scale-110" />
                            </a>
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                              <MapPin className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Địa chỉ khách hàng</span>
                              {directionsUrl && (
                                <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-0.5">
                                  <Navigation className="w-2.5 h-2.5" />
                                  {hasCoords ? 'Chỉ đường GPS' : 'Bấm icon để chỉ đường'}
                                </span>
                              )}
                              {hasCoords && (
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono font-bold border border-emerald-200 flex items-center gap-1"
                                  title={`Tọa độ GPS đã lưu: X=${selectedCustomer.x}, Y=${selectedCustomer.y}`}
                                >
                                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                  GPS: {selectedCustomer.x}, {selectedCustomer.y}
                                </span>
                              )}
                              {/* Nút cập nhật lại tọa độ khi lệch từ 10m trở lên */}
                              {hasCoords && coordDiffDistance !== null && coordDiffDistance >= 10 && (
                                <button
                                  type="button"
                                  onClick={handleUpdateCoordsToCurrent}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold shadow-2xs transition-all active:scale-95 cursor-pointer animate-pulse"
                                  title={`Điểm bạn đang đứng cách tọa độ cũ ${Math.round(coordDiffDistance)}m. Nhấp vào đây để cập nhật lại tọa độ tại vị trí này!`}
                                >
                                  <Crosshair className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>Lệch {Math.round(coordDiffDistance)}m • Cập nhật lại</span>
                                </button>
                              )}
                            </div>
                            {selectedCustomer.diaChi ? (
                              <a
                                href={directionsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs sm:text-sm font-semibold text-slate-900 hover:text-rose-700 hover:underline block truncate mt-0.5 transition-colors cursor-pointer"
                                title={
                                  hasCoords
                                    ? `Chỉ đường GPS đến (${selectedCustomer.x}, ${selectedCustomer.y}) - ${selectedCustomer.diaChi}`
                                    : `Chỉ đường đến: ${selectedCustomer.diaChi}`
                                }
                              >
                                {selectedCustomer.diaChi}
                                {selectedCustomer.khuVuc && (
                                  <span className="text-slate-500 text-xs font-normal ml-1.5">
                                    ({selectedCustomer.khuVuc})
                                  </span>
                                )}
                              </a>
                            ) : hasCoords ? (
                              <a
                                href={directionsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs sm:text-sm font-semibold text-emerald-700 hover:underline block truncate mt-0.5 transition-colors cursor-pointer"
                                title={`Chỉ đường tới tọa độ GPS: ${selectedCustomer.x}, ${selectedCustomer.y}`}
                              >
                                Tọa độ GPS: {selectedCustomer.x}, {selectedCustomer.y}
                              </a>
                            ) : (
                              <span className="text-slate-400 italic text-xs block mt-0.5">
                                Chưa có thông tin địa chỉ
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Hàng Số điện thoại - Hỗ trợ Cập nhật lại số điện thoại hoặc Thêm mới */}
                        <div className="flex items-center justify-between gap-2.5 sm:col-span-2 lg:col-span-3 bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-emerald-200 transition-all">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {customerPhone ? (
                              <a
                                href={`tel:${customerPhone}`}
                                className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-90 cursor-pointer"
                                title={`Bấm vào biểu tượng để gọi trực tiếp số ${customerPhone}`}
                              >
                                <PhoneCall className="w-4 h-4" />
                              </a>
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                                <Phone className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Số điện thoại liên hệ</span>
                              
                              {isEditingPhone ? (
                                <div className="flex items-center gap-1.5 mt-1 max-w-sm">
                                  <input
                                    type="tel"
                                    value={editingPhoneVal}
                                    onChange={e => setEditingPhoneVal(e.target.value)}
                                    placeholder="Nhập số điện thoại..."
                                    className="flex-1 px-2.5 py-1 text-xs font-mono font-bold bg-white border border-emerald-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleSavePhone();
                                      if (e.key === 'Escape') setIsEditingPhone(false);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    disabled={isSavingPhone}
                                    onClick={handleSavePhone}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                                    title="Lưu số điện thoại"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Lưu</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIsEditingPhone(false)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                                    title="Hủy"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : customerPhone ? (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <a
                                    href={`tel:${customerPhone}`}
                                    className="font-mono font-black text-sm text-slate-900 hover:text-emerald-700 tracking-wider block"
                                    title={`Bấm để gọi số ${customerPhone}`}
                                  >
                                    {customerPhone}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPhoneVal(selectedCustomer.soDienThoai || '');
                                      setIsEditingPhone(true);
                                    }}
                                    className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                    title="Cập nhật số điện thoại khác cho khách hàng"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-slate-400 italic text-xs">Chưa có số điện thoại</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPhoneVal('');
                                      setIsEditingPhone(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-[10px] font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                                    title="Thêm số điện thoại mới cho khách hàng này"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Thêm SĐT</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {!isEditingPhone && customerPhone && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Nút icon Call */}
                              <a
                                href={`tel:${customerPhone}`}
                                className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xs transition-transform active:scale-90 cursor-pointer"
                                title={`Gọi điện thoại đến số ${customerPhone}`}
                              >
                                <PhoneCall className="w-4 h-4" />
                              </a>
                              {/* Nút icon Zalo */}
                              <a
                                href={`https://zalo.me/${customerPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-xl bg-[#0068ff] hover:bg-[#0052cc] text-white flex items-center justify-center shadow-xs transition-transform active:scale-90 cursor-pointer"
                                title={`Gọi hoặc nhắn tin Zalo tới số ${customerPhone}`}
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Các thông tin khác */}
                        <div className="flex items-center gap-2 p-2 bg-slate-50/80 rounded-xl border border-slate-200/60">
                          <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
                          <div className="min-w-0 truncate">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Khu vực</span>
                            <span className="font-semibold text-slate-800 text-xs truncate">{selectedCustomer.khuVuc || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 bg-slate-50/80 rounded-xl border border-slate-200/60">
                          <Layers className="w-4 h-4 text-amber-500 shrink-0" />
                          <div className="min-w-0 truncate">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Trạm</span>
                            <span className="font-semibold text-slate-800 text-xs truncate" title={`${selectedCustomer.maTram} - ${selectedCustomer.tenTram}`}>
                              {selectedCustomer.maTram ? `${selectedCustomer.maTram} - ${selectedCustomer.tenTram}` : selectedCustomer.tenTram}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 bg-slate-50/80 rounded-xl border border-slate-200/60">
                          <div className="w-4 h-4 rounded text-slate-500 font-mono font-black text-[10px] flex items-center justify-center border border-slate-300">
                            No
                          </div>
                          <div className="min-w-0 truncate">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Số No công tơ</span>
                            <span className="font-mono font-semibold text-slate-800 text-xs truncate">{selectedCustomer.soNo || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 bg-slate-50/80 rounded-xl border border-slate-200/60">
                          <div className="w-4 h-4 rounded text-slate-500 font-mono font-black text-[10px] flex items-center justify-center border border-slate-300">
                            DS
                          </div>
                          <div className="min-w-0 truncate">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Danh số</span>
                            <span className="font-mono font-semibold text-slate-800 text-xs truncate">{selectedCustomer.danhSo || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 bg-slate-50/80 rounded-xl border border-slate-200/60 sm:col-span-2">
                          <UserCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="min-w-0 truncate">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Người thực hiện</span>
                            <span className="font-semibold text-slate-800 text-xs truncate">
                              {selectedCustomer.nguoiThucHien ? (
                                selectedCustomer.nguoiThucHien
                              ) : (
                                <span className="text-amber-600 font-bold italic">
                                  Chưa phân công (Sẽ ghi nhận: {sessionUser?.name || 'Bạn'} khi lưu)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Form Input Section */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 md:p-5 shadow-xs flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200/60">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs md:text-sm font-bold text-slate-900 uppercase tracking-wide">
                          Phiếu kết quả kiểm tra kiện toàn HTĐĐ
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Ghi nhận tình trạng kiểm tra thực tế tại hiện trường
                        </p>
                      </div>
                    </div>

                    {/* Ngày kiểm tra compact */}
                    <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors">
                      <Calendar className="w-3.5 h-3.5 text-[#005a9c]" />
                      <span className="text-[11px] font-bold text-slate-600">Ngày KT:</span>
                      <input
                        type="text"
                        value={inspectNgay}
                        onChange={e => setInspectNgay(e.target.value)}
                        placeholder="dd/mm/yyyy"
                        className="w-24 bg-transparent font-mono text-xs font-bold text-slate-900 outline-none text-center"
                      />
                    </div>
                  </div>

                  {/* 2 Khối chọn hiện đại: Kết quả & Chì? */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Phần 1: Kết quả kiểm tra */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <span>1. Kết quả kiểm tra</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        {inspectKetQua && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              inspectKetQua === 'Bình thường'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            ✓ {inspectKetQua}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Card: Bình thường */}
                        <button
                          type="button"
                          onClick={() => setInspectKetQua('Bình thường')}
                          className={`relative p-3 rounded-xl border-2 text-left transition-all cursor-pointer active:scale-98 flex flex-col justify-between gap-2.5 ${
                            inspectKetQua === 'Bình thường'
                              ? 'bg-emerald-50/90 border-emerald-600 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                inspectKetQua === 'Bình thường'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              }`}
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all ${
                                inspectKetQua === 'Bình thường'
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-slate-300 text-transparent'
                              }`}
                            >
                              ✓
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm">Bình thường</div>
                            <div className="text-[11px] text-slate-500 font-normal">Đạt chuẩn HTĐĐ</div>
                          </div>
                        </button>

                        {/* Card: Không (Bất thường) */}
                        <button
                          type="button"
                          onClick={() => setInspectKetQua('Không')}
                          className={`relative p-3 rounded-xl border-2 text-left transition-all cursor-pointer active:scale-98 flex flex-col justify-between gap-2.5 ${
                            inspectKetQua === 'Không'
                              ? 'bg-rose-50/90 border-rose-600 text-rose-950 shadow-sm ring-2 ring-rose-500/20'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                inspectKetQua === 'Không'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-rose-50 text-rose-600 border border-rose-200'
                              }`}
                            >
                              <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all ${
                                inspectKetQua === 'Không'
                                  ? 'border-rose-600 bg-rose-600 text-white'
                                  : 'border-slate-300 text-transparent'
                              }`}
                            >
                              ✓
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm">Không</div>
                            <div className="text-[11px] text-slate-500 font-normal">Phát hiện bất thường</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Phần 2: Chì? */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <span>2. Tình trạng niêm chì (Chì?)</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        {inspectChi && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              inspectChi === 'Có'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            ✓ {inspectChi === 'Có' ? 'Có chì' : 'Không chì'}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Card: Có chì */}
                        <button
                          type="button"
                          onClick={() => setInspectChi('Có')}
                          className={`relative p-3 rounded-xl border-2 text-left transition-all cursor-pointer active:scale-98 flex flex-col justify-between gap-2.5 ${
                            inspectChi === 'Có'
                              ? 'bg-blue-50/90 border-blue-600 text-blue-950 shadow-sm ring-2 ring-blue-500/20'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                inspectChi === 'Có'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-50 text-blue-600 border border-blue-200'
                              }`}
                            >
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all ${
                                inspectChi === 'Có'
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-slate-300 text-transparent'
                              }`}
                            >
                              ✓
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm">Có chì</div>
                            <div className="text-[11px] text-slate-500 font-normal">Niêm chì nguyên vẹn</div>
                          </div>
                        </button>

                        {/* Card: Không chì */}
                        <button
                          type="button"
                          onClick={() => setInspectChi('Không')}
                          className={`relative p-3 rounded-xl border-2 text-left transition-all cursor-pointer active:scale-98 flex flex-col justify-between gap-2.5 ${
                            inspectChi === 'Không'
                              ? 'bg-amber-50/90 border-amber-600 text-amber-950 shadow-sm ring-2 ring-amber-500/20'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                inspectChi === 'Không'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-amber-50 text-amber-600 border border-amber-200'
                              }`}
                            >
                              <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all ${
                                inspectChi === 'Không'
                                  ? 'border-amber-600 bg-amber-600 text-white'
                                  : 'border-slate-300 text-transparent'
                              }`}
                            >
                              ✓
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm">Không chì</div>
                            <div className="text-[11px] text-slate-500 font-normal">Mất chì / đứt niêm</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3. Hình ảnh công tơ đo đếm (Trường Pic & Google Drive) */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-[#005a9c]" />
                        <span>3. Hình ảnh công tơ đo đếm (Trường Pic)</span>
                      </label>

                      {/* Link mở thư mục Google Drive */}
                      <a
                        href="https://drive.google.com/drive/folders/1eze4kVWtdUr0gjKSEAB_BKSfm5CNg3fv?usp=drive_link"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-slate-500 hover:text-[#005a9c] font-medium flex items-center gap-1 transition-colors"
                        title="Mở thư mục lưu ảnh công tơ trên Google Drive"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                        <span className="hidden sm:inline">Thư mục Drive</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    {/* Hidden inputs cho chụp ảnh bằng Camera và chọn từ thư viện */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageSelected}
                      className="hidden"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelected}
                      className="hidden"
                    />

                    {/* Khung hiển thị ảnh công tơ */}
                    {inspectPicPreview || inspectPicUrl ? (
                      <div className="relative rounded-xl border border-slate-200 bg-slate-900/5 p-3 flex flex-col sm:flex-row items-center gap-3.5">
                        {/* Khung ảnh thu nhỏ có thể click xem phóng to */}
                        <div
                          onClick={() => setShowEnlargeModal(true)}
                          className="relative w-full sm:w-36 h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center cursor-pointer group shadow-2xs shrink-0"
                          title="Bấm vào để xem phóng to ảnh công tơ"
                        >
                          <img
                            src={getDrivePreviewUrl(inspectPicPreview || inspectPicUrl)}
                            alt={`Công tơ ${selectedCustomer.maKh}`}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                            onError={(e: any) => {
                              if (inspectPicUrl && e.target.src !== inspectPicUrl) {
                                e.target.src = inspectPicUrl;
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                            <Eye className="w-4 h-4" />
                            <span>Xem to</span>
                          </div>
                          {isUploadingPic && (
                            <div className="absolute bottom-1 right-1 bg-black/75 px-1.5 py-0.5 rounded-md text-[10px] text-white font-bold flex items-center gap-1 backdrop-blur-xs">
                              <Loader2 className="w-2.5 h-2.5 animate-spin text-teal-300" />
                              <span>Đang gửi Drive...</span>
                            </div>
                          )}
                        </div>

                        {/* Thông tin chi tiết ảnh & Các nút chức năng nhỏ gọn */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-xs text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                                KT_{selectedCustomer.maKh}.jpg
                              </span>
                              {picSizeKb && (
                                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                                  Nén: {picSizeKb} KB
                                </span>
                              )}
                              {isUploadingPic ? (
                                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 animate-pulse">
                                  <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                                  Đang lưu Drive (chạy nền)...
                                </span>
                              ) : inspectPicUrl ? (
                                <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded font-bold">
                                  ✓ Đã lưu Google Drive
                                </span>
                              ) : null}
                            </div>

                            <p className="text-[11px] text-slate-500">
                              Ảnh được lưu vào thư mục Drive và tự động đồng bộ vào trường <b>Pic</b> của sheet <b>KTHTDD</b>.
                            </p>
                          </div>

                          {/* Thanh icon chức năng nhỏ gọn (Chụp lại, Đổi ảnh, Xem to, Link Drive, Xóa) */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            {/* Nút chụp lại ảnh bằng Camera */}
                            <button
                              type="button"
                              disabled={isUploadingPic}
                              onClick={handleTriggerCamera}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-300 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                              title="Chụp lại ảnh mới bằng Camera"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Chụp lại</span>
                            </button>

                            {/* Nút đổi ảnh / tải ảnh từ máy */}
                            <button
                              type="button"
                              disabled={isUploadingPic}
                              onClick={handleTriggerFile}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                              title="Chọn ảnh khác từ bộ nhớ máy"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Đổi ảnh</span>
                            </button>

                            {/* Nút xem to ảnh */}
                            <button
                              type="button"
                              onClick={() => setShowEnlargeModal(true)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                              title="Phóng to ảnh xem chi tiết chỉ số và niêm chì"
                            >
                              <Maximize2 className="w-3 h-3" />
                              <span>Xem to</span>
                            </button>

                            {/* Mở link trực tiếp Drive */}
                            {inspectPicUrl && !inspectPicUrl.startsWith('data:') && (
                              <a
                                href={getDriveDirectViewUrl(inspectPicUrl) || inspectPicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-50 text-blue-600 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                title="Mở file ảnh trên Google Drive"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Drive</span>
                              </a>
                            )}

                            {/* Nút xóa ảnh */}
                            <button
                              type="button"
                              disabled={isUploadingPic}
                              onClick={handleRemovePic}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-auto cursor-pointer"
                              title="Xóa liên kết ảnh này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Khung chưa có ảnh: Giao diện trực quan chụp ảnh hoặc tải ảnh */
                      <div className="rounded-xl border-2 border-dashed border-slate-300 hover:border-[#005a9c] bg-slate-50/50 p-3.5 transition-all">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                              <ImageIcon className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800">Chưa có ảnh công tơ</div>
                              <div className="text-[11px] text-slate-500">
                                Chụp hoặc tải ảnh lên (tự động nén siêu nhẹ ~60-120KB & lưu Drive với tên <b>KT_{selectedCustomer.maKh}</b>)
                              </div>
                            </div>
                          </div>

                          {/* 2 Nút chụp ảnh hoặc tải ảnh */}
                          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                            <button
                              type="button"
                              disabled={isUploadingPic}
                              onClick={handleTriggerCamera}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#005a9c] hover:bg-[#004b87] text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                              title="Mở Camera chụp ảnh công tơ ngay"
                            >
                              {isUploadingPic ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Camera className="w-3.5 h-3.5" />
                              )}
                              <span>Chụp ảnh</span>
                            </button>

                            <button
                              type="button"
                              disabled={isUploadingPic}
                              onClick={handleTriggerFile}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                              title="Chọn ảnh có sẵn từ bộ nhớ máy"
                            >
                              <Upload className="w-3.5 h-3.5 text-slate-500" />
                              <span>Tải ảnh lên</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {uploadPicError && (
                      <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                        {uploadPicError}
                      </div>
                    )}
                  </div>

                  {/* 4. Trường Đề xuất (Nhập giọng nói - Requirement 1) */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <span>Đề xuất xử lý (nếu có kiến nghị)</span>
                      </label>

                      {/* Mic Button for DeXuat */}
                      <button
                        type="button"
                        onClick={toggleVoiceDeXuat}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          isListeningDeXuat
                            ? 'bg-rose-500 text-white animate-pulse shadow-md ring-2 ring-rose-300'
                            : 'bg-slate-100 hover:bg-[#005a9c] text-slate-700 hover:text-white border border-slate-200'
                        }`}
                        title={isListeningDeXuat ? 'Đang nghe... bấm để dừng' : 'Bấm để đọc đề xuất bằng giọng nói (Voice input)'}
                      >
                        {isListeningDeXuat ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-rose-500 group-hover:text-white" />}
                        <span>{isListeningDeXuat ? 'Đang nghe đề xuất...' : 'Nói đề xuất (Micro)'}</span>
                      </button>
                    </div>

                    {isListeningDeXuat && (
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg animate-in fade-in">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        <span>Đang nghe... Hãy nói đề xuất (ví dụ: "thay công tơ kẹt đĩa", "bổ sung niêm chì bo", v.v.)</span>
                      </div>
                    )}
                    {speechDeXuatError && (
                      <div className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        {speechDeXuatError}
                      </div>
                    )}

                    <div className="relative">
                      <textarea
                        rows={2}
                        value={inspectDeXuat}
                        onChange={e => setInspectDeXuat(e.target.value)}
                        placeholder="Nhập kiến nghị / đề xuất xử lý hệ thống đo đếm nếu cần (hoặc bấm 'Nói đề xuất' ở trên)..."
                        className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-[#005a9c] focus:ring-1 focus:ring-[#005a9c] outline-none font-medium resize-none"
                      />
                      {inspectDeXuat && (
                        <button
                          type="button"
                          onClick={() => setInspectDeXuat('')}
                          className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 bg-slate-100/80 rounded"
                          title="Xóa nội dung đề xuất"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Success notification */}
                  {inspectSuccessMsg && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{inspectSuccessMsg}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSavingInspect}
                      onClick={() => handleSaveInspection(false)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-[#005a9c] hover:bg-[#004b87] disabled:bg-slate-400 text-white text-xs md:text-sm font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingInspect ? 'Đang lưu...' : 'Lưu kết quả'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSavingInspect}
                      onClick={() => handleSaveInspection(true)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white text-xs md:text-sm font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                      title="Lưu kết quả và tự động chuyển sang khách hàng tiếp theo trong trạm"
                    >
                      <span>Lưu & Tiếp tục KH sau</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* CÁC PHẦN 2.3 VÀ 2.4 SẼ ẨN ĐI KHI NGƯỜI DÙNG LÀ NHÂN VIÊN */}
          {/* ======================================================== */}
          {!isEmployee && (
            <>
              {/* ======================================================== */}
              {/* SECTION 2.3: BÊN PHẢI GIỮA - DANH SÁCH ĐÃ & CHƯA KIỆN TOÀN*/}
              {/* ======================================================== */}
              <div
                className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 md:p-5 flex flex-col gap-4 ${
                  mobileTab !== 'list' ? 'hidden md:flex' : 'flex'
                }`}
              >
            {/* Header with Collapsible Toggle */}
            <div
              onClick={() => toggleSection('list')}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  2.3
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-sm md:text-base uppercase tracking-tight">
                    Danh sách Khách hàng Kiện toàn HTDD
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Lọc và tìm kiếm danh sách khách hàng đã kiểm tra hoặc chưa kiểm tra
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Toggle: Đã kiện toàn vs Chưa kiện toàn */}
                <div
                  onClick={e => e.stopPropagation()}
                  className="flex items-center bg-slate-100 p-1 rounded-xl"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setListType('done');
                      setListPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      listType === 'done' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đã kiện toàn ({globalKpi.done.toLocaleString('vi-VN')})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setListType('pending');
                      setListPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      listType === 'pending' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Chưa kiện toàn ({globalKpi.pending.toLocaleString('vi-VN')})</span>
                  </button>
                </div>

                {/* Nút Xuất Excel Danh sách phần 2.3 */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleExportExcel();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Xuất danh sách khách hàng ra file Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Xuất Excel</span>
                  <span className="sm:hidden">Excel</span>
                </button>

                <button
                  type="button"
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                  title={openSections.list ? 'Thu gọn danh sách' : 'Mở rộng danh sách'}
                >
                  {openSections.list ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!openSections.list ? (
              <div
                onClick={() => toggleSection('list')}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 border border-dashed border-slate-300 flex items-center justify-between cursor-pointer transition-colors"
              >
                <span>
                  📋 Danh sách đang thu gọn • Đang có <b>{filteredListEntries.length.toLocaleString('vi-VN')}</b> khách hàng ({listType === 'done' ? 'Đã kiểm tra' : 'Chưa kiểm tra'})
                </span>
                <span className="text-indigo-600 font-bold text-[11px] underline">Mở rộng ➔</span>
              </div>
            ) : (
              <>
                {/* Header Filters Bar (Lọc trên tiêu đề) */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-[#005a9c]" />
                      <span>Bộ lọc tiêu đề</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterKhuVuc('ALL');
                          setFilterTram('ALL');
                          setFilterAssignee('ALL');
                          setFilterKetQua('ALL');
                          setFilterChi('ALL');
                          setListSearchText('');
                          setListPage(1);
                        }}
                        className="text-[11px] font-semibold text-rose-600 hover:underline"
                      >
                        Xóa tất cả bộ lọc
                      </button>
                      <button
                        type="button"
                        onClick={handleExportExcel}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition-all active:scale-95"
                        title="Xuất danh sách đã lọc ra Excel"
                      >
                        <Download className="w-3 h-3" />
                        <span>Xuất Excel</span>
                      </button>
                    </div>
                  </div>

                  {/* Filters grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                    {/* 1. Lọc Khu vực */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Khu vực</label>
                      <select
                        value={filterKhuVuc}
                        onChange={e => {
                          setFilterKhuVuc(e.target.value);
                          setFilterTram('ALL');
                          setListPage(1);
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-[#005a9c]"
                      >
                        <option value="ALL">Tất cả ({allKhuVucs.length})</option>
                        {allKhuVucs.map(kv => (
                          <option key={kv} value={kv}>
                            {kv}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Lọc Trạm */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Trạm</label>
                      <select
                        value={filterTram}
                        onChange={e => {
                          setFilterTram(e.target.value);
                          setListPage(1);
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-[#005a9c]"
                      >
                        <option value="ALL">Tất cả trạm</option>
                        {allTramsForFilter.map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Lọc Người thực hiện */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Người TH</label>
                      <select
                        value={filterAssignee}
                        onChange={e => {
                          setFilterAssignee(e.target.value);
                          setListPage(1);
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-[#005a9c]"
                      >
                        <option value="ALL">Tất cả người TH</option>
                        {allAssigneesForFilter.map(name => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 4. Lọc Kết quả (chỉ hiện khi tab 'done') */}
                    {listType === 'done' && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Kết quả</label>
                        <select
                          value={filterKetQua}
                          onChange={e => {
                            setFilterKetQua(e.target.value);
                            setListPage(1);
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-[#005a9c]"
                        >
                          <option value="ALL">Tất cả KQ</option>
                          <option value="Bình thường">Bình thường</option>
                          <option value="Không">Không</option>
                        </select>
                      </div>
                    )}

                    {/* 5. Lọc Chì? */}
                    {listType === 'done' && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Chì?</label>
                        <select
                          value={filterChi}
                          onChange={e => {
                            setFilterChi(e.target.value);
                            setListPage(1);
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-[#005a9c]"
                        >
                          <option value="ALL">Tất cả chì</option>
                          <option value="Có">Có chì</option>
                          <option value="Không">Không chì</option>
                        </select>
                      </div>
                    )}

                    {/* 6. Tìm kiếm nhanh trong bảng */}
                    <div className={`flex flex-col gap-1 ${listType === 'pending' ? 'col-span-2' : ''}`}>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Tìm nhanh</label>
                      <input
                        type="text"
                        value={listSearchText}
                        onChange={e => {
                          setListSearchText(e.target.value);
                          setListPage(1);
                        }}
                        placeholder="Mã KH, tên, No, SĐT..."
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-[#005a9c]"
                      />
                    </div>
                  </div>
                </div>

                {/* Table of Customers */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">STT</th>
                        <th className="py-2.5 px-3">Mã KH</th>
                        <th className="py-2.5 px-3">Tên Khách Hàng</th>
                        <th className="py-2.5 px-3">Số ĐT</th>
                        <th className="py-2.5 px-3">Trạm</th>
                        <th className="py-2.5 px-3">Số No</th>
                        <th className="py-2.5 px-3">Khu vực</th>
                        <th className="py-2.5 px-3">Người TH</th>
                        {listType === 'done' && <th className="py-2.5 px-3">Ngày</th>}
                        {listType === 'done' && <th className="py-2.5 px-3">Kết quả</th>}
                        {listType === 'done' && <th className="py-2.5 px-3">Chì?</th>}
                        <th className="py-2.5 px-3 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedEntries.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="py-8 text-center text-slate-400 text-xs">
                            Không có dữ liệu phù hợp với bộ lọc hiện tại.
                          </td>
                        </tr>
                      ) : (
                        paginatedEntries.map((item, idx) => {
                          const rowNum = (listPage - 1) * listPageSize + idx + 1;
                          const isSelected = selectedMaKh === item.maKh;
                          const formattedPhone = formatPhoneNumber(item.soDienThoai);

                          return (
                            <tr
                              key={item.maKh}
                              onClick={() => {
                                setSelectedMaKh(item.maKh);
                                setMobileTab('inspect');
                                setOpenSections(prev => ({ ...prev, inspect: true }));
                              }}
                              className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                                isSelected ? 'bg-teal-50/70 font-semibold' : ''
                              }`}
                            >
                              <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{rowNum}</td>
                              <td className="py-2 px-3 font-mono font-bold text-[#005a9c] whitespace-nowrap">
                                {item.maKh}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-900 max-w-[180px] truncate" title={item.tenKh}>
                                {item.tenKh}
                              </td>
                              {/* Cột Số điện thoại có thêm số 0 ở trước (Requirement 3) */}
                              <td className="py-2 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                                {formattedPhone ? (
                                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                    <a
                                      href={`tel:${formattedPhone}`}
                                      className="font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1"
                                      title={`Bấm để gọi điện thoại đến số ${formattedPhone}`}
                                    >
                                      <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span>{formattedPhone}</span>
                                    </a>
                                    <a
                                      href={`https://zalo.me/${formattedPhone}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded bg-[#0068ff]/10 hover:bg-[#0068ff] text-[#0068ff] hover:text-white transition-colors"
                                      title={`Gọi điện hoặc nhắn tin Zalo tới số ${formattedPhone}`}
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                    </a>
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-600 max-w-[150px] truncate" title={item.tenTram}>
                                {item.maTram ? `${item.maTram} - ${item.tenTram}` : item.tenTram}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                                {item.soNo || '-'}
                              </td>
                              <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{item.khuVuc}</td>
                              <td className="py-2 px-3 text-slate-600 max-w-[130px] truncate" title={item.nguoiThucHien}>
                                {item.nguoiThucHien || <span className="text-amber-500 italic">Chưa PC</span>}
                              </td>
                              {listType === 'done' && (
                                <td className="py-2 px-3 text-slate-500 whitespace-nowrap text-[11px] font-mono">
                                  {item.ngay}
                                </td>
                              )}
                              {listType === 'done' && (
                                <td className="py-2 px-3 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      item.ketQua === 'Bình thường'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {item.ketQua}
                                  </span>
                                </td>
                              )}
                              {listType === 'done' && (
                                <td className="py-2 px-3 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      item.chi === 'Có' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {item.chi}
                                  </span>
                                </td>
                              )}
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                                  {(() => {
                                    const dirUrl = getCustomerDirectionsUrl(item.diaChi, item.khuVuc, item.tenTram, item.x, item.y);
                                    if (!dirUrl) return null;
                                    const hasGps = Boolean(item.x && item.y);
                                    return (
                                      <a
                                        href={dirUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition-all active:scale-95 shadow-xs"
                                        title={
                                          hasGps
                                            ? `Chỉ đường Google Maps đến tọa độ GPS (${item.x}, ${item.y})`
                                            : `Chỉ đường Google Maps đến địa chỉ: ${item.diaChi || item.tenTram}`
                                        }
                                      >
                                        <Navigation className="w-3.5 h-3.5 text-rose-600" />
                                      </a>
                                    );
                                  })()}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedMaKh(item.maKh);
                                      setMobileTab('inspect');
                                      setOpenSections(prev => ({ ...prev, inspect: true }));
                                    }}
                                    className="px-2.5 py-1 bg-[#005a9c] hover:bg-[#004b87] text-white text-[10px] font-bold rounded shadow-xs active:scale-95 transition-all"
                                  >
                                    Kiểm tra
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>
                      Hiển thị{' '}
                      <b>
                        {filteredListEntries.length > 0 ? (listPage - 1) * listPageSize + 1 : 0} -{' '}
                        {Math.min(listPage * listPageSize, filteredListEntries.length)}
                      </b>{' '}
                      trên tổng <b>{filteredListEntries.length.toLocaleString('vi-VN')}</b> khách hàng
                    </span>
                    <select
                      value={listPageSize}
                      onChange={e => {
                        setListPageSize(Number(e.target.value));
                        setListPage(1);
                      }}
                      className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs outline-none"
                    >
                      <option value={15}>15 dòng</option>
                      <option value={25}>25 dòng</option>
                      <option value={50}>50 dòng</option>
                      <option value={100}>100 dòng</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 self-center sm:self-auto">
                    <button
                      type="button"
                      disabled={listPage <= 1}
                      onClick={() => setListPage(p => Math.max(1, p - 1))}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded font-bold text-xs"
                    >
                      Trang trước
                    </button>
                    <span className="px-2 font-bold text-slate-700">
                      {listPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={listPage >= totalPages}
                      onClick={() => setListPage(p => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded font-bold text-xs"
                    >
                      Trang sau
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION 2.4: BÊN PHẢI DƯỚI - THỐNG KÊ NGÀY, TUẦN, THÁNG   */}
          {/* ======================================================== */}
          <div
            className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 md:p-5 flex flex-col gap-4 ${
              mobileTab !== 'stats' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Header with Collapsible Toggle */}
            <div
              onClick={() => toggleSection('stats')}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  2.4
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-sm md:text-base uppercase tracking-tight">
                    Thống kê Số liệu Thực hiện (Đã có kết quả)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Báo cáo tiến độ và chất lượng kiểm tra theo ngày, tuần, tháng
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Period Selector Tabs */}
                <div
                  onClick={e => e.stopPropagation()}
                  className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold"
                >
                  <button
                    type="button"
                    onClick={() => setStatsPeriod('day')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      statsPeriod === 'day' ? 'bg-[#005a9c] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Theo Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatsPeriod('week')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      statsPeriod === 'week' ? 'bg-[#005a9c] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Theo Tuần
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatsPeriod('month')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      statsPeriod === 'month' ? 'bg-[#005a9c] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Theo Tháng
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatsPeriod('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      statsPeriod === 'all' ? 'bg-[#005a9c] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả
                  </button>
                </div>

                {/* Nút Xuất Excel Thống kê phần 2.4 */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleExportStatsExcel();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Xuất báo cáo thống kê KPI ra file Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Xuất Excel Thống kê</span>
                  <span className="sm:hidden">Excel TK</span>
                </button>

                <button
                  type="button"
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                  title={openSections.stats ? 'Thu gọn thống kê' : 'Mở rộng thống kê'}
                >
                  {openSections.stats ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!openSections.stats ? (
              <div
                onClick={() => toggleSection('stats')}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 border border-dashed border-slate-300 flex items-center justify-between cursor-pointer transition-colors"
              >
                <span>
                  📊 Thống kê đang thu gọn • Khoảng thời gian: <b className="text-slate-800">{statsPeriodInfo.label}</b> • Đã kiểm tra: <b>{statsData.totalDone.toLocaleString('vi-VN')}</b> KH (Bình thường: <b>{statsData.totalBinhThuong}</b>, Không: <b>{statsData.totalKhong}</b>)
                </span>
                <span className="text-emerald-600 font-bold text-[11px] underline">Mở rộng ➔</span>
              </div>
            ) : (
              <>
                {/* Thanh điều khiển chọn giá trị thống kê cụ thể (ngày / tuần / tháng) */}
                <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Case 1: Chọn ngày */}
                  {statsPeriod === 'day' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <Calendar className="w-4 h-4 text-[#005a9c]" />
                        <span>Chọn ngày:</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={handlePrevDay}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Hôm trước"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <input
                          type="date"
                          value={statsSelectedDate}
                          onChange={e => e.target.value && setStatsSelectedDate(e.target.value)}
                          className="px-2 py-0.5 text-xs font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
                          title="Bấm để chọn ngày cụ thể từ lịch"
                        />
                        <button
                          type="button"
                          onClick={handleNextDay}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Hôm sau"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleToday}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          statsPeriodInfo.isCurrent
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs active:scale-95'
                        }`}
                        title="Xem số liệu hôm nay"
                      >
                        <RotateCcw className="w-3 h-3 text-emerald-600" />
                        <span>Hôm nay</span>
                      </button>
                    </div>
                  )}

                  {/* Case 2: Chọn tuần */}
                  {statsPeriod === 'week' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <Calendar className="w-4 h-4 text-[#005a9c]" />
                        <span>Chọn tuần (ngày trong tuần):</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={handlePrevWeek}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Tuần trước"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <input
                          type="date"
                          value={statsSelectedWeekDate}
                          onChange={e => e.target.value && setStatsSelectedWeekDate(e.target.value)}
                          className="px-2 py-0.5 text-xs font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
                          title="Chọn một ngày bất kỳ để xem tuần chứa ngày đó"
                        />
                        <button
                          type="button"
                          onClick={handleNextWeek}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Tuần sau"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleCurrentWeek}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          statsPeriodInfo.isCurrent
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs active:scale-95'
                        }`}
                        title="Xem tuần hiện tại"
                      >
                        <RotateCcw className="w-3 h-3 text-emerald-600" />
                        <span>Tuần này</span>
                      </button>
                    </div>
                  )}

                  {/* Case 3: Chọn tháng */}
                  {statsPeriod === 'month' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <Calendar className="w-4 h-4 text-[#005a9c]" />
                        <span>Chọn tháng:</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={handlePrevMonth}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Tháng trước"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <input
                          type="month"
                          value={statsSelectedMonth}
                          onChange={e => e.target.value && setStatsSelectedMonth(e.target.value)}
                          className="px-2 py-0.5 text-xs font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
                          title="Chọn tháng / năm"
                        />
                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Tháng sau"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleCurrentMonth}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          statsPeriodInfo.isCurrent
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs active:scale-95'
                        }`}
                        title="Xem tháng hiện tại"
                      >
                        <RotateCcw className="w-3 h-3 text-emerald-600" />
                        <span>Tháng này</span>
                      </button>
                    </div>
                  )}

                  {/* Case 4: Tất cả thời gian */}
                  {statsPeriod === 'all' && (
                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                      <BarChart3 className="w-4 h-4 text-[#005a9c]" />
                      <span>Đang thống kê toàn bộ thời gian ghi nhận dữ liệu trong bảng</span>
                    </div>
                  )}

                  {/* Badge tóm tắt khoảng thời gian đang lọc */}
                  <div className="flex items-center gap-2 ml-auto text-xs">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full font-bold text-slate-700 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-[#005a9c] animate-pulse"></span>
                      <span>{statsPeriodInfo.subLabel}</span>
                    </span>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold">
                      {statsData.totalDone.toLocaleString('vi-VN')} KH đã kiểm tra
                    </span>
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Tổng đã thực hiện</span>
                    <span className="text-xl font-black text-[#005a9c]">{statsData.totalDone.toLocaleString('vi-VN')}</span>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                    <span className="text-[10px] text-emerald-700 uppercase font-bold block">Bình thường</span>
                    <span className="text-xl font-black text-emerald-700">
                      {statsData.totalBinhThuong.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold block">
                      {statsData.totalDone > 0 ? Math.round((statsData.totalBinhThuong / statsData.totalDone) * 100) : 0}%
                    </span>
                  </div>
                  <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-center">
                    <span className="text-[10px] text-rose-700 uppercase font-bold block">Không bình thường</span>
                    <span className="text-xl font-black text-rose-700">
                      {statsData.totalKhong.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-[10px] text-rose-600 font-semibold block">
                      {statsData.totalDone > 0 ? Math.round((statsData.totalKhong / statsData.totalDone) * 100) : 0}%
                    </span>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
                    <span className="text-[10px] text-blue-700 uppercase font-bold block">Có chì</span>
                    <span className="text-xl font-black text-blue-700">
                      {statsData.totalCoChi.toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                    <span className="text-[10px] text-amber-700 uppercase font-bold block">Không chì (mất chì)</span>
                    <span className="text-xl font-black text-amber-700">
                      {statsData.totalMatChi.toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 text-center">
                    <span className="text-[10px] text-indigo-700 uppercase font-bold block">Có đề xuất xử lý</span>
                    <span className="text-xl font-black text-indigo-700">
                      {statsData.totalDeXuat.toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>

                {/* Breakdown Table 1: Thống kê theo Từng Khu vực */}
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#005a9c]" />
                      <span>Thống kê theo Từng Khu vực</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleExportStatsExcel}
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
                      title="Xuất toàn bộ báo cáo thống kê ra Excel"
                    >
                      <Download className="w-3 h-3" />
                      <span>Xuất Excel Báo cáo</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Khu vực</th>
                          <th className="py-2 px-3 text-right">Tổng KH</th>
                          <th className="py-2 px-3 text-right">Đã kiểm tra</th>
                          <th className="py-2 px-3 text-right">Tỷ lệ %</th>
                          <th className="py-2 px-3 text-right text-emerald-700">Bình thường</th>
                          <th className="py-2 px-3 text-right text-rose-700">Không</th>
                          <th className="py-2 px-3 text-right text-blue-700">Có chì</th>
                          <th className="py-2 px-3 text-right text-amber-700">Mất chì</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {statsData.areaList.map(item => {
                          const percent = item.totalInSheet > 0 ? Math.round((item.doneCount / item.totalInSheet) * 100) : 0;
                          return (
                            <tr key={item.khuVuc} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-bold text-slate-800">{item.khuVuc}</td>
                              <td className="py-2 px-3 text-right font-mono">{item.totalInSheet.toLocaleString('vi-VN')}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-[#005a9c]">
                                {item.doneCount.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-semibold">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px]">{percent}%</span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                                {item.binhThuong.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                                {item.khong.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-blue-600">
                                {item.coChi.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-amber-600">
                                {item.matChi.toLocaleString('vi-VN')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <tr>
                          <td className="py-2 px-3 uppercase text-slate-900">TỔNG CỘNG</td>
                          <td className="py-2 px-3 text-right font-mono">{globalKpi.total.toLocaleString('vi-VN')}</td>
                          <td className="py-2 px-3 text-right font-mono text-[#005a9c]">
                            {statsData.totalDone.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {globalKpi.total > 0 ? Math.round((statsData.totalDone / globalKpi.total) * 100) : 0}%
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-600">
                            {statsData.totalBinhThuong.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-rose-600">
                            {statsData.totalKhong.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-blue-600">
                            {statsData.totalCoChi.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-amber-600">
                            {statsData.totalMatChi.toLocaleString('vi-VN')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Breakdown Table 2: Thống kê theo Từng Nhóm / Người thực hiện */}
                <div className="flex flex-col gap-2 pt-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Thống kê theo Từng Nhân viên / Người thực hiện</span>
                  </span>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-64">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Họ và tên Người TH</th>
                          <th className="py-2 px-3 text-right">Số lượng đã KT</th>
                          <th className="py-2 px-3 text-right text-emerald-700">Bình thường</th>
                          <th className="py-2 px-3 text-right text-rose-700">Không</th>
                          <th className="py-2 px-3 text-right text-blue-700">Có chì</th>
                          <th className="py-2 px-3 text-right text-indigo-700">Có đề xuất</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {statsData.assigneeList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                              Chưa có số liệu thực hiện trong khoảng thời gian này.
                            </td>
                          </tr>
                        ) : (
                          statsData.assigneeList.map(item => (
                            <tr key={item.name} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-semibold text-slate-800">{item.name}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-[#005a9c]">
                                {item.doneCount.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-emerald-600">
                                {item.binhThuong.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-rose-600">
                                {item.khong.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-blue-600">
                                {item.coChi.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-indigo-600">
                                {item.deXuatCount.toLocaleString('vi-VN')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL PHÂN CÔNG KIỂM TRA TRẠM (CHỈ DÀNH CHO TỔ TRƯỞNG)   */}
      {/* ======================================================== */}
      {assignStation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#005a9c] to-teal-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-300" />
                <h3 className="font-bold text-sm md:text-base uppercase tracking-tight">
                  Phân công Kiểm tra Trạm
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignStation(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 md:p-5 flex flex-col gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 text-sm">
                  {assignStation.maTram} ➔ {assignStation.tenTram}
                </div>
                <div className="text-slate-500 mt-0.5">
                  Khu vực: <b>{assignStation.khuVuc}</b> • Tổng số: <b>{assignStation.totalKh}</b> khách hàng
                </div>
              </div>

              {/* Members Checklist */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">
                    Chọn nhân viên thuộc tổ để phân công:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAssignees(teamMembers.map(m => m.name))}
                      className="text-[11px] font-bold text-[#005a9c] hover:underline"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedAssignees([])}
                      className="text-[11px] font-bold text-slate-500 hover:underline"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1.5 p-2 bg-slate-50/80 rounded-xl border border-slate-200">
                  {teamMembers.map(member => {
                    const isChecked = selectedAssignees.includes(member.name);
                    return (
                      <label
                        key={member.name}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                          isChecked ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedAssignees(prev =>
                                isChecked ? prev.filter(n => n !== member.name) : [...prev, member.name]
                              );
                            }}
                            className="w-4 h-4 rounded text-[#005a9c] focus:ring-[#005a9c]"
                          />
                          <span>{member.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {member.role || member.team}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-600">
                <span className="font-bold text-slate-700">Người thực hiện sẽ ghi:</span>{' '}
                {selectedAssignees.length > 0 ? (
                  <span className="font-bold text-[#005a9c]">{selectedAssignees.join('; ')}</span>
                ) : (
                  <span className="italic text-slate-400">Chưa chọn nhân viên nào</span>
                )}
              </div>

              {assignMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-bold ${
                    assignMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {assignMsg.text}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignStation(null)}
                  disabled={isSavingAssign}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssign}
                  disabled={isSavingAssign || selectedAssignees.length === 0}
                  className="px-4 py-2 bg-[#005a9c] hover:bg-[#004b87] disabled:bg-slate-400 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isSavingAssign ? 'Đang cập nhật...' : 'Cập nhật phân công'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL QUÉT MÃ VẠCH (BARCODE) SỐ NO ĐIỆN KẾ                */}
      {/* ======================================================== */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onScan={handleBarcodeScanned}
        title="Quét Barcode Số No Điện Kế"
        subtitle="Hướng camera vào mã vạch (Barcode / QR) trên mặt đồng hồ điện kế"
      />

      {/* ======================================================== */}
      {/* MODAL PHÓNG TO XEM ẢNH CÔNG TƠ ĐO ĐẾM                   */}
      {/* ======================================================== */}
      {showEnlargeModal && (inspectPicPreview || inspectPicUrl) && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 md:p-6 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowEnlargeModal(false)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/90 text-white border-b border-slate-700">
              <div className="flex items-center gap-2 min-w-0">
                <Camera className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="font-mono text-xs md:text-sm font-bold truncate">
                  KT_{selectedCustomer?.maKh}.jpg {picSizeKb ? `(${picSizeKb} KB)` : ''}
                </span>
                {selectedCustomer && (
                  <span className="text-xs text-slate-400 truncate hidden sm:inline">
                    • {selectedCustomer.tenKh}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {inspectPicUrl && !inspectPicUrl.startsWith('data:') && (
                  <a
                    href={getDriveDirectViewUrl(inspectPicUrl) || inspectPicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
                    title="Mở ảnh trong Google Drive"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở Drive</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setShowEnlargeModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                  title="Đóng xem ảnh"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Hình ảnh lớn */}
            <div className="p-3 flex items-center justify-center bg-black/40 overflow-auto max-h-[80vh]">
              <img
                src={getDrivePreviewUrl(inspectPicPreview || inspectPicUrl)}
                alt={`Ảnh công tơ ${selectedCustomer?.maKh}`}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
