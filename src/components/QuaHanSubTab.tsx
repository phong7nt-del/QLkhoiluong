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

export interface UnifiedDetailRecord {
  id: string;
  sourceSheet: 'dienke' | 'tu' | 'ti' | 'vuaTUTI' | 'vuaDKTUTI';
  sourceSheetName: string;
  deviceCategory: DeviceFilterType;
  deviceLabel: string;
  badgeBg: string;
  badgeText: string;
  MA_DDO: string;
  TEN_KHANG: string;
  DCHI_DDO: string;
  DTHOAI: string;
  MA_SOGCS: string;
  khuVuc: string;
  MA_KVUC: string;
  STT: string;
  LOAI_TT_GT: string;
  TSO_TI: string;
  TSO_TU: string;
  DIEN_AP: string;
  CAP_CXAC: string;
  MA_TBI: string;
  SO_TBI: string;
  SO_PHA: string;
  HSN: string;
  NGAY_KDINH: string;
  HAN_KDINH: string;
  raw?: any;
}

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
    const updateAll = () => {
      const qh = isCuoiNam ? DataStore.getQuaHanNamEntries() : DataStore.getQuaHanEntries();
      const tu = isCuoiNam ? DataStore.getTuNamEntries() : DataStore.getTuSheetEntries();
      const ti = isCuoiNam ? DataStore.getTiNamEntries() : DataStore.getTiSheetEntries();
      setEntries(qh);
      setTuEntries(tu);
      setTiEntries(ti);
      if (!qh.length && !tu.length && !ti.length) {
        loadData(false);
      }
    };
    updateAll();
    window.addEventListener('workload_updated', updateAll);
    window.addEventListener('htdd_data_updated', updateAll);
    return () => {
      window.removeEventListener('workload_updated', updateAll);
      window.removeEventListener('htdd_data_updated', updateAll);
    };
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

  // Map MA_DDO to region
  const maddoRegionMap = useMemo(() => {
    const map = new Map<string, string>();
    tuEntries.forEach(r => {
      const m = String(r.MA_DDO || '').trim().toUpperCase();
      if (m && !map.has(m) && r.khuVuc) map.set(m, r.khuVuc);
    });
    tiEntries.forEach(r => {
      const m = String(r.MA_DDO || '').trim().toUpperCase();
      if (m && !map.has(m) && r.khuVuc) map.set(m, r.khuVuc);
    });
    entries.forEach(r => {
      const m = String(r.MA_DDO || '').trim().toUpperCase();
      if (m && !map.has(m) && r.khuVuc) map.set(m, r.khuVuc);
    });
    return map;
  }, [tuEntries, tiEntries, entries]);

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
  }, [entries, tuEntries, tiEntries, tuMaddos, tiMaddos, qhMaddos, maddoRegionMap]);

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

  // 1. Unified TU Records
  const tuUnified = useMemo<UnifiedDetailRecord[]>(() => {
    return tuEntries.map((r, idx) => ({
      id: `tu_${r.MA_DDO || ''}_${r.MA_TBI || ''}_${idx}`,
      sourceSheet: 'tu',
      sourceSheetName: tuSheetName,
      deviceCategory: 'tu',
      deviceLabel: 'TU',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-800',
      MA_DDO: r.MA_DDO || '',
      TEN_KHANG: r.TEN_KHANG || '',
      DCHI_DDO: r.DCHI_DDO || '',
      DTHOAI: r.DTHOAI || '',
      MA_SOGCS: r.MA_SOGCS || '',
      khuVuc: r.khuVuc || 'Khác',
      MA_KVUC: r.MA_KVUC || '',
      STT: r.STT || '',
      LOAI_TT_GT: 'Biến điện áp (TU)',
      TSO_TI: '-',
      TSO_TU: r.TYSO_DAU || '-',
      DIEN_AP: r.DIEN_AP ? (String(r.DIEN_AP).toLowerCase().includes('kv') ? String(r.DIEN_AP) : `${r.DIEN_AP} kV`) : '22 kV',
      CAP_CXAC: r.CAP_CXAC || '',
      MA_TBI: r.MA_TBI || '',
      SO_TBI: r.SO_TBI || '',
      SO_PHA: r.SO_PHA ? `${r.SO_PHA}` : '1',
      HSN: r.HSN || '0',
      NGAY_KDINH: r.NGAY_KDINH || '',
      HAN_KDINH: r.HAN_KDINH || '',
      raw: r
    }));
  }, [tuEntries, tuSheetName]);

  // 2. Unified TI Records (TI Hạ thế & TI Trung thế)
  const tiUnified = useMemo<UnifiedDetailRecord[]>(() => {
    return tiEntries.map((r, idx) => {
      const haThe = isTIHaThe(r);
      const cat: DeviceFilterType = haThe ? 'tiHaThe' : 'tiTrungThe';
      const label = haThe ? 'TI Hạ thế' : 'TI Trung thế';
      const badgeBg = haThe ? 'bg-sky-100' : 'bg-amber-100';
      const badgeText = haThe ? 'text-sky-800' : 'text-amber-800';
      const defaultDa = haThe ? '0.7 kV' : '22 kV';
      const dienApStr = r.DIEN_AP ? (String(r.DIEN_AP).toLowerCase().includes('kv') ? String(r.DIEN_AP) : `${r.DIEN_AP} kV`) : defaultDa;

      return {
        id: `ti_${r.MA_DDO || ''}_${r.MA_TBI || ''}_${idx}`,
        sourceSheet: 'ti',
        sourceSheetName: tiSheetName,
        deviceCategory: cat,
        deviceLabel: label,
        badgeBg,
        badgeText,
        MA_DDO: r.MA_DDO || '',
        TEN_KHANG: r.TEN_KHANG || '',
        DCHI_DDO: r.DCHI_DDO || '',
        DTHOAI: r.DTHOAI || '',
        MA_SOGCS: r.MA_SOGCS || '',
        khuVuc: r.khuVuc || 'Khác',
        MA_KVUC: r.MA_KVUC || '',
        STT: r.STT || '',
        LOAI_TT_GT: label,
        TSO_TI: r.TYSO_DAU || '-',
        TSO_TU: '-',
        DIEN_AP: dienApStr,
        CAP_CXAC: r.CAP_CXAC || '',
        MA_TBI: r.MA_TBI || '',
        SO_TBI: r.SO_TBI || '',
        SO_PHA: r.SO_PHA ? `${r.SO_PHA}` : '1',
        HSN: r.HSN || '0',
        NGAY_KDINH: r.NGAY_KDINH || '',
        HAN_KDINH: r.HAN_KDINH || '',
        raw: r
      };
    });
  }, [tiEntries, tiSheetName]);

  // 3. Unified Meter Records (1P, 3P TT, 3P GT)
  const meterUnified = useMemo<UnifiedDetailRecord[]>(() => {
    return entries.map((r, idx) => {
      const is1p = isDK1P(r);
      const is3pGT = isDK3PGT(r);
      const cat: DeviceFilterType = is1p ? 'dk1p' : is3pGT ? 'dk3pGT' : 'dk3pTT';
      const label = is1p ? 'Điện kế 1 pha' : is3pGT ? 'Điện kế 3 pha gián tiếp' : 'Điện kế 3 pha trực tiếp';
      const badgeBg = is1p ? 'bg-emerald-100' : is3pGT ? 'bg-purple-100' : 'bg-teal-100';
      const badgeText = is1p ? 'text-emerald-800' : is3pGT ? 'text-purple-800' : 'text-teal-800';

      return {
        id: `dk_${r.MA_DDO || ''}_${r.MA_TBI || ''}_${idx}`,
        sourceSheet: 'dienke',
        sourceSheetName: qhSheetName,
        deviceCategory: cat,
        deviceLabel: label,
        badgeBg,
        badgeText,
        MA_DDO: r.MA_DDO || '',
        TEN_KHANG: r.TEN_KHANG || '',
        DCHI_DDO: r.DCHI_DDO || '',
        DTHOAI: r.DTHOAI || '',
        MA_SOGCS: r.MA_SOGCS || '',
        khuVuc: r.khuVuc || 'Khác',
        MA_KVUC: r.MA_KVUC || '',
        STT: r.STT || '',
        LOAI_TT_GT: r.LOAI_TT_GT || (is1p ? '1 Pha' : is3pGT ? 'Gián tiếp' : 'Trực tiếp'),
        TSO_TI: r.TSO_TI || '-',
        TSO_TU: r.TSO_TU || '-',
        DIEN_AP: r.DIEN_AP ? (String(r.DIEN_AP).toLowerCase().includes('v') ? String(r.DIEN_AP) : `${r.DIEN_AP} V`) : (is1p ? '220 V' : '380 V'),
        CAP_CXAC: '',
        MA_TBI: r.MA_TBI || '',
        SO_TBI: r.SO_TBI || '',
        SO_PHA: r.SO_PHA ? `${r.SO_PHA}` : (is1p ? '1' : '3'),
        HSN: r.HSN || '1',
        NGAY_KDINH: r.NGAY_KDINH || '',
        HAN_KDINH: r.HAN_KDINH || '',
        raw: r
      };
    });
  }, [entries, qhSheetName]);

  // 4. Unified Vừa TU - TI Records
  const vuaTUTIUnified = useMemo<UnifiedDetailRecord[]>(() => {
    const commonTUTI = [...tuMaddos].filter(m => tiMaddos.has(m));
    const tuMap = new Map<string, TuSheetEntry>();
    tuEntries.forEach(r => {
      const m = String(r.MA_DDO || '').trim().toUpperCase();
      if (m && !tuMap.has(m)) tuMap.set(m, r);
    });
    const tiMap = new Map<string, TiSheetEntry>();
    tiEntries.forEach(r => {
      const m = String(r.MA_DDO || '').trim().toUpperCase();
      if (m && !tiMap.has(m)) tiMap.set(m, r);
    });

    return commonTUTI.map((m, idx) => {
      const tu = tuMap.get(m);
      const ti = tiMap.get(m);
      const reg = maddoRegionMap.get(m) || tu?.khuVuc || ti?.khuVuc || 'Khác';

      return {
        id: `vua_tuti_${m}_${idx}`,
        sourceSheet: 'vuaTUTI',
        sourceSheetName: `${tuSheetName} & ${tiSheetName}`,
        deviceCategory: 'vuaTUTI',
        deviceLabel: 'Vừa TU - TI',
        badgeBg: 'bg-rose-100',
        badgeText: 'text-rose-800',
        MA_DDO: m,
        TEN_KHANG: tu?.TEN_KHANG || ti?.TEN_KHANG || '',
        DCHI_DDO: tu?.DCHI_DDO || ti?.DCHI_DDO || '',
        DTHOAI: tu?.DTHOAI || ti?.DTHOAI || '',
        MA_SOGCS: tu?.MA_SOGCS || ti?.MA_SOGCS || '',
        khuVuc: reg,
        MA_KVUC: tu?.MA_KVUC || ti?.MA_KVUC || '',
        STT: tu?.STT || ti?.STT || '',
        LOAI_TT_GT: `TU: ${tu?.TYSO_DAU || '-'} | TI: ${ti?.TYSO_DAU || '-'}`,
        TSO_TI: ti?.TYSO_DAU || '-',
        TSO_TU: tu?.TYSO_DAU || '-',
        DIEN_AP: tu?.DIEN_AP || ti?.DIEN_AP || '22 kV',
        CAP_CXAC: `TU: ${tu?.CAP_CXAC || '-'} | TI: ${ti?.CAP_CXAC || '-'}`,
        MA_TBI: `TU: ${tu?.MA_TBI || '-'} / TI: ${ti?.MA_TBI || '-'}`,
        SO_TBI: `TU: ${tu?.SO_TBI || '-'} / TI: ${ti?.SO_TBI || '-'}`,
        SO_PHA: tu?.SO_PHA || ti?.SO_PHA || '3',
        HSN: '0',
        NGAY_KDINH: tu?.NGAY_KDINH || ti?.NGAY_KDINH || '',
        HAN_KDINH: tu?.HAN_KDINH || ti?.HAN_KDINH || '',
        raw: { tu, ti }
      };
    });
  }, [tuMaddos, tiMaddos, tuEntries, tiEntries, maddoRegionMap, tuSheetName, tiSheetName]);

  // 5. Unified Vừa ĐK - TU - TI Records
  const vuaDKTUTIUnified = useMemo<UnifiedDetailRecord[]>(() => {
    const commonDKTUTI = [...qhMaddos].filter(m => tuMaddos.has(m) && tiMaddos.has(m));
    const qhMap = new Map<string, QuaHanEntry>();
    entries.forEach(r => {
      const m = String(r.MA_DDO || '').trim().toUpperCase();
      if (m && !qhMap.has(m)) qhMap.set(m, r);
    });
    const tuMap = new Map<string, TuSheetEntry>();
    tuEntries.forEach(r => {
      const m = String(r.MA_DDO || '').trim().toUpperCase();
      if (m && !tuMap.has(m)) tuMap.set(m, r);
    });
    const tiMap = new Map<string, TiSheetEntry>();
    tiEntries.forEach(r => {
      const m = String(r.MA_DDO || '').trim().toUpperCase();
      if (m && !tiMap.has(m)) tiMap.set(m, r);
    });

    return commonDKTUTI.map((m, idx) => {
      const dk = qhMap.get(m);
      const tu = tuMap.get(m);
      const ti = tiMap.get(m);
      const reg = maddoRegionMap.get(m) || dk?.khuVuc || tu?.khuVuc || ti?.khuVuc || 'Khác';

      return {
        id: `vua_dktuti_${m}_${idx}`,
        sourceSheet: 'vuaDKTUTI',
        sourceSheetName: `${qhSheetName}, ${tuSheetName}, ${tiSheetName}`,
        deviceCategory: 'vuaDKTUTI',
        deviceLabel: 'Vừa ĐK - TU - TI',
        badgeBg: 'bg-pink-100',
        badgeText: 'text-pink-800',
        MA_DDO: m,
        TEN_KHANG: dk?.TEN_KHANG || tu?.TEN_KHANG || ti?.TEN_KHANG || '',
        DCHI_DDO: dk?.DCHI_DDO || tu?.DCHI_DDO || ti?.DCHI_DDO || '',
        DTHOAI: dk?.DTHOAI || tu?.DTHOAI || ti?.DTHOAI || '',
        MA_SOGCS: dk?.MA_SOGCS || tu?.MA_SOGCS || ti?.MA_SOGCS || '',
        khuVuc: reg,
        MA_KVUC: dk?.MA_KVUC || tu?.MA_KVUC || '',
        STT: dk?.STT || tu?.STT || '',
        LOAI_TT_GT: dk?.LOAI_TT_GT || 'Gián tiếp',
        TSO_TI: ti?.TYSO_DAU || dk?.TSO_TI || '-',
        TSO_TU: tu?.TYSO_DAU || dk?.TSO_TU || '-',
        DIEN_AP: dk?.DIEN_AP || tu?.DIEN_AP || '22 kV',
        CAP_CXAC: `TU: ${tu?.CAP_CXAC || '-'} | TI: ${ti?.CAP_CXAC || '-'}`,
        MA_TBI: `ĐK: ${dk?.MA_TBI || '-'} / TU: ${tu?.MA_TBI || '-'} / TI: ${ti?.MA_TBI || '-'}`,
        SO_TBI: `ĐK: ${dk?.SO_TBI || '-'} / TU: ${tu?.SO_TBI || '-'} / TI: ${ti?.SO_TBI || '-'}`,
        SO_PHA: dk?.SO_PHA || '3',
        HSN: dk?.HSN || '0',
        NGAY_KDINH: dk?.NGAY_KDINH || tu?.NGAY_KDINH || '',
        HAN_KDINH: dk?.HAN_KDINH || tu?.HAN_KDINH || '',
        raw: { dk, tu, ti }
      };
    });
  }, [qhMaddos, tuMaddos, tiMaddos, entries, tuEntries, tiEntries, maddoRegionMap, qhSheetName, tuSheetName, tiSheetName]);

  // Target records based on selected device category
  const targetRecords = useMemo<UnifiedDetailRecord[]>(() => {
    switch (selectedDeviceType) {
      case 'tu':
        return tuUnified;
      case 'tiHaThe':
        return tiUnified.filter(r => r.deviceCategory === 'tiHaThe');
      case 'tiTrungThe':
        return tiUnified.filter(r => r.deviceCategory === 'tiTrungThe');
      case 'dk1p':
        return meterUnified.filter(r => r.deviceCategory === 'dk1p');
      case 'dk3pTT':
        return meterUnified.filter(r => r.deviceCategory === 'dk3pTT');
      case 'dk3pGT':
        return meterUnified.filter(r => r.deviceCategory === 'dk3pGT');
      case 'vuaTUTI':
        return vuaTUTIUnified;
      case 'vuaDKTUTI':
        return vuaDKTUTIUnified;
      case 'all':
      default:
        return [...tuUnified, ...tiUnified, ...meterUnified];
    }
  }, [selectedDeviceType, tuUnified, tiUnified, meterUnified, vuaTUTIUnified, vuaDKTUTIUnified]);

  // Filter detail records (Phần dưới)
  const filteredRecords = useMemo(() => {
    let result = targetRecords;

    // Filter by Region
    if (selectedRegion !== 'all') {
      result = result.filter(r => (r.khuVuc || 'Khác') === selectedRegion);
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
        (r.TSO_TU && r.TSO_TU.toLowerCase().includes(q)) ||
        (r.DIEN_AP && r.DIEN_AP.toLowerCase().includes(q)) ||
        (r.deviceLabel && r.deviceLabel.toLowerCase().includes(q)) ||
        (r.LOAI_TT_GT && r.LOAI_TT_GT.toLowerCase().includes(q))
      );
    }

    return result;
  }, [targetRecords, selectedRegion, searchQuery]);

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
        'Phân loại thiết bị',
        'Sheet nguồn',
        'Mã ĐĐO',
        'Tên khách hàng',
        'Địa chỉ ĐĐO',
        'Điện thoại',
        'Mã sổ GCS',
        'Khu vực',
        'Mã KVực',
        'STT',
        'Loại TT/GT / Chi tiết',
        'Thông số TI',
        'Thông số TU',
        'Điện áp',
        'Cấp chính xác',
        'Mã TBI',
        'Số TBI (Số thiết bị/công tơ)',
        'Số pha',
        'HSN',
        'Ngày KĐ',
        'Hạn KĐ'
      ];

      const reportTitle = isCuoiNam
        ? 'DANH SÁCH CHI TIẾT HỒ SƠ QUÁ HẠN KIỂM ĐỊNH ĐẾN CUỐI NĂM'
        : 'DANH SÁCH CHI TIẾT HỒ SƠ QUÁ HẠN KIỂM ĐỊNH';

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
          r.deviceLabel,
          r.sourceSheetName,
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
          r.DIEN_AP || '',
          r.CAP_CXAC || '',
          r.MA_TBI || '',
          r.SO_TBI || '',
          r.SO_PHA ? `${r.SO_PHA}P` : '',
          r.HSN || '',
          r.NGAY_KDINH || '',
          r.HAN_KDINH || ''
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 14 },
        { wch: 18 },
        { wch: 32 },
        { wch: 40 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 10 },
        { wch: 8 },
        { wch: 22 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 22 },
        { wch: 18 },
        { wch: 8 },
        { wch: 8 },
        { wch: 12 },
        { wch: 12 }
      ];

      const wb = XLSX.utils.book_new();
      const sheetTabName = selectedDeviceType === 'tu' ? 'ChiTiet_TU' 
        : selectedDeviceType === 'tiHaThe' ? 'ChiTiet_TI_HaThe'
        : selectedDeviceType === 'tiTrungThe' ? 'ChiTiet_TI_TrungThe'
        : selectedDeviceType.startsWith('dk') ? 'ChiTiet_DienKe'
        : 'ChiTiet_TongHop';
      XLSX.utils.book_append_sheet(wb, ws, sheetTabName);

      const filterTag = selectedRegion !== 'all' ? selectedRegion.replace(/\s+/g, '_') : 'TatCa';
      const devTag = selectedDeviceType !== 'all' ? selectedDeviceType : 'TongHop';
      const fileName = isCuoiNam
        ? `Chi_Tiet_Qua_Han_Cuoi_Nam_${devTag}_${filterTag}_${new Date().toISOString().slice(0, 10)}.xlsx`
        : `Chi_Tiet_Qua_Han_${devTag}_${filterTag}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast(`Đã xuất ${filteredRecords.length} hồ sơ chi tiết ra Excel!`);
    } catch (e) {
      console.error('Export error:', e);
      showToast('Lỗi khi kết xuất Excel chi tiết!');
    }
  };

  // Export Current Page Excel (20 records)
  const handleExportCurrentPageExcel = () => {
    try {
      const headers = [
        'STT',
        'Phân loại thiết bị',
        'Sheet nguồn',
        'Mã ĐĐO',
        'Tên khách hàng',
        'Địa chỉ ĐĐO',
        'Điện thoại',
        'Mã sổ GCS',
        'Khu vực',
        'Mã KVực',
        'STT',
        'Loại TT/GT / Chi tiết',
        'Thông số TI',
        'Thông số TU',
        'Điện áp',
        'Cấp chính xác',
        'Mã TBI',
        'Số TBI (Số thiết bị/công tơ)',
        'Số pha',
        'HSN',
        'Ngày KĐ',
        'Hạn KĐ'
      ];

      const reportTitle = isCuoiNam
        ? `DANH SÁCH CHI TIẾT HỒ SƠ QUÁ HẠN KIỂM ĐỊNH ĐẾN CUỐI NĂM - TRANG ${currentPage}/${totalPages}`
        : `DANH SÁCH CHI TIẾT HỒ SƠ QUÁ HẠN KIỂM ĐỊNH - TRANG ${currentPage}/${totalPages}`;

      const rows: any[] = [
        [reportTitle],
        [`Bộ lọc: Khu vực [${selectedRegion === 'all' ? 'Tất cả' : selectedRegion}] - Thiết bị [${getDeviceTypeLabel(selectedDeviceType)}] - Trang ${currentPage}/${totalPages} (${paginatedRecords.length} hồ sơ)`],
        [`Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}`],
        [],
        headers
      ];

      paginatedRecords.forEach((r, idx) => {
        const globalIdx = (currentPage - 1) * pageSize + idx + 1;
        rows.push([
          globalIdx,
          r.deviceLabel,
          r.sourceSheetName,
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
          r.DIEN_AP || '',
          r.CAP_CXAC || '',
          r.MA_TBI || '',
          r.SO_TBI || '',
          r.SO_PHA ? `${r.SO_PHA}P` : '',
          r.HSN || '',
          r.NGAY_KDINH || '',
          r.HAN_KDINH || ''
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 14 },
        { wch: 18 },
        { wch: 32 },
        { wch: 40 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 10 },
        { wch: 8 },
        { wch: 22 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 22 },
        { wch: 18 },
        { wch: 8 },
        { wch: 8 },
        { wch: 12 },
        { wch: 12 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Trang_${currentPage}`);
      const filterTag = selectedRegion !== 'all' ? selectedRegion.replace(/\s+/g, '_') : 'TatCa';
      const devTag = selectedDeviceType !== 'all' ? selectedDeviceType : 'TongHop';
      const fileName = isCuoiNam
        ? `Chi_Tiet_Qua_Han_Cuoi_Nam_${devTag}_${filterTag}_Trang_${currentPage}_${new Date().toISOString().slice(0, 10)}.xlsx`
        : `Chi_Tiet_Qua_Han_${devTag}_${filterTag}_Trang_${currentPage}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast(`Đã xuất ${paginatedRecords.length} hồ sơ trang ${currentPage} ra Excel!`);
    } catch (e) {
      console.error('Export error:', e);
      showToast('Lỗi khi kết xuất Excel trang hiện tại!');
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

  // Confirm Import & Clear Old Data, Put New Data In
  const handleConfirmImport = async () => {
    if (!parsedImportData || parsedImportData.length === 0) return;
    setIsImporting(true);
    try {
      const targetSheet = isCuoiNam
        ? (importType === 'dienke' ? 'QuaHan_Nam' : importType === 'tu' ? 'TU_Nam' : 'TI_Nam')
        : (importType === 'dienke' ? 'QuaHan' : importType === 'tu' ? 'TU' : 'TI');

      const requiredCols = importType === 'dienke' 
        ? DIEN_KE_COLUMNS 
        : importType === 'tu' 
          ? TU_COLUMNS 
          : TI_COLUMNS;

      if (importType === 'dienke') {
        const parsed = DataStore.parseQuaHanCSVData(parsedImportData);
        if (isCuoiNam) {
          setEntries([]); // Xóa dữ liệu cũ trong component
          await DataStore.setQuaHanNamEntries(parsed);
          setEntries(parsed);
        } else {
          setEntries([]); // Xóa dữ liệu cũ trong component
          await DataStore.setQuaHanEntries(parsed);
          setEntries(parsed);
        }
      } else if (importType === 'tu') {
        const parsed = DataStore.parseTuCSVData(parsedImportData);
        if (isCuoiNam) {
          setTuEntries([]); // Xóa dữ liệu cũ trong component
          await DataStore.setTuNamEntries(parsed);
          setTuEntries(parsed);
        } else {
          setTuEntries([]); // Xóa dữ liệu cũ trong component
          await DataStore.setTuSheetEntries(parsed);
          setTuEntries(parsed);
        }
      } else if (importType === 'ti') {
        const parsed = DataStore.parseTiCSVData(parsedImportData);
        if (isCuoiNam) {
          setTiEntries([]); // Xóa dữ liệu cũ trong component
          await DataStore.setTiNamEntries(parsed);
          setTiEntries(parsed);
        } else {
          setTiEntries([]); // Xóa dữ liệu cũ trong component
          await DataStore.setTiSheetEntries(parsed);
          setTiEntries(parsed);
        }
      }

      // ĐỒNG BỘ LÊN GOOGLE SHEETS QUA APPS SCRIPT (NẾU ĐÃ CẤU HÌNH URL):
      // Gọi lệnh xóa sạch sheet cũ (clearContents()) và chèn chính xác số dòng mới vào Google Sheet
      try {
        await DataStore.syncHtddSheetToGoogleSheet(targetSheet, requiredCols, parsedImportData);
      } catch (errSync) {
        console.warn('Lưu ý đồng bộ Google Sheets nền:', errSync);
      }

      showToast(`Đã xóa sạch dữ liệu cũ và nạp ${parsedImportData.length.toLocaleString()} dòng mới vào sheet ${targetSheet}!`);
      setShowImportModal(false);
      setParsedImportData(null);
      setImportFileName('');
      setImportError(null);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Import error:', err);
      setImportError('Lỗi trong quá trình xử lý: ' + (err.message || 'Lỗi không xác định'));
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
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>2. Danh Sách Chi Tiết Hồ Sơ Quá Hạn</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold font-mono">
                  {filteredRecords.length.toLocaleString()} bản ghi
                </span>
                {totalPages > 1 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold font-mono">
                    Trang {currentPage}/{totalPages}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {selectedDeviceType === 'tu' ? `Dữ liệu lấy từ Sheet: ${tuSheetName} • Thiết bị TU` :
                 selectedDeviceType === 'tiHaThe' ? `Dữ liệu lấy từ Sheet: ${tiSheetName} • Thiết bị TI Hạ thế` :
                 selectedDeviceType === 'tiTrungThe' ? `Dữ liệu lấy từ Sheet: ${tiSheetName} • Thiết bị TI Trung thế` :
                 (selectedDeviceType === 'dk1p' || selectedDeviceType === 'dk3pTT' || selectedDeviceType === 'dk3pGT') ? `Dữ liệu lấy từ Sheet: ${qhSheetName} • ${getDeviceTypeLabel(selectedDeviceType)}` :
                 selectedDeviceType === 'vuaTUTI' ? `Dữ liệu đối soát điểm đo có cả TU và TI từ Sheet ${tuSheetName} & ${tiSheetName}` :
                 selectedDeviceType === 'vuaDKTUTI' ? `Dữ liệu đối soát điểm đo có cả Điện kế, TU và TI` :
                 `Tổng hợp toàn bộ thiết bị quá hạn từ các sheet: ${qhSheetName}, ${tuSheetName}, ${tiSheetName}`}
                {' '}(20 records/trang)
              </p>
            </div>

            {/* Actions & Filters Header */}
            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
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

              {/* Nút Xuất Excel ngay tại bảng danh sách chi tiết */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleExportDetailExcel}
                  disabled={filteredRecords.length === 0}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm shadow-emerald-600/30 whitespace-nowrap"
                  title={`Xuất toàn bộ ${filteredRecords.length.toLocaleString()} bản ghi chi tiết ra file Excel`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-white" />
                  <span>Xuất Excel ({filteredRecords.length.toLocaleString()})</span>
                </button>

                {totalPages > 1 && (
                  <button
                    type="button"
                    onClick={handleExportCurrentPageExcel}
                    disabled={paginatedRecords.length === 0}
                    className="px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 active:scale-95 disabled:opacity-40 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                    title={`Chỉ xuất ${paginatedRecords.length} bản ghi của trang ${currentPage} ra file Excel`}
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Trang {currentPage} ({paginatedRecords.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Search bar & quick filters */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
            <div className="relative sm:col-span-6 md:col-span-5">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Tìm mã điểm đo, tên KH, địa chỉ, số ĐT, mã sổ GCS, mã/số thiết bị, thông số..."
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
                <option value="tu">TU (Sheet {tuSheetName})</option>
                <option value="tiHaThe">TI Hạ thế (Sheet {tiSheetName})</option>
                <option value="tiTrungThe">TI Trung thế (Sheet {tiSheetName})</option>
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
                <th className="px-3.5 py-2.5 border-r border-slate-200 text-center min-w-[125px]">Phân loại TB</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 whitespace-nowrap min-w-[130px]">MA_DDO</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 min-w-[200px]">TEN_KHANG</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 min-w-[240px]">DCHI_DDO</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 min-w-[110px]">DTHOAI</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 whitespace-nowrap min-w-[110px]">MA_SOGCS</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 text-center min-w-[75px]">MA_KVUC</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 text-center min-w-[115px]">LOAI_TT_GT / Chi tiết</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 text-center min-w-[95px]">TSO_TI</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 text-center min-w-[95px]">TSO_TU</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 text-center min-w-[90px]">Điện áp</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 min-w-[140px]">MA_TBI</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 min-w-[120px] bg-amber-50/60 font-bold">SO_TBI</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 text-center min-w-[70px]">SO_PHA</th>
                <th className="px-3.5 py-2.5 border-r border-slate-200 text-center min-w-[65px]">HSN</th>
                <th className="px-3.5 py-2.5 text-center min-w-[95px]">Hạn KĐ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-12 text-center text-slate-400 font-sans">
                    <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-sm text-slate-600">Không tìm thấy hồ sơ nào phù hợp</p>
                    <p className="text-xs text-slate-400 mt-1">Hãy thử xóa bộ lọc hoặc tìm kiếm từ khóa khác.</p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={`${r.id}_${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 text-center border-r border-slate-100 text-slate-400">
                        {globalIdx}
                      </td>
                      <td className="px-3.5 py-2.5 text-center border-r border-slate-100">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.badgeBg} ${r.badgeText} border`}>
                          {r.deviceLabel}
                        </span>
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
                      <td className="px-3.5 py-2.5 text-center border-r border-slate-100 font-sans">
                        {r.LOAI_TT_GT ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.LOAI_TT_GT.toLowerCase().includes('trực tiếp') 
                              ? 'bg-teal-100 text-teal-800' 
                              : r.LOAI_TT_GT.toLowerCase().includes('gián tiếp')
                              ? 'bg-purple-100 text-purple-800'
                              : r.LOAI_TT_GT.toLowerCase().includes('tu')
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
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
                      <td className="px-3.5 py-2.5 text-center text-slate-700 border-r border-slate-100 font-sans text-[10px]">
                        {r.DIEN_AP || '-'}
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
                      <td className="px-3.5 py-2.5 text-center text-slate-800 font-bold border-r border-slate-100">
                        {r.HSN || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 text-center text-red-600 font-bold font-sans text-[10px]">
                        {r.HAN_KDINH || '-'}
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
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="text-xs text-slate-600 font-medium">
              Hiển thị <span className="font-bold text-slate-800">{filteredRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> đến <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, filteredRecords.length)}</span> trên tổng số <span className="font-bold text-slate-900">{filteredRecords.length.toLocaleString()}</span> hồ sơ (20 records/trang)
            </div>

            <button
              type="button"
              onClick={handleExportDetailExcel}
              disabled={filteredRecords.length === 0}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              title={`Xuất ${filteredRecords.length.toLocaleString()} bản ghi chi tiết ra file Excel`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              <span>Xuất Excel ({filteredRecords.length.toLocaleString()})</span>
            </button>
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

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    Import & Ghi Đè Dữ Liệu {isCuoiNam ? '(Cuối Năm)' : '(Quá Hạn)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ghi đè dữ liệu mới vào sheet hiện hữu của Hệ Thống Đo Đếm
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setParsedImportData(null);
                  setImportError(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-4 overflow-y-auto pr-1">
              {/* Type Selector Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  1. Chọn loại thiết bị cần import:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImportType('dienke');
                      setParsedImportData(null);
                      setImportError(null);
                      setImportFileName('');
                    }}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      importType === 'dienke'
                        ? 'border-rose-500 bg-rose-50/70 text-rose-900 ring-2 ring-rose-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                      <Zap className="w-4 h-4 text-rose-600" />
                      <span>Điện kế</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 font-mono">
                      Sheet: <b className="text-rose-700">{isCuoiNam ? 'QuaHan_Nam' : 'QuaHan'}</b>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setImportType('tu');
                      setParsedImportData(null);
                      setImportError(null);
                      setImportFileName('');
                    }}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      importType === 'tu'
                        ? 'border-indigo-500 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Máy biến điện áp (TU)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 font-mono">
                      Sheet: <b className="text-indigo-700">{isCuoiNam ? 'TU_Nam' : 'TU'}</b>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setImportType('ti');
                      setParsedImportData(null);
                      setImportError(null);
                      setImportFileName('');
                    }}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      importType === 'ti'
                        ? 'border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                      <BarChart3 className="w-4 h-4 text-amber-600" />
                      <span>Máy biến dòng (TI)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 font-mono">
                      Sheet: <b className="text-amber-700">{isCuoiNam ? 'TI_Nam' : 'TI'}</b>
                    </div>
                  </button>
                </div>
              </div>

              {/* Requirements & Template Button */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs text-slate-700">
                    <span className="font-bold">Quy chuẩn cấu trúc:</span> File mới phải có đủ{' '}
                    <b className="text-indigo-600">
                      {importType === 'dienke' ? DIEN_KE_COLUMNS.length : TU_COLUMNS.length} trường
                    </b>{' '}
                    và tên cột phải khớp tuyệt đối với sheet{' '}
                    <b className="text-slate-800">
                      {isCuoiNam
                        ? (importType === 'dienke' ? 'QuaHan_Nam' : importType === 'tu' ? 'TU_Nam' : 'TI_Nam')
                        : (importType === 'dienke' ? 'QuaHan' : importType === 'tu' ? 'TU' : 'TI')}
                    </b>.
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate(importType)}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tải file Excel mẫu</span>
                  </button>
                </div>
                <details className="text-[11px] text-slate-500 cursor-pointer">
                  <summary className="font-semibold text-indigo-600 hover:text-indigo-700 select-none">
                    Xem danh sách các cột yêu cầu ({importType === 'dienke' ? DIEN_KE_COLUMNS.length : TU_COLUMNS.length} cột)
                  </summary>
                  <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200 font-mono text-[10px] break-all leading-relaxed max-h-32 overflow-y-auto">
                    {(importType === 'dienke' ? DIEN_KE_COLUMNS : importType === 'tu' ? TU_COLUMNS : TI_COLUMNS).join(', ')}
                  </div>
                </details>
              </div>

              {/* File Upload Drop Zone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  2. Chọn file dữ liệu (.xlsx, .xls, .csv):
                </label>
                <div className="relative border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-6 text-center transition-all bg-slate-50/50 hover:bg-indigo-50/20">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {importFileName ? importFileName : 'Nhấp để chọn file hoặc kéo thả file vào đây'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Hỗ trợ định dạng Microsoft Excel (.xlsx, .xls) hoặc CSV
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {importError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Cấu trúc file không hợp lệ:</p>
                    <p className="text-[11px] leading-relaxed whitespace-pre-line font-mono">{importError}</p>
                  </div>
                </div>
              )}

              {/* Success Preview */}
              {parsedImportData && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-xs font-black text-emerald-900">
                          File hợp lệ! Đã đọc thành công {parsedImportData.length.toLocaleString()} dòng
                        </span>
                        <p className="text-[11px] text-emerald-700">
                          Tất cả các trường bắt buộc đã được kiểm tra đầy đủ.
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 text-xs font-bold font-mono">
                      {parsedImportData.length} records
                    </span>
                  </div>

                  {/* Warning banner */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <b>Quy trình xử lý:</b> Toàn bộ dữ liệu cũ trong sheet{' '}
                      <b>
                        {isCuoiNam
                          ? (importType === 'dienke' ? 'QuaHan_Nam' : importType === 'tu' ? 'TU_Nam' : 'TI_Nam')
                          : (importType === 'dienke' ? 'QuaHan' : importType === 'tu' ? 'TU' : 'TI')}
                      </b>{' '}
                      sẽ được <b>xóa sạch hoàn toàn</b> trước, sau đó đưa đúng <b>{parsedImportData.length.toLocaleString()}</b> dòng mới vào, đảm bảo không bị lẫn lộn dữ liệu cũ và số liệu thống kê chuẩn xác 100%.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setParsedImportData(null);
                  setImportError(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={!parsedImportData || parsedImportData.length === 0 || isImporting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{isImporting ? 'Đang xử lý...' : 'Xóa dữ liệu cũ & Nạp dữ liệu mới'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMISSION ALERT MODAL */}
      {showPermissionAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-scale-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">
                Không Có Quyền Thực Hiện
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Chức năng <b>Import dữ liệu Quá hạn / Cuối năm (HTDD)</b> chỉ dành cho các vai trò được phân quyền (mặc định là <b>Đội trưởng</b>).
              </p>
              <div className="mt-3 p-3 bg-slate-50 rounded-xl text-left border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div>• Vai trò hiện tại của bạn: <b className="text-slate-800">{sessionUser?.role || 'Chưa xác định'}</b></div>
                <div>• Để cấp quyền cho tài khoản này, vui lòng liên hệ Đội trưởng truy cập tab <b>Hệ thống</b> → mục <b>Phân quyền tác vụ</b>.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPermissionAlert(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer transition-all shadow-md"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
