import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  RefreshCw, 
  Download, 
  FileSpreadsheet, 
  Filter, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Layers, 
  Building2, 
  Clock, 
  Zap, 
  BarChart3,
  CheckCircle2,
  Info,
  Upload,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DataStore, QuaHanEntry, TuSheetEntry, TiSheetEntry, SheetMember } from '../store/DataStore';
import { PermissionStore } from '../store/PermissionStore';

export const DIEN_KE_COLUMNS = [
  'MA_DVIQLY', 'MA_TBI', 'SO_TBI', 'SO_HUU', 'MA_CLOAI', 'DONG_DIEN', 'DIEN_AP', 'SO_PHA',
  'NGAY_KDINH', 'HAN_KDINH', 'LUU_KHO', 'MA_DDO', 'MA_KHANG', 'VH_CONG', 'HSN', 'NGAY_TTHAO',
  'TEN_TCHI', 'MA_TCHI', 'MA_KVUC', 'STT', 'TEN_KHANG', 'DCHI_DDO', 'DCHI_KHANG', 'SO_COT',
  'SO_HOP', 'MA_SOGCS', 'MA_TRAM', 'DTHOAI', 'HOP_BO', 'CHUOI_GIA', 'LOAI_TT_GT', 'TSO_TI', 'TSO_TU'
];

export const TU_COLUMNS = [
  'MA_DVIQLY', 'MA_TBI', 'SO_TBI', 'SO_HUU', 'MA_CLOAI', 'DIEN_AP', 'CAP_CXAC', 'SO_PHA',
  'TYSO_DAU', 'NGAY_KDINH', 'HAN_KDINH', 'LUU_KHO', 'MA_DDO', 'MA_KHANG', 'HSN', 'NGAY_TTHAO',
  'MA_TCHI', 'MA_KVUC', 'STT', 'TEN_KHANG', 'DCHI_DDO', 'DCHI_KHANG', 'MA_SOGCS', 'DTHOAI',
  'HOP_BO', 'CHUOI_GIA'
];

export const TI_COLUMNS = [
  'MA_DVIQLY', 'MA_TBI', 'SO_TBI', 'SO_HUU', 'MA_CLOAI', 'DIEN_AP', 'CAP_CXAC', 'SO_PHA',
  'TYSO_DAU', 'NGAY_KDINH', 'HAN_KDINH', 'LUU_KHO', 'MA_DDO', 'MA_KHANG', 'HSN', 'NGAY_TTHAO',
  'MA_TCHI', 'MA_KVUC', 'STT', 'TEN_KHANG', 'DCHI_DDO', 'DCHI_KHANG', 'MA_SOGCS', 'DTHOAI',
  'HOP_BO', 'CHUOI_GIA'
];

interface QuaHanSubTabProps {
  refreshToggle: number;
  sessionUser: SheetMember | null;
  mode?: 'quahan' | 'cuoinam';
}

const REGIONS = ['Vũng Tàu', 'Bà Rịa', 'Phú Mỹ', 'Côn Đảo', 'Khác'] as const;
type RegionName = typeof REGIONS[number];

type DeviceFilterType = 'all' | 'tu' | 'tiHaThe' | 'tiTrungThe' | 'dk1p' | 'dk3pTT' | 'dk3pGT' | 'vuaTUTI' | 'vuaDKTUTI';

export default function QuaHanSubTab({ refreshToggle, sessionUser, mode = 'quahan' }: QuaHanSubTabProps) {
  const isCuoiNam = mode === 'cuoinam';
  const qhSheetName = isCuoiNam ? 'QuaHan_Nam' : 'QuaHan';
  const tuSheetName = isCuoiNam ? 'TU_Nam' : 'TU';
  const tiSheetName = isCuoiNam ? 'TI_Nam' : 'TI';

  const [entries, setEntries] = useState<QuaHanEntry[]>(() => 
    isCuoiNam ? DataStore.getQuaHanNamEntries() : DataStore.getQuaHanEntries()
  );
  const [tuEntries, setTuEntries] = useState<TuSheetEntry[]>(() => 
    isCuoiNam ? DataStore.getTuNamEntries() : DataStore.getTuSheetEntries()
  );
  const [tiEntries, setTiEntries] = useState<TiSheetEntry[]>(() => 
    isCuoiNam ? DataStore.getTiNamEntries() : DataStore.getTiSheetEntries()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Interactive filters (from stats table click)
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceFilterType>('all');
  
  // Pagination: exactly 20 records per page as requested
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [importType, setImportType] = useState<'dienke' | 'tu' | 'ti'>('dienke');
  const [parsedImportData, setParsedImportData] = useState<any[] | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Check RBAC permission for import_htdd_data
  const canImport = PermissionStore.hasActionAccess('import_htdd_data', sessionUser?.role || '', sessionUser);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async (force: boolean = false) => {
    setIsLoading(true);
    try {
      if (isCuoiNam) {
        const [qhData, tuData, tiData] = await Promise.all([
          DataStore.fetchQuaHanNamData(force),
          DataStore.fetchTuNamData(force),
          DataStore.fetchTiNamData(force)
        ]);
        setEntries(qhData || []);
        setTuEntries(tuData || []);
        setTiEntries(tiData || []);
        if (force) {
          showToast(`Đã đồng bộ Cuối năm: ${qhData?.length || 0} ĐK, ${tuData?.length || 0} TU, ${tiData?.length || 0} TI!`);
        }
      } else {
        const [qhData, tuData, tiData] = await Promise.all([
          DataStore.fetchQuaHanData(force),
          DataStore.fetchTuSheetData(force),
          DataStore.fetchTiSheetData(force)
        ]);
        setEntries(qhData || []);
        setTuEntries(tuData || []);
        setTiEntries(tiData || []);
        if (force) {
          showToast(`Đã đồng bộ Quá hạn: ${qhData?.length || 0} Quá hạn, ${tuData?.length || 0} TU, ${tiData?.length || 0} TI!`);
        }
      }
    } catch (e) {
      console.error('Error loading QuaHan / TU / TI data:', e);
      showToast('Lỗi khi tải dữ liệu!');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const qh = isCuoiNam ? DataStore.getQuaHanNamEntries() : DataStore.getQuaHanEntries();
    const tu = isCuoiNam ? DataStore.getTuNamEntries() : DataStore.getTuSheetEntries();
    const ti = isCuoiNam ? DataStore.getTiNamEntries() : DataStore.getTiSheetEntries();
    setEntries(qh);
    setTuEntries(tu);
    setTiEntries(ti);
    if (!qh.length || !tu.length || !ti.length) {
      loadData(false);
    }
  }, [mode, refreshToggle]);

  // TI Trung thế: căn cứ vào cột DIEN_AP (22 hoặc 22kV, hoặc >= 1)
  const isTITrungThe = (r: TiSheetEntry) => {
    const da = String(r.DIEN_AP || '').trim().toLowerCase();
    if (da.startsWith('2') || da.includes('22') || da.includes('trung') || da.includes('tt')) return true;
    if (da.startsWith('0') || da.includes('0.') || da.includes('0,') || da.includes('hạ') || da.includes('ha')) return false;
    if (r.MA_CLOAI === 'G02') return true;
    const num = parseFloat(da.replace(',', '.'));
    if (!isNaN(num)) return num >= 1;
    return false;
  };

  // TI Hạ thế: căn cứ vào cột DIEN_AP (thường 0.7 hoặc 0.72, hoặc ký tự đầu = 0, hoặc tỷ số hạ thế)
  const isTIHaThe = (r: TiSheetEntry) => {
    return !isTITrungThe(r);
  };

  // Điện kế 1P: đếm ở cột "SO_PHA" = 1 (từ sheet QuaHan hoặc QuaHan_Nam)
  const isDK1P = (r: QuaHanEntry) => String(r.SO_PHA || '').trim() === '1';

  // Điện kế 3P Gián tiếp: còn lại là điện kế 3 pha (SO_PHA = 3 hoặc không phải 1), căn cứ LOAI_TT_GT = "Gián tiếp"
  const isDK3PGT = (r: QuaHanEntry) => {
    if (isDK1P(r)) return false;
    const loai = String(r.LOAI_TT_GT || '').trim().toLowerCase();
    return loai.includes('gián tiếp') || loai.includes('gian tiep') || loai === 'gt';
  };

  // Điện kế 3P Trực tiếp: còn lại là điện kế 3 pha (SO_PHA = 3 hoặc không phải 1), căn cứ LOAI_TT_GT = "Trực tiếp" hoặc các trường hợp còn lại
  const isDK3PTT = (r: QuaHanEntry) => {
    if (isDK1P(r)) return false;
    if (isDK3PGT(r)) return false;
    return true;
  };

  // Pre-calculate sets of MA_DDO for quick lookup
  const tuMaddos = useMemo(() => {
    return new Set(tuEntries.map(r => String(r.MA_DDO || '').trim().toUpperCase()).filter(Boolean));
  }, [tuEntries]);

  const tiMaddos = useMemo(() => {
    return new Set(tiEntries.map(r => String(r.MA_DDO || '').trim().toUpperCase()).filter(Boolean));
  }, [tiEntries]);

  const qhMaddos = useMemo(() => {
    return new Set(entries.map(r => String(r.MA_DDO || '').trim().toUpperCase()).filter(Boolean));
  }, [entries]);

  const tiHaTheMaddos = useMemo(() => {
    return new Set(tiEntries.filter(isTIHaThe).map(r => String(r.MA_DDO || '').trim().toUpperCase()).filter(Boolean));
  }, [tiEntries]);

  const tiTrungTheMaddos = useMemo(() => {
    return new Set(tiEntries.filter(isTITrungThe).map(r => String(r.MA_DDO || '').trim().toUpperCase()).filter(Boolean));
  }, [tiEntries]);

  // Helper check for device filter
  const matchesDeviceType = (r: QuaHanEntry, type: DeviceFilterType) => {
    if (type === 'all') return true;
    const m = String(r.MA_DDO || '').trim().toUpperCase();
    if (type === 'tu') {
      return (m && tuMaddos.has(m)) || Boolean(r.TSO_TU && r.TSO_TU.trim().length > 0);
    }
    if (type === 'tiHaThe') {
      return (m && tiHaTheMaddos.has(m)) || Boolean(r.TSO_TI && (r.DIEN_AP_TI?.startsWith('0') || !r.DIEN_AP_TI));
    }
    if (type === 'tiTrungThe') {
      return (m && tiTrungTheMaddos.has(m)) || Boolean(r.TSO_TI && (r.DIEN_AP_TI?.startsWith('2') || r.TSO_TU));
    }
    if (type === 'dk1p') return isDK1P(r);
    if (type === 'dk3pTT') return isDK3PTT(r);
    if (type === 'dk3pGT') return isDK3PGT(r);
    if (type === 'vuaTUTI') {
      return (m && tuMaddos.has(m) && tiMaddos.has(m)) || Boolean(r.TSO_TU && r.TSO_TU.trim().length > 0 && r.TSO_TI && r.TSO_TI.trim().length > 0);
    }
    if (type === 'vuaDKTUTI') {
      return Boolean(m && tuMaddos.has(m) && tiMaddos.has(m));
    }
    return true;
  };

  // Calculate Region Statistics (Phần trên)
  const regionStats = useMemo(() => {
    const stats: Record<string, {
      region: string;
      tu: number;
      tiHaThe: number;
      tiTrungThe: number;
      dk1p: number;
      dk3pTT: number;
      dk3pGT: number;
      vuaTUTI: number;
      vuaDKTUTI: number;
      total: number;
    }> = {};

    REGIONS.forEach(reg => {
      stats[reg] = {
        region: reg,
        tu: 0,
        tiHaThe: 0,
        tiTrungThe: 0,
        dk1p: 0,
        dk3pTT: 0,
        dk3pGT: 0,
        vuaTUTI: 0,
        vuaDKTUTI: 0,
        total: 0
      };
    });

    // 1. Phần TU: bạn thống kê theo sheet TU
    tuEntries.forEach(r => {
      const reg = r.khuVuc || 'Khác';
      if (!stats[reg]) {
        stats[reg] = { region: reg, tu: 0, tiHaThe: 0, tiTrungThe: 0, dk1p: 0, dk3pTT: 0, dk3pGT: 0, vuaTUTI: 0, vuaDKTUTI: 0, total: 0 };
      }
      stats[reg].tu++;
    });

    // 2. Phần TI: bạn thống kê theo sheet TI và căn cứ vào cột DIEN_AP để phân loại TI Hạ thế / TI Trung thế
    tiEntries.forEach(r => {
      const reg = r.khuVuc || 'Khác';
      if (!stats[reg]) {
        stats[reg] = { region: reg, tu: 0, tiHaThe: 0, tiTrungThe: 0, dk1p: 0, dk3pTT: 0, dk3pGT: 0, vuaTUTI: 0, vuaDKTUTI: 0, total: 0 };
      }
      if (isTIHaThe(r)) {
        stats[reg].tiHaThe++;
      } else {
        stats[reg].tiTrungThe++;
      }
    });

    // 3. Phần Điện kế: từ sheet QuaHan (1P, 3P TT, 3P GT)
    entries.forEach(r => {
      const reg = r.khuVuc || 'Khác';
      if (!stats[reg]) {
        stats[reg] = { region: reg, tu: 0, tiHaThe: 0, tiTrungThe: 0, dk1p: 0, dk3pTT: 0, dk3pGT: 0, vuaTUTI: 0, vuaDKTUTI: 0, total: 0 };
      }
      if (isDK1P(r)) {
        stats[reg].dk1p++;
      } else if (isDK3PTT(r)) {
        stats[reg].dk3pTT++;
      } else if (isDK3PGT(r)) {
        stats[reg].dk3pGT++;
      }
    });

    // Map MA_DDO to region
    const maddoRegionMap = new Map<string, string>();
    tuEntries.forEach(r => {
      const m = String(r.MA_DDO || '').trim().toUpperCase();
      if (m && !maddoRegionMap.has(m) && r.khuVuc) maddoRegionMap.set(m, r.khuVuc);
    });
    tiEntries.forEach(r => {
      const m = String(r.MA_DDO || '').trim().toUpperCase();
      if (m && !maddoRegionMap.has(m) && r.khuVuc) maddoRegionMap.set(m, r.khuVuc);
    });
    entries.forEach(r => {
      const m = String(r.MA_DDO || '').trim().toUpperCase();
      if (m && !maddoRegionMap.has(m) && r.khuVuc) maddoRegionMap.set(m, r.khuVuc);
    });

    // 4. Phần vừa TU - Vừa TI: bạn rà trong 2 sheet TU và TI xem giá trị ở cột MA_DDO giống nhau
    const commonTUTI = [...tuMaddos].filter(m => tiMaddos.has(m));
    commonTUTI.forEach(m => {
      const reg = maddoRegionMap.get(m) || 'Khác';
      if (!stats[reg]) {
        stats[reg] = { region: reg, tu: 0, tiHaThe: 0, tiTrungThe: 0, dk1p: 0, dk3pTT: 0, dk3pGT: 0, vuaTUTI: 0, vuaDKTUTI: 0, total: 0 };
      }
      stats[reg].vuaTUTI++;
    });

    // 5. Vừa ĐK-TU-TI: so khớp MA_DDO ở 3 sheet QuaHan, TU, TI để đếm
    const commonDKTUTI = [...qhMaddos].filter(m => tuMaddos.has(m) && tiMaddos.has(m));
    commonDKTUTI.forEach(m => {
      const reg = maddoRegionMap.get(m) || 'Khác';
      if (!stats[reg]) {
        stats[reg] = { region: reg, tu: 0, tiHaThe: 0, tiTrungThe: 0, dk1p: 0, dk3pTT: 0, dk3pGT: 0, vuaTUTI: 0, vuaDKTUTI: 0, total: 0 };
      }
      stats[reg].vuaDKTUTI++;
    });

    // 6. Phần tổng số: không cộng phần thống kê vừa TU - vừa TI và vừa ĐK-TU-TI
    REGIONS.forEach(reg => {
      const s = stats[reg];
      s.total = s.tu + s.tiHaThe + s.tiTrungThe + s.dk1p + s.dk3pTT + s.dk3pGT;
    });

    // Total row
    const totals = {
      region: 'TỔNG CỘNG',
      tu: 0,
      tiHaThe: 0,
      tiTrungThe: 0,
      dk1p: 0,
      dk3pTT: 0,
      dk3pGT: 0,
      vuaTUTI: 0,
      vuaDKTUTI: 0,
      total: 0
    };

    REGIONS.forEach(reg => {
      totals.tu += stats[reg].tu;
      totals.tiHaThe += stats[reg].tiHaThe;
      totals.tiTrungThe += stats[reg].tiTrungThe;
      totals.dk1p += stats[reg].dk1p;
      totals.dk3pTT += stats[reg].dk3pTT;
      totals.dk3pGT += stats[reg].dk3pGT;
      totals.vuaTUTI += stats[reg].vuaTUTI;
      totals.vuaDKTUTI += stats[reg].vuaDKTUTI;
      totals.total += stats[reg].total;
    });

    return { list: REGIONS.map(reg => stats[reg]), totals };
  }, [entries, tuEntries, tiEntries, tuMaddos, tiMaddos, qhMaddos]);

  // Handle click on stats row / cell to filter table below
  const handleStatClick = (region: string, deviceType: DeviceFilterType) => {
    setSelectedRegion(region);
    setSelectedDeviceType(deviceType);
    setCurrentPage(1);
    setTimeout(() => {
      const el = document.getElementById('quahan-detail-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const clearFilters = () => {
    setSelectedRegion('all');
    setSelectedDeviceType('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Filter detail records (Phần dưới)
  const filteredRecords = useMemo(() => {
    let result = entries;

    // Filter by Region
    if (selectedRegion !== 'all') {
      result = result.filter(r => (r.khuVuc || 'Khác') === selectedRegion);
    }

    // Filter by Device Type
    if (selectedDeviceType !== 'all') {
      result = result.filter(r => matchesDeviceType(r, selectedDeviceType));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => 
        (r.MA_DDO && r.MA_DDO.toLowerCase().includes(q)) ||
        (r.TEN_KHANG && r.TEN_KHANG.toLowerCase().includes(q)) ||
        (r.DCHI_DDO && r.DCHI_DDO.toLowerCase().includes(q)) ||
        (r.DTHOAI && r.DTHOAI.toLowerCase().includes(q)) ||
        (r.MA_SOGCS && r.MA_SOGCS.toLowerCase().includes(q)) ||
        (r.MA_TBI && r.MA_TBI.toLowerCase().includes(q)) ||
        (r.SO_TBI && r.SO_TBI.toLowerCase().includes(q)) ||
        (r.MA_KVUC && r.MA_KVUC.toLowerCase().includes(q)) ||
        (r.TSO_TI && r.TSO_TI.toLowerCase().includes(q)) ||
        (r.TSO_TU && r.TSO_TU.toLowerCase().includes(q))
      );
    }

    return result;
  }, [entries, selectedRegion, selectedDeviceType, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Human label for selected device type
  const getDeviceTypeLabel = (type: DeviceFilterType) => {
    switch (type) {
      case 'tu': return 'TU';
      case 'tiHaThe': return 'TI Hạ thế';
      case 'tiTrungThe': return 'TI Trung thế';
      case 'dk1p': return 'Điện kế 1 pha';
      case 'dk3pTT': return 'Điện kế 3 pha trực tiếp';
      case 'dk3pGT': return 'Điện kế 3 pha gián tiếp';
      case 'vuaTUTI': return 'Vừa TU - TI';
      case 'vuaDKTUTI': return 'Vừa ĐK - TU - TI';
      default: return 'Tất cả thiết bị';
    }
  };

  // Export Summary Excel
  const handleExportSummaryExcel = () => {
    try {
      const rows = [
        ['BẢNG THỐNG KÊ HỒ SƠ QUÁ HẠN THEO KHU VỰC - ĐỘI QLHTĐĐ'],
        [`Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}`],
        [],
        [
          'STT', 
          'Khu vực', 
          'TU', 
          'TI Hạ thế', 
          'TI Trung thế', 
          'Điện kế 1 pha', 
          'Điện kế 3 pha trực tiếp', 
          'Điện kế 3 pha gián tiếp', 
          'Vừa TU - TI', 
          'Vừa ĐK - TU - TI',
          'Tổng cộng'
        ]
      ];

      regionStats.list.forEach((s, idx) => {
        rows.push([
          idx + 1,
          s.region,
          s.tu,
          s.tiHaThe,
          s.tiTrungThe,
          s.dk1p,
          s.dk3pTT,
          s.dk3pGT,
          s.vuaTUTI,
          s.vuaDKTUTI,
          s.total
        ]);
      });

      // Add Total Row
      rows.push([
        '',
        regionStats.totals.region,
        regionStats.totals.tu,
        regionStats.totals.tiHaThe,
        regionStats.totals.tiTrungThe,
        regionStats.totals.dk1p,
        regionStats.totals.dk3pTT,
        regionStats.totals.dk3pGT,
        regionStats.totals.vuaTUTI,
        regionStats.totals.vuaDKTUTI,
        regionStats.totals.total
      ]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 16 },
        { wch: 10 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 22 },
        { wch: 22 },
        { wch: 14 },
        { wch: 16 },
        { wch: 14 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ThongKe_TongHop');
      
      const fileName = isCuoiNam 
        ? `Thong_Ke_Qua_Han_Cuoi_Nam_Khu_Vuc_${new Date().toISOString().slice(0, 10)}.xlsx`
        : `Thong_Ke_Qua_Han_Khu_Vuc_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast('Đã kết xuất Excel bảng thống kê tổng hợp thành công!');
    } catch (e) {
      console.error('Export error:', e);
      showToast('Lỗi khi kết xuất Excel tổng hợp!');
    }
  };

  // Export Detailed Excel
  const handleExportDetailExcel = () => {
    try {
      const headers = [
        'STT',
        'Mã ĐĐO',
        'Tên khách hàng',
        'Địa chỉ ĐĐO',
        'Điện thoại',
        'Mã sổ GCS',
        'Khu vực',
        'Mã KVực',
        'STT',
        'Loại TT/GT',
        'TSO TI',
        'TSO TU',
        'Mã TBI',
        'Số TBI (Số công tơ)',
        'Số pha',
        'HSN'
      ];

      const reportTitle = isCuoiNam
        ? 'DANH SÁCH CHI TIẾT HỒ SƠ QUÁ HẠN KIỂM ĐỊNH ĐẾN CUỐI NĂM - SHEET QUAHAN_NAM'
        : 'DANH SÁCH CHI TIẾT HỒ SƠ QUÁ HẠN KIỂM ĐỊNH - SHEET QUAHAN';

      const rows: any[] = [
        [reportTitle],
        [`Bộ lọc: Khu vực [${selectedRegion === 'all' ? 'Tất cả' : selectedRegion}] - Thiết bị [${getDeviceTypeLabel(selectedDeviceType)}] - Tổng số: ${filteredRecords.length} hồ sơ`],
        [`Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}`],
        [],
        headers
      ];

      filteredRecords.forEach((r, idx) => {
        rows.push([
          idx + 1,
          r.MA_DDO || '',
          r.TEN_KHANG || '',
          r.DCHI_DDO || '',
          r.DTHOAI || '',
          r.MA_SOGCS || '',
          r.khuVuc || '',
          r.MA_KVUC || '',
          r.STT || '',
          r.LOAI_TT_GT || '',
          r.TSO_TI || '',
          r.TSO_TU || '',
          r.MA_TBI || '',
          r.SO_TBI || '',
          r.SO_PHA || '',
          r.HSN || ''
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 32 },
        { wch: 40 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 10 },
        { wch: 8 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 22 },
        { wch: 16 },
        { wch: 8 },
        { wch: 8 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, isCuoiNam ? 'ChiTiet_QuaHan_Nam' : 'ChiTiet_QuaHan');

      const filterTag = selectedRegion !== 'all' ? selectedRegion.replace(/\s+/g, '_') : 'TatCa';
      const fileName = isCuoiNam
        ? `Chi_Tiet_Qua_Han_Cuoi_Nam_${filterTag}_${new Date().toISOString().slice(0, 10)}.xlsx`
        : `Chi_Tiet_Qua_Han_${filterTag}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast(`Đã xuất ${filteredRecords.length} hồ sơ chi tiết ra Excel!`);
    } catch (e) {
      console.error('Export error:', e);
      showToast('Lỗi khi kết xuất Excel chi tiết!');
    }
  };

  // Download Excel Template for importing
  const handleDownloadTemplate = (type: 'dienke' | 'tu' | 'ti') => {
    try {
      const cols = type === 'dienke' ? DIEN_KE_COLUMNS : type === 'tu' ? TU_COLUMNS : TI_COLUMNS;
      const targetSheet = isCuoiNam
        ? (type === 'dienke' ? 'QuaHan_Nam' : type === 'tu' ? 'TU_Nam' : 'TI_Nam')
        : (type === 'dienke' ? 'QuaHan' : type === 'tu' ? 'TU' : 'TI');
      
      const ws = XLSX.utils.aoa_to_sheet([cols]);
      ws['!cols'] = cols.map(() => ({ wch: 16 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, targetSheet);
      XLSX.writeFile(wb, `File_Mau_Import_${targetSheet}.xlsx`);
      showToast(`Đã tải file mẫu Excel cho sheet ${targetSheet}!`);
    } catch (e) {
      console.error('Error downloading template:', e);
      showToast('Lỗi khi tải file mẫu!');
    }
  };

  // Handle File Upload and validation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError(null);
    setParsedImportData(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setImportError('File tải lên không có dữ liệu (sheet trống)!');
          return;
        }

        // Validate required headers
        const firstRow = rawJson[0];
        const fileHeaders = Object.keys(firstRow).map(k => k.trim());
        const normalizedFileHeaders = new Set(fileHeaders.map(h => h.toUpperCase()));

        const requiredCols = importType === 'dienke' 
          ? DIEN_KE_COLUMNS 
          : importType === 'tu' 
            ? TU_COLUMNS 
            : TI_COLUMNS;

        const missing = requiredCols.filter(c => !normalizedFileHeaders.has(c.toUpperCase()));

        if (missing.length > 0) {
          setImportError(`File thiếu ${missing.length} trường bắt buộc so với cấu trúc sheet hiện hữu:\n${missing.join(', ')}`);
          return;
        }

        // File is valid!
        setParsedImportData(rawJson);
      } catch (err: any) {
        console.error('Error reading file:', err);
        setImportError('Không thể đọc file: ' + (err.message || 'Lỗi định dạng'));
      }
    };
    reader.readAsBinaryString(file);
  };

  // Confirm Import & Overwrite
  const handleConfirmImport = async () => {
    if (!parsedImportData || parsedImportData.length === 0) return;
    setIsImporting(true);
    try {
      const targetSheet = isCuoiNam
        ? (importType === 'dienke' ? 'QuaHan_Nam' : importType === 'tu' ? 'TU_Nam' : 'TI_Nam')
        : (importType === 'dienke' ? 'QuaHan' : importType === 'tu' ? 'TU' : 'TI');

      if (importType === 'dienke') {
        const parsed = DataStore.parseQuaHanCSVData(parsedImportData);
        if (isCuoiNam) {
          await DataStore.setQuaHanNamEntries(parsed);
          setEntries(parsed);
        } else {
          await DataStore.setQuaHanEntries(parsed);
          setEntries(parsed);
        }
      } else if (importType === 'tu') {
        const parsed = DataStore.parseTuCSVData(parsedImportData);
        if (isCuoiNam) {
          await DataStore.setTuNamEntries(parsed);
          setTuEntries(parsed);
        } else {
          await DataStore.setTuSheetEntries(parsed);
          setTuEntries(parsed);
        }
      } else if (importType === 'ti') {
        const parsed = DataStore.parseTiCSVData(parsedImportData);
        if (isCuoiNam) {
          await DataStore.setTiNamEntries(parsed);
          setTiEntries(parsed);
        } else {
          await DataStore.setTiSheetEntries(parsed);
          setTiEntries(parsed);
        }
      }

      showToast(`Đã ghi đè thành công ${parsedImportData.length} dòng vào sheet ${targetSheet}!`);
      setShowImportModal(false);
      setParsedImportData(null);
      setImportFileName('');
      setImportError(null);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Import error:', err);
      setImportError('Lỗi trong quá trình ghi đè: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsImporting(false);
    }
  };

  const isFiltered = selectedRegion !== 'all' || selectedDeviceType !== 'all' || searchQuery.trim() !== '';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast message */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/90 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 backdrop-blur-md text-sm animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
              isCuoiNam 
                ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/20' 
                : 'bg-gradient-to-br from-rose-500 to-amber-500 shadow-rose-500/20'
            }`}>
              {isCuoiNam ? <Calendar className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                {isCuoiNam ? 'Quá Hạn Đến Cuối Năm' : 'Hồ Sơ Quá Hạn Kiểm Định'}
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  isCuoiNam ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-rose-100 text-rose-800 border-rose-200'
                }`}>
                  Sheet {qhSheetName} ({entries.length.toLocaleString()} ĐK)
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  {tuSheetName}: {tuEntries.length} | {tiSheetName}: {tiEntries.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isCuoiNam
                  ? 'Thống kê đo đếm quá hạn kiểm định dự kiến đến cuối năm từ các sheet: QuaHan_Nam, TU_Nam, TI_Nam.'
                  : 'Thống kê TU, TI hạ thế, TI trung thế, điện kế theo khu vực và quản lý chi tiết đo đếm quá hạn.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Import Button */}
          <button
            onClick={() => {
              if (!canImport) {
                setShowPermissionAlert(true);
              } else {
                setParsedImportData(null);
                setImportFileName('');
                setImportError(null);
                setShowImportModal(true);
              }
            }}
            className={`px-3 py-2 active:scale-95 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              canImport 
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200' 
                : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200/70'
            }`}
            title={canImport ? "Import dữ liệu mới và ghi đè sheet hiện hữu (Điện kế, TU, TI)" : "Cần quyền Đội trưởng để Import dữ liệu"}
          >
            {canImport ? <Upload className="w-4 h-4 text-rose-600" /> : <Lock className="w-4 h-4 text-slate-400" />}
            <span>Import Dữ liệu</span>
            {!canImport && (
              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                Khóa
              </span>
            )}
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={isLoading}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Đồng bộ dữ liệu mới nhất từ Google Sheets"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{isLoading ? 'Đang tải...' : 'Tải lại dữ liệu'}</span>
          </button>

          <button
            onClick={handleExportSummaryExcel}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 active:scale-95 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Xuất bảng thống kê tổng hợp các khu vực"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel Tổng hợp</span>
          </button>

          <button
            onClick={handleExportDetailExcel}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
            title="Xuất danh sách chi tiết các hồ sơ đang hiển thị"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel Chi tiết ({filteredRecords.length})</span>
          </button>
        </div>
      </div>

      {/* PHẦN TRÊN: BẢNG THỐNG KÊ QUÁ HẠN THEO KHU VỰC */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-white border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                1. Bảng Thống Kê Quá Hạn Theo Khu Vực
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Click vào dòng hoặc từng ô chỉ tiêu để xem chi tiết danh sách bên dưới (ví dụ click ô ĐK 1P Vũng Tàu).
              </p>
            </div>
          </div>

          {isFiltered && (
            <button
              onClick={clearFilters}
              className="text-xs px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all"
            >
              <X className="w-3.5 h-3.5 text-amber-600" />
              <span>Xóa bộ lọc (Xem tất cả)</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 font-black uppercase text-[11px] tracking-wider border-b border-slate-200 select-none">
              <tr>
                <th className="px-3.5 py-3 border-r border-slate-200 w-12 text-center">STT</th>
                <th className="px-4 py-3 border-r border-slate-200 min-w-[130px]">Khu vực</th>
                <th className="px-3.5 py-3 border-r border-slate-200 text-center min-w-[70px] bg-blue-50/50 text-blue-950">TU</th>
                <th className="px-3.5 py-3 border-r border-slate-200 text-center min-w-[90px] bg-sky-50/50 text-sky-950">TI Hạ thế</th>
                <th className="px-3.5 py-3 border-r border-slate-200 text-center min-w-[100px] bg-amber-50/50 text-amber-950">TI Trung thế</th>
                <th className="px-3.5 py-3 border-r border-slate-200 text-center min-w-[95px] bg-emerald-50/50 text-emerald-950">Điện kế 1P</th>
                <th className="px-3.5 py-3 border-r border-slate-200 text-center min-w-[115px] bg-teal-50/50 text-teal-950">ĐK 3P Trực tiếp</th>
                <th className="px-3.5 py-3 border-r border-slate-200 text-center min-w-[115px] bg-purple-50/50 text-purple-950">ĐK 3P Gián tiếp</th>
                <th className="px-3.5 py-3 border-r border-slate-200 text-center min-w-[95px] bg-rose-50/50 text-rose-950">Vừa TU - TI</th>
                <th className="px-3.5 py-3 border-r border-slate-200 text-center min-w-[105px] bg-pink-50/50 text-pink-950">Vừa ĐK-TU-TI</th>
                <th className="px-4 py-3 text-center min-w-[95px] bg-slate-200/70 text-slate-900 font-extrabold">Tổng số</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {regionStats.list.map((stat, idx) => {
                const isRowSelected = selectedRegion === stat.region;
                return (
                  <tr 
                    key={stat.region} 
                    onClick={() => handleStatClick(stat.region, 'all')}
                    title={`Click để xem tất cả hồ sơ khu vực ${stat.region}`}
                    className={`transition-colors group hover:bg-indigo-50/40 cursor-pointer ${
                      isRowSelected ? 'bg-indigo-50/70 font-semibold' : (idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')
                    }`}
                  >
                    <td 
                      className="px-3.5 py-3 text-center border-r border-slate-100 text-slate-400 font-mono"
                    >
                      {idx + 1}
                    </td>

                    {/* Khu vực */}
                    <td 
                      className="px-4 py-3 font-bold text-slate-800 border-r border-slate-100 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <Building2 className={`w-3.5 h-3.5 ${isRowSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                        {stat.region}
                      </span>
                      {isRowSelected && selectedDeviceType === 'all' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-600 text-white font-bold">Đang chọn</span>
                      )}
                    </td>

                    {/* TU */}
                    <td 
                      onClick={(e) => { e.stopPropagation(); handleStatClick(stat.region, 'tu'); }}
                      title={`Xem danh sách TU của khu vực ${stat.region}`}
                      className={`px-3.5 py-3 text-center border-r border-slate-100 font-mono font-bold transition-all hover:bg-blue-100/60 ${
                        selectedRegion === stat.region && selectedDeviceType === 'tu' 
                          ? 'bg-blue-600 text-white font-black ring-2 ring-blue-700' 
                          : 'text-blue-700'
                      }`}
                    >
                      {stat.tu.toLocaleString()}
                    </td>

                    {/* TI Hạ thế */}
                    <td 
                      onClick={(e) => { e.stopPropagation(); handleStatClick(stat.region, 'tiHaThe'); }}
                      title={`Xem danh sách TI Hạ thế của khu vực ${stat.region}`}
                      className={`px-3.5 py-3 text-center border-r border-slate-100 font-mono font-bold transition-all hover:bg-sky-100/60 ${
                        selectedRegion === stat.region && selectedDeviceType === 'tiHaThe' 
                          ? 'bg-sky-600 text-white font-black ring-2 ring-sky-700' 
                          : 'text-sky-700'
                      }`}
                    >
                      {stat.tiHaThe.toLocaleString()}
                    </td>

                    {/* TI Trung thế */}
                    <td 
                      onClick={(e) => { e.stopPropagation(); handleStatClick(stat.region, 'tiTrungThe'); }}
                      title={`Xem danh sách TI Trung thế của khu vực ${stat.region}`}
                      className={`px-3.5 py-3 text-center border-r border-slate-100 font-mono font-bold transition-all hover:bg-amber-100/60 ${
                        selectedRegion === stat.region && selectedDeviceType === 'tiTrungThe' 
                          ? 'bg-amber-600 text-white font-black ring-2 ring-amber-700' 
                          : 'text-amber-700'
                      }`}
                    >
                      {stat.tiTrungThe.toLocaleString()}
                    </td>

                    {/* Điện kế 1P */}
                    <td 
                      onClick={(e) => { e.stopPropagation(); handleStatClick(stat.region, 'dk1p'); }}
                      title={`Xem danh sách Điện kế 1 pha của khu vực ${stat.region}`}
                      className={`px-3.5 py-3 text-center border-r border-slate-100 font-mono font-bold transition-all hover:bg-emerald-100/60 ${
                        selectedRegion === stat.region && selectedDeviceType === 'dk1p' 
                          ? 'bg-emerald-600 text-white font-black ring-2 ring-emerald-700' 
                          : 'text-emerald-700'
                      }`}
                    >
                      {stat.dk1p.toLocaleString()}
                    </td>

                    {/* ĐK 3P Trực tiếp */}
                    <td 
                      onClick={(e) => { e.stopPropagation(); handleStatClick(stat.region, 'dk3pTT'); }}
                      title={`Xem danh sách Điện kế 3 pha trực tiếp của khu vực ${stat.region}`}
                      className={`px-3.5 py-3 text-center border-r border-slate-100 font-mono font-bold transition-all hover:bg-teal-100/60 ${
                        selectedRegion === stat.region && selectedDeviceType === 'dk3pTT' 
                          ? 'bg-teal-600 text-white font-black ring-2 ring-teal-700' 
                          : 'text-teal-700'
                      }`}
                    >
                      {stat.dk3pTT.toLocaleString()}
                    </td>

                    {/* ĐK 3P Gián tiếp */}
                    <td 
                      onClick={(e) => { e.stopPropagation(); handleStatClick(stat.region, 'dk3pGT'); }}
                      title={`Xem danh sách Điện kế 3 pha gián tiếp của khu vực ${stat.region}`}
                      className={`px-3.5 py-3 text-center border-r border-slate-100 font-mono font-bold transition-all hover:bg-purple-100/60 ${
                        selectedRegion === stat.region && selectedDeviceType === 'dk3pGT' 
                          ? 'bg-purple-600 text-white font-black ring-2 ring-purple-700' 
                          : 'text-purple-700'
                      }`}
                    >
                      {stat.dk3pGT.toLocaleString()}
                    </td>

                    {/* Vừa TU - TI */}
                    <td 
                      onClick={(e) => { e.stopPropagation(); handleStatClick(stat.region, 'vuaTUTI'); }}
                      title={`Xem danh sách Vừa TU - TI của khu vực ${stat.region}`}
                      className={`px-3.5 py-3 text-center border-r border-slate-100 font-mono font-bold transition-all hover:bg-rose-100/60 ${
                        selectedRegion === stat.region && selectedDeviceType === 'vuaTUTI' 
                          ? 'bg-rose-600 text-white font-black ring-2 ring-rose-700' 
                          : 'text-rose-700'
                      }`}
                    >
                      {stat.vuaTUTI.toLocaleString()}
                    </td>

                    {/* Vừa ĐK - TU - TI */}
                    <td 
                      onClick={(e) => { e.stopPropagation(); handleStatClick(stat.region, 'vuaDKTUTI'); }}
                      title={`Xem danh sách Vừa ĐK - TU - TI của khu vực ${stat.region}`}
                      className={`px-3.5 py-3 text-center border-r border-slate-100 font-mono font-bold transition-all hover:bg-pink-100/60 ${
                        selectedRegion === stat.region && selectedDeviceType === 'vuaDKTUTI' 
                          ? 'bg-pink-600 text-white font-black ring-2 ring-pink-700' 
                          : 'text-pink-700'
                      }`}
                    >
                      {stat.vuaDKTUTI.toLocaleString()}
                    </td>

                    {/* Tổng số */}
                    <td 
                      onClick={(e) => { e.stopPropagation(); handleStatClick(stat.region, 'all'); }}
                      title={`Xem tất cả hồ sơ khu vực ${stat.region}`}
                      className={`px-4 py-3 text-center font-mono font-black transition-all hover:bg-slate-200/80 ${
                        selectedRegion === stat.region && selectedDeviceType === 'all' 
                          ? 'bg-slate-900 text-white' 
                          : 'text-slate-900 bg-slate-100/60'
                      }`}
                    >
                      {stat.total.toLocaleString()}
                    </td>
                  </tr>
                );
              })}

              {/* TỔNG CỘNG ROW */}
              <tr className="bg-slate-200/80 font-black border-t-2 border-slate-300 text-slate-900 select-none">
                <td className="px-3.5 py-3.5 text-center border-r border-slate-300">Σ</td>
                <td 
                  onClick={() => handleStatClick('all', 'all')}
                  className="px-4 py-3.5 border-r border-slate-300 uppercase tracking-wider text-indigo-950 cursor-pointer hover:underline"
                >
                  TỔNG CỘNG
                </td>
                <td 
                  onClick={() => handleStatClick('all', 'tu')}
                  className={`px-3.5 py-3.5 text-center border-r border-slate-300 font-mono cursor-pointer hover:bg-blue-200/80 ${
                    selectedRegion === 'all' && selectedDeviceType === 'tu' ? 'bg-blue-600 text-white' : 'text-blue-900'
                  }`}
                >
                  {regionStats.totals.tu.toLocaleString()}
                </td>
                <td 
                  onClick={() => handleStatClick('all', 'tiHaThe')}
                  className={`px-3.5 py-3.5 text-center border-r border-slate-300 font-mono cursor-pointer hover:bg-sky-200/80 ${
                    selectedRegion === 'all' && selectedDeviceType === 'tiHaThe' ? 'bg-sky-600 text-white' : 'text-sky-900'
                  }`}
                >
                  {regionStats.totals.tiHaThe.toLocaleString()}
                </td>
                <td 
                  onClick={() => handleStatClick('all', 'tiTrungThe')}
                  className={`px-3.5 py-3.5 text-center border-r border-slate-300 font-mono cursor-pointer hover:bg-amber-200/80 ${
                    selectedRegion === 'all' && selectedDeviceType === 'tiTrungThe' ? 'bg-amber-600 text-white' : 'text-amber-900'
                  }`}
                >
                  {regionStats.totals.tiTrungThe.toLocaleString()}
                </td>
                <td 
                  onClick={() => handleStatClick('all', 'dk1p')}
                  className={`px-3.5 py-3.5 text-center border-r border-slate-300 font-mono cursor-pointer hover:bg-emerald-200/80 ${
                    selectedRegion === 'all' && selectedDeviceType === 'dk1p' ? 'bg-emerald-600 text-white' : 'text-emerald-900'
                  }`}
                >
                  {regionStats.totals.dk1p.toLocaleString()}
                </td>
                <td 
                  onClick={() => handleStatClick('all', 'dk3pTT')}
                  className={`px-3.5 py-3.5 text-center border-r border-slate-300 font-mono cursor-pointer hover:bg-teal-200/80 ${
                    selectedRegion === 'all' && selectedDeviceType === 'dk3pTT' ? 'bg-teal-600 text-white' : 'text-teal-900'
                  }`}
                >
                  {regionStats.totals.dk3pTT.toLocaleString()}
                </td>
                <td 
                  onClick={() => handleStatClick('all', 'dk3pGT')}
                  className={`px-3.5 py-3.5 text-center border-r border-slate-300 font-mono cursor-pointer hover:bg-purple-200/80 ${
                    selectedRegion === 'all' && selectedDeviceType === 'dk3pGT' ? 'bg-purple-600 text-white' : 'text-purple-900'
                  }`}
                >
                  {regionStats.totals.dk3pGT.toLocaleString()}
                </td>
                <td 
                  onClick={() => handleStatClick('all', 'vuaTUTI')}
                  className={`px-3.5 py-3.5 text-center border-r border-slate-300 font-mono cursor-pointer hover:bg-rose-200/80 ${
                    selectedRegion === 'all' && selectedDeviceType === 'vuaTUTI' ? 'bg-rose-600 text-white' : 'text-rose-900'
                  }`}
                >
                  {regionStats.totals.vuaTUTI.toLocaleString()}
                </td>
                <td 
                  onClick={() => handleStatClick('all', 'vuaDKTUTI')}
                  className={`px-3.5 py-3.5 text-center border-r border-slate-300 font-mono cursor-pointer hover:bg-pink-200/80 ${
                    selectedRegion === 'all' && selectedDeviceType === 'vuaDKTUTI' ? 'bg-pink-600 text-white' : 'text-pink-900'
                  }`}
                >
                  {regionStats.totals.vuaDKTUTI.toLocaleString()}
                </td>
                <td 
                  onClick={() => handleStatClick('all', 'all')}
                  className={`px-4 py-3.5 text-center font-mono cursor-pointer hover:bg-slate-300 ${
                    selectedRegion === 'all' && selectedDeviceType === 'all' ? 'bg-slate-900 text-white' : 'text-slate-950'
                  }`}
                >
                  {regionStats.totals.total.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* PHẦN DƯỚI: DANH SÁCH CHI TIẾT HỒ SƠ QUÁ HẠN (20 RECORDS/TRANG) */}
      <div id="quahan-detail-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 scroll-mt-6">
        {/* Detail Controls & Filter summary */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>2. Danh Sách Chi Tiết Hồ Sơ Quá Hạn</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold font-mono">
                  {filteredRecords.length.toLocaleString()} bản ghi
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Hiển thị 20 records trên mỗi trang theo đúng thứ tự và trường thông tin chuẩn.
              </p>
            </div>

            {/* Quick Status Info */}
            {isFiltered && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="text-xs px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl font-bold flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    Khu vực: <b>{selectedRegion === 'all' ? 'Tất cả' : selectedRegion}</b>
                  </span>
                  <span className="text-indigo-400">•</span>
                  <span>
                    Thiết bị: <b>{getDeviceTypeLabel(selectedDeviceType)}</b>
                  </span>
                  {searchQuery && (
                    <>
                      <span className="text-indigo-400">•</span>
                      <span>Từ khóa: "{searchQuery}"</span>
                    </>
                  )}
                </div>
                <button
                  onClick={clearFilters}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  title="Xóa tất cả bộ lọc"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Xóa lọc</span>
                </button>
              </div>
            )}
          </div>

          {/* Search bar & quick filters */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
            <div className="relative sm:col-span-6 md:col-span-5">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Tìm mã điểm đo, tên KH, địa chỉ, số ĐT, mã sổ GCS, mã/số thiết bị..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="sm:col-span-3 md:col-span-3">
              <select
                value={selectedRegion}
                onChange={e => { setSelectedRegion(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">-- Tất cả khu vực --</option>
                {REGIONS.map(reg => (
                  <option key={reg} value={reg}>{reg}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3 md:col-span-4">
              <select
                value={selectedDeviceType}
                onChange={e => { setSelectedDeviceType(e.target.value as DeviceFilterType); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">-- Tất cả loại thiết bị --</option>
                <option value="tu">TU (Sheet TU)</option>
                <option value="tiHaThe">TI Hạ thế (Sheet TI)</option>
                <option value="tiTrungThe">TI Trung thế (Sheet TI)</option>
                <option value="dk1p">Điện kế 1 pha (SO_PHA = 1)</option>
                <option value="dk3pTT">Điện kế 3 pha trực tiếp</option>
                <option value="dk3pGT">Điện kế 3 pha gián tiếp</option>
                <option value="vuaTUTI">Vừa TU - TI</option>
                <option value="vuaDKTUTI">Vừa ĐK - TU - TI</option>
              </select>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 text-center border-r border-slate-200 w-10">STT</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 whitespace-nowrap min-w-[130px]">MA_DDO</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 min-w-[200px]">TEN_KHANG</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 min-w-[240px]">DCHI_DDO</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 min-w-[110px]">DTHOAI</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 whitespace-nowrap min-w-[110px]">MA_SOGCS</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 text-center min-w-[80px]">MA_KVUC</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 text-center min-w-[60px]">STT</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 text-center min-w-[100px]">LOAI_TT_GT</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 text-center min-w-[85px]">TSO_TI</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 text-center min-w-[85px]">TSO_TU</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 min-w-[140px]">MA_TBI</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 min-w-[110px] bg-amber-50/60 font-bold">SO_TBI (18083539)</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 text-center min-w-[70px]">SO_PHA</th>
                <th className="px-3.5 py-2.5 text-center min-w-[65px]">HSN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400 font-sans">
                    <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-sm text-slate-600">Không tìm thấy hồ sơ nào phù hợp</p>
                    <p className="text-xs text-slate-400 mt-1">Hãy thử xóa bộ lọc hoặc tìm kiếm từ khóa khác.</p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={`${r.MA_DDO}_${r.MA_TBI}_${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 text-center border-r border-slate-100 text-slate-400">
                        {globalIdx}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-indigo-700 border-r border-slate-100 whitespace-nowrap">
                        {r.MA_DDO || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 font-sans font-semibold text-slate-800 border-r border-slate-100">
                        {r.TEN_KHANG || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 font-sans text-slate-600 border-r border-slate-100">
                        {r.DCHI_DDO || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-700 border-r border-slate-100">
                        {r.DTHOAI || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-800 border-r border-slate-100">
                        {r.MA_SOGCS || '-'}
                        {r.khuVuc && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-slate-100 text-slate-600 font-sans font-semibold">
                            {r.khuVuc}
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-center text-slate-700 border-r border-slate-100">
                        {r.MA_KVUC || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 text-center text-slate-600 border-r border-slate-100">
                        {r.STT || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 text-center border-r border-slate-100 font-sans">
                        {r.LOAI_TT_GT ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.LOAI_TT_GT.toLowerCase().includes('trực tiếp') 
                              ? 'bg-teal-100 text-teal-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {r.LOAI_TT_GT}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-3.5 py-2.5 text-center text-slate-800 font-bold border-r border-slate-100">
                        {r.TSO_TI || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 text-center text-slate-800 font-bold border-r border-slate-100">
                        {r.TSO_TU || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 border-r border-slate-100 text-[10px]">
                        {r.MA_TBI || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-amber-900 bg-amber-50/40 border-r border-slate-100">
                        {r.SO_TBI || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-bold text-slate-800 border-r border-slate-100">
                        {r.SO_PHA ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            String(r.SO_PHA).trim() === '1' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {r.SO_PHA}P
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-3.5 py-2.5 text-center text-slate-800 font-bold">
                        {r.HSN || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar (20 records per page) */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-medium">
            Hiển thị <span className="font-bold text-slate-800">{filteredRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> đến <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, filteredRecords.length)}</span> trên tổng số <span className="font-bold text-slate-900">{filteredRecords.length.toLocaleString()}</span> hồ sơ (20 records/trang)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
              title="Trang đầu"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: totalPages }).map((_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .map((p, idx, arr) => {
                  const prevPage = arr[idx - 1];
                  const showEllipsis = prevPage && p - prevPage > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-slate-400 text-xs">...</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentPage === p
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
              title="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
              title="Trang cuối"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
