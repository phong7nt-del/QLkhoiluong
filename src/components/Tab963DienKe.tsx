import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import { 
  Gauge, Calendar, Plus, Trash2, Edit2, Check, X, RefreshCw, 
  FileSpreadsheet, Download, Filter, Search, ArrowUpRight, 
  Layers, Package, CheckCircle2, Clock, AlertTriangle, Info,
  ChevronDown, ChevronUp, ChevronRight, User, Hash, Zap, Lock, ShieldAlert
} from 'lucide-react';
import { PermissionStore } from '../store/PermissionStore';
import { 
  DataStore, 
  Entry963, 
  NhapDk963Entry, 
  SheetMember 
} from '../store/DataStore';

interface Tab963DienKeProps {
  entries963: Entry963[];
  sessionUser: SheetMember | null;
  onRefreshData?: () => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

// Helper: Lấy chuỗi ngày hiện tại định dạng dd/mm/yyyy
export const getTodayFormatted = (): string => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper: Chuẩn hóa ngày về dạng dd/mm/yyyy
export const normalizeDateStr = (raw: string | undefined): string => {
  if (!raw) return '';
  const s = String(raw).trim();
  if (!s) return '';

  // Dạng ISO: yyyy-mm-dd...
  if (s.includes('-')) {
    const parts = s.split('T')[0].split(' ')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }

  // Dạng dd/mm/yyyy hh:mm hoặc dd/mm/yyyy
  if (s.includes('/')) {
    const datePart = s.split(' ')[0];
    const parts = datePart.split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      let y = parts[2];
      if (y.length === 2) y = '20' + y;
      return `${d}/${m}/${y}`;
    }
  }

  return s;
};

// 4 Chủng loại điện kế theo yêu cầu:
// 1. 1 Pha Trực Tiếp
// 2. 1 Pha Gián Tiếp
// 3. 3 Pha Trực Tiếp
// 4. 3 Pha Gián Tiếp
export type MeterCategory4 = '1 Pha Trực Tiếp' | '1 Pha Gián Tiếp' | '3 Pha Trực Tiếp' | '3 Pha Gián Tiếp';

// Helper: Phân loại chủng loại điện kế của bản ghi 963
// Số pha căn cứ vào cột So_pha ('1' hoặc '3')
// Trực tiếp hay gián tiếp căn cứ vào Cột "Phien" ('TT' là Trực tiếp, 'GT' là Gián tiếp)
export const resolvePhaseCategory = (c: Entry963): {
  soPhaGroup: '1 Pha' | '3 Pha';
  kieuDo: 'Trực Tiếp' | 'Gián Tiếp';
  chiTiet: MeterCategory4;
} => {
  const spRaw = String(c.soPha || '').trim();
  const is3P = spRaw === '3' || spRaw.toLowerCase().includes('3 pha') || spRaw.toLowerCase() === '3p';
  const soPhaGroup: '1 Pha' | '3 Pha' = is3P ? '3 Pha' : '1 Pha';

  const phienRaw = String(c.phien || '').trim().toUpperCase();
  let isGT = false;
  if (phienRaw === 'GT' || phienRaw.includes('GT') || phienRaw.toLowerCase().includes('gián tiếp')) {
    isGT = true;
  } else if (phienRaw === 'TT' || phienRaw.includes('TT') || phienRaw.toLowerCase().includes('trực tiếp')) {
    isGT = false;
  } else {
    // Fallback nếu cột Phien trống: kiểm tra thông số TI/TU, HSN hoặc loại công tơ
    const loai = (c.loaiCto || '').toLowerCase();
    const cloai = (c.chungLoaiCanThay || '').toLowerCase();
    const hasTiTu = Boolean((c.tySoTi && c.tySoTi.trim() !== '') || (c.tySoTu && c.tySoTu.trim() !== ''));
    const hsnVal = parseFloat(String(c.hsn || '1'));
    isGT = loai.includes('gián tiếp') || loai.includes('gt') || cloai.includes('gián tiếp') || cloai.includes('gt') || hasTiTu || hsnVal > 1;
  }

  const kieuDo: 'Trực Tiếp' | 'Gián Tiếp' = isGT ? 'Gián Tiếp' : 'Trực Tiếp';
  const chiTiet: MeterCategory4 = `${soPhaGroup} ${kieuDo}` as MeterCategory4;

  return {
    soPhaGroup,
    kieuDo,
    chiTiet
  };
};

// Helper: Chuẩn hóa chủng loại từ đợt nhập (NhapDK963) về 1 trong 4 loại
export const resolveNhapCategory = (clRaw?: string): MeterCategory4 => {
  const s = String(clRaw || '').trim().toLowerCase();
  const is3P = s.includes('3') || s.includes('3p');
  const isGT = s.includes('gián tiếp') || s.includes('gian tiep') || s.includes('gt');
  if (is3P) {
    return isGT ? '3 Pha Gián Tiếp' : '3 Pha Trực Tiếp';
  } else {
    return isGT ? '1 Pha Gián Tiếp' : '1 Pha Trực Tiếp';
  }
};

export default function Tab963DienKe({
  entries963,
  sessionUser,
  onRefreshData,
  showToast
}: Tab963DienKeProps) {
  // Danh sách các đợt nhập từ Sheet NhapDK963
  const [nhapList, setNhapList] = useState<NhapDk963Entry[]>(() => DataStore.getNhapDk963Entries());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Quyền truy cập: Chỉ cho phép từ Tổ phó, Tổ trưởng trở lên (cấu hình trong tab Hệ thống)
  const canAccess = useMemo(() => {
    return PermissionStore.hasActionAccess('tab963_dien_ke', sessionUser?.role || '', sessionUser);
  }, [sessionUser]);

  // Form state nhập mới (hỗ trợ 4 chủng loại)
  const [formNgay, setFormNgay] = useState<string>(getTodayFormatted());
  const [formChungLoai, setFormChungLoai] = useState<MeterCategory4>('1 Pha Trực Tiếp');
  const [formSl, setFormSl] = useState<string>('');
  const [formGhiChu, setFormGhiChu] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Collapse sections
  const [showInputSection, setShowInputSection] = useState<boolean>(true);
  const [showNhapListTable, setShowNhapListTable] = useState<boolean>(true);

  // Bộ lọc bảng thống kê theo ngày
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterChungLoai, setFilterChungLoai] = useState<'all' | '1 Pha' | '3 Pha' | MeterCategory4>('all');
  const [searchDailyText, setSearchDailyText] = useState<string>('');

  // Interactive drill-down: Xem danh sách chi tiết khách hàng đã thay theo ngày/chủng loại
  const [selectedDrillDown, setSelectedDrillDown] = useState<{
    date?: string;
    category?: 'all' | '1 Pha' | '3 Pha' | MeterCategory4;
    label: string;
  } | null>(null);

  // Lắng nghe sự kiện cập nhật NhapDK963
  useEffect(() => {
    const handleUpdate = () => {
      setNhapList(DataStore.getNhapDk963Entries());
    };
    window.addEventListener('nhap_dk_963_updated', handleUpdate);
    return () => window.removeEventListener('nhap_dk_963_updated', handleUpdate);
  }, []);

  // Tự động tải dữ liệu NhapDK963 từ server và Google Sheets ngay khi mở tab và khi quay lại cửa sổ
  useEffect(() => {
    DataStore.fetchNhapDk963Data(true).then((data) => {
      if (Array.isArray(data)) {
        setNhapList(data);
      }
    }).catch(() => {});

    const handleFocus = () => {
      DataStore.fetchNhapDk963Data(true).then((data) => {
        if (Array.isArray(data)) {
          setNhapList(data);
        }
      }).catch(() => {});
    };
    window.addEventListener('focus', handleFocus);

    const timer = setInterval(() => {
      DataStore.fetchNhapDk963Data(false).catch(() => {});
    }, 12000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(timer);
    };
  }, []);

  // Tải mới từ Google Sheets
  const handleReloadFromSheet = async () => {
    setIsRefreshing(true);
    showToast('info', 'Đang đồng bộ dữ liệu nhập điện kế từ Google Sheets...');
    try {
      const data = await DataStore.fetchNhapDk963Data(true);
      setNhapList(data);
      if (onRefreshData) onRefreshData();
      showToast('success', `Đã đồng bộ ${data.length} đợt nhập từ sheet NhapDK963`);
    } catch (e: any) {
      showToast('error', 'Lỗi đồng bộ: ' + (e?.message || 'Có sự cố xảy ra'));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Danh sách các khách hàng đã thay xong trong Sheet 963
  const completedCustomers = useMemo(() => {
    return entries963.filter(c => {
      const kq = (c.ketQua || '').trim().toLowerCase();
      return kq === 'xong' || kq.includes('xong');
    });
  }, [entries963]);

  // Map ngày thay cho từng khách hàng đã thay xong
  const completedWithNormalizedDate = useMemo(() => {
    return completedCustomers.map(c => {
      const normDate = normalizeDateStr(c.ngayGio);
      const cat = resolvePhaseCategory(c);
      return {
        ...c,
        normDate,
        phaseGroup: cat.soPhaGroup,
        phaseDetail: cat.chiTiet
      };
    });
  }, [completedCustomers]);

  // ==========================================
  // TÍNH TOÁN KPI TỔNG HỢP TOÀN BỘ (ALL-TIME) - 4 CHỦNG LOẠI
  // ==========================================
  const kpiTotals = useMemo(() => {
    // 1. Tổng nhập theo 4 chủng loại
    let nhapTong = 0;
    let nhap1PTT = 0;
    let nhap1PGT = 0;
    let nhap3PTT = 0;
    let nhap3PGT = 0;

    nhapList.forEach(item => {
      const qty = Number(item.sl) || 0;
      nhapTong += qty;
      const cat = resolveNhapCategory(item.chungLoai);
      if (cat === '1 Pha Trực Tiếp') nhap1PTT += qty;
      else if (cat === '1 Pha Gián Tiếp') nhap1PGT += qty;
      else if (cat === '3 Pha Trực Tiếp') nhap3PTT += qty;
      else if (cat === '3 Pha Gián Tiếp') nhap3PGT += qty;
    });

    const nhap1P = nhap1PTT + nhap1PGT;
    const nhap3P = nhap3PTT + nhap3PGT;

    // 2. Tổng đã thay theo 4 chủng loại từ sheet 963
    let thayTong = 0;
    let thay1PTT = 0;
    let thay1PGT = 0;
    let thay3PTT = 0;
    let thay3PGT = 0;

    completedWithNormalizedDate.forEach(c => {
      thayTong++;
      if (c.phaseDetail === '1 Pha Trực Tiếp') thay1PTT++;
      else if (c.phaseDetail === '1 Pha Gián Tiếp') thay1PGT++;
      else if (c.phaseDetail === '3 Pha Trực Tiếp') thay3PTT++;
      else if (c.phaseDetail === '3 Pha Gián Tiếp') thay3PGT++;
    });

    const thay1P = thay1PTT + thay1PGT;
    const thay3P = thay3PTT + thay3PGT;

    // 3. Tỷ lệ % thay / nhập
    const tyLeTong = nhapTong > 0 ? ((thayTong / nhapTong) * 100).toFixed(1) : '0.0';
    const tyLe1P = nhap1P > 0 ? ((thay1P / nhap1P) * 100).toFixed(1) : '0.0';
    const tyLe1PTT = nhap1PTT > 0 ? ((thay1PTT / nhap1PTT) * 100).toFixed(1) : '0.0';
    const tyLe1PGT = nhap1PGT > 0 ? ((thay1PGT / nhap1PGT) * 100).toFixed(1) : '0.0';
    const tyLe3P = nhap3P > 0 ? ((thay3P / nhap3P) * 100).toFixed(1) : '0.0';
    const tyLe3PTT = nhap3PTT > 0 ? ((thay3PTT / nhap3PTT) * 100).toFixed(1) : '0.0';
    const tyLe3PGT = nhap3PGT > 0 ? ((thay3PGT / nhap3PGT) * 100).toFixed(1) : '0.0';

    // 4. Tồn kho chưa thay
    const tonTong = nhapTong - thayTong;
    const ton1PTT = nhap1PTT - thay1PTT;
    const ton1PGT = nhap1PGT - thay1PGT;
    const ton1P = ton1PTT + ton1PGT;
    const ton3PTT = nhap3PTT - thay3PTT;
    const ton3PGT = nhap3PGT - thay3PGT;
    const ton3P = ton3PTT + ton3PGT;

    return {
      nhapTong,
      nhap1P,
      nhap1PTT,
      nhap1PGT,
      nhap3P,
      nhap3PTT,
      nhap3PGT,
      thayTong,
      thay1P,
      thay1PTT,
      thay1PGT,
      thay3P,
      thay3PTT,
      thay3PGT,
      tyLeTong,
      tyLe1P,
      tyLe1PTT,
      tyLe1PGT,
      tyLe3P,
      tyLe3PTT,
      tyLe3PGT,
      tonTong,
      ton1P,
      ton1PTT,
      ton1PGT,
      ton3P,
      ton3PTT,
      ton3PGT
    };
  }, [nhapList, completedWithNormalizedDate]);

  // ==========================================
  // THỐNG KÊ CHI TIẾT THEO NGÀY - 4 CHỦNG LOẠI
  // ==========================================
  const dailyStats = useMemo(() => {
    // Thu thập tất cả các ngày xuất hiện ở cả NhapDK963 và Sheet 963
    const dateMap = new Map<string, {
      date: string;
      rawDateSort: number; // để sắp xếp
      // Nhập 4 loại
      nhap1PTT: number;
      nhap1PGT: number;
      nhap1P: number;
      nhap3PTT: number;
      nhap3PGT: number;
      nhap3P: number;
      nhapTong: number;
      // Thay xong 4 loại
      thay1PTT: number;
      thay1PGT: number;
      thay1P: number;
      thay3PTT: number;
      thay3PGT: number;
      thay3P: number;
      thayTong: number;
      // Danh sách KH đã thay trong ngày
      customersReplaced: typeof completedWithNormalizedDate;
    }>();

    const getOrCreateDateEntry = (dStr: string) => {
      if (!dStr) return null;
      if (!dateMap.has(dStr)) {
        let sortVal = 0;
        const p = dStr.split('/');
        if (p.length === 3) {
          sortVal = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0])).getTime();
        }
        dateMap.set(dStr, {
          date: dStr,
          rawDateSort: isNaN(sortVal) ? 0 : sortVal,
          nhap1PTT: 0,
          nhap1PGT: 0,
          nhap1P: 0,
          nhap3PTT: 0,
          nhap3PGT: 0,
          nhap3P: 0,
          nhapTong: 0,
          thay1PTT: 0,
          thay1PGT: 0,
          thay1P: 0,
          thay3PTT: 0,
          thay3PGT: 0,
          thay3P: 0,
          thayTong: 0,
          customersReplaced: []
        });
      }
      return dateMap.get(dStr)!;
    };

    // Cộng số lượng nhập
    nhapList.forEach(item => {
      const d = normalizeDateStr(item.ngay);
      if (!d) return;
      const entry = getOrCreateDateEntry(d);
      if (!entry) return;

      const qty = Number(item.sl) || 0;
      entry.nhapTong += qty;

      const cat = resolveNhapCategory(item.chungLoai);
      if (cat === '1 Pha Trực Tiếp') {
        entry.nhap1PTT += qty;
        entry.nhap1P += qty;
      } else if (cat === '1 Pha Gián Tiếp') {
        entry.nhap1PGT += qty;
        entry.nhap1P += qty;
      } else if (cat === '3 Pha Trực Tiếp') {
        entry.nhap3PTT += qty;
        entry.nhap3P += qty;
      } else if (cat === '3 Pha Gián Tiếp') {
        entry.nhap3PGT += qty;
        entry.nhap3P += qty;
      }
    });

    // Cộng số lượng đã thay
    completedWithNormalizedDate.forEach(c => {
      const d = c.normDate;
      if (!d) return;
      const entry = getOrCreateDateEntry(d);
      if (!entry) return;

      entry.thayTong++;
      entry.customersReplaced.push(c);

      if (c.phaseDetail === '1 Pha Trực Tiếp') {
        entry.thay1PTT++;
        entry.thay1P++;
      } else if (c.phaseDetail === '1 Pha Gián Tiếp') {
        entry.thay1PGT++;
        entry.thay1P++;
      } else if (c.phaseDetail === '3 Pha Trực Tiếp') {
        entry.thay3PTT++;
        entry.thay3P++;
      } else if (c.phaseDetail === '3 Pha Gián Tiếp') {
        entry.thay3PGT++;
        entry.thay3P++;
      }
    });

    // Sắp xếp ngày giảm dần (ngày mới nhất lên đầu)
    const sorted = Array.from(dateMap.values()).sort((a, b) => b.rawDateSort - a.rawDateSort);

    // Tính tồn luỹ kế theo thời gian (tính từ ngày cũ nhất đến mới nhất)
    let runningCumulativeNhap = 0;
    let runningCumulativeThay = 0;
    const chronological = [...sorted].sort((a, b) => a.rawDateSort - b.rawDateSort);
    const cumulativeMap = new Map<string, number>();

    chronological.forEach(item => {
      runningCumulativeNhap += item.nhapTong;
      runningCumulativeThay += item.thayTong;
      cumulativeMap.set(item.date, runningCumulativeNhap - runningCumulativeThay);
    });

    return sorted.map(row => {
      const tyLeTong = row.nhapTong > 0 ? ((row.thayTong / row.nhapTong) * 100).toFixed(1) : '-';
      const tyLe1P = row.nhap1P > 0 ? ((row.thay1P / row.nhap1P) * 100).toFixed(1) : '-';
      const tyLe3P = row.nhap3P > 0 ? ((row.thay3P / row.nhap3P) * 100).toFixed(1) : '-';
      const tonLuyKe = cumulativeMap.get(row.date) ?? (row.nhapTong - row.thayTong);

      return {
        ...row,
        tyLeTong,
        tyLe1P,
        tyLe3P,
        tonLuyKe
      };
    });
  }, [nhapList, completedWithNormalizedDate]);

  // Bộ lọc bảng thống kê theo ngày
  const filteredDailyStats = useMemo(() => {
    const today = getTodayFormatted();
    const nowTime = Date.now();

    return dailyStats.filter(item => {
      // 1. Lọc preset
      if (dateRangePreset === 'today') {
        if (item.date !== today) return false;
      } else if (dateRangePreset === '7days') {
        const diffDays = (nowTime - item.rawDateSort) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (dateRangePreset === '30days') {
        const diffDays = (nowTime - item.rawDateSort) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) return false;
      }

      // 2. Lọc tùy chọn khoảng ngày
      if (filterStartDate) {
        const pStart = filterStartDate.split('/');
        if (pStart.length === 3) {
          const startT = new Date(parseInt(pStart[2]), parseInt(pStart[1]) - 1, parseInt(pStart[0])).getTime();
          if (item.rawDateSort < startT) return false;
        }
      }
      if (filterEndDate) {
        const pEnd = filterEndDate.split('/');
        if (pEnd.length === 3) {
          const endT = new Date(parseInt(pEnd[2]), parseInt(pEnd[1]) - 1, parseInt(pEnd[0]), 23, 59, 59).getTime();
          if (item.rawDateSort > endT) return false;
        }
      }

      // 3. Search text
      if (searchDailyText.trim()) {
        const q = searchDailyText.trim().toLowerCase();
        if (!item.date.includes(q)) return false;
      }

      return true;
    });
  }, [dailyStats, dateRangePreset, filterStartDate, filterEndDate, searchDailyText]);

  // Danh sách drill-down chi tiết khách hàng đã thay
  const drillDownCustomers = useMemo(() => {
    if (!selectedDrillDown) return [];
    const { date, category } = selectedDrillDown;

    return completedWithNormalizedDate.filter(c => {
      if (date && c.normDate !== date) return false;
      if (!category || category === 'all') return true;
      if (category === '1 Pha') return c.phaseGroup === '1 Pha';
      if (category === '3 Pha') return c.phaseGroup === '3 Pha';
      return c.phaseDetail === category;
    });
  }, [selectedDrillDown, completedWithNormalizedDate]);

  // ==========================================
  // XỬ LÝ LƯU / SỬA / XÓA ĐỢT NHẬP (NhapDK963)
  // ==========================================
  const handleSaveNhapEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    const dClean = formNgay.trim();
    if (!dClean) {
      showToast('error', 'Vui lòng nhập ngày nhận điện kế!');
      return;
    }

    const qty = parseInt(formSl.replace(/[^0-9]/g, ''), 10);
    if (!qty || qty <= 0) {
      showToast('error', 'Vui lòng nhập số lượng điện kế nhận lớn hơn 0!');
      return;
    }

    setIsSubmitting(true);
    try {
      const uName = sessionUser?.name || 'Nhân viên';

      if (editingId) {
        // Cập nhật
        const res = await DataStore.updateNhapDk963Entry(editingId, {
          ngay: dClean,
          chungLoai: formChungLoai,
          sl: qty,
          ghiChu: formGhiChu.trim(),
          nguoiNhap: uName
        });
        if (res.success) {
          showToast('success', `Đã cập nhật đợt nhập ngày ${dClean} (${formChungLoai}: ${qty} công tơ)`);
          setEditingId(null);
          setFormSl('');
          setFormGhiChu('');
        } else {
          showToast('error', res.error || 'Lỗi cập nhật');
        }
      } else {
        // Kiểm tra xem đã có bản ghi cùng ngày và cùng chủng loại chưa
        const existing = nhapList.find(
          item => (item.ngay || '').trim() === dClean && (item.chungLoai || '').trim().toLowerCase() === formChungLoai.toLowerCase()
        );

        if (existing && existing.sl === qty && (!formGhiChu.trim() || existing.ghiChu === formGhiChu.trim())) {
          showToast('info', `Đợt nhập ngày ${dClean} (${formChungLoai}: ${qty} công tơ) đã tồn tại trong hệ thống.`);
          setFormSl('');
          setFormGhiChu('');
          setIsSubmitting(false);
          return;
        }

        // Thêm mới hoặc cập nhật vào dòng đã có
        const res = await DataStore.addNhapDk963Entry({
          ngay: dClean,
          chungLoai: formChungLoai,
          sl: qty,
          ghiChu: formGhiChu.trim(),
          nguoiNhap: uName
        });
        if (res.success) {
          if (existing) {
            showToast('success', `Đã cập nhật số lượng đợt nhập ngày ${dClean} (${formChungLoai}: ${qty} công tơ) vào sheet NhapDK963`);
          } else {
            showToast('success', `Đã lưu đợt nhập ngày ${dClean} (${formChungLoai}: ${qty} công tơ) vào sheet NhapDK963`);
          }
          setFormSl('');
          setFormGhiChu('');
        } else {
          showToast('error', res.error || 'Lỗi thêm mới');
        }
      }
    } catch (err: any) {
      showToast('error', 'Lỗi: ' + (err?.message || 'Có sự cố xảy ra'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEntry = (item: NhapDk963Entry) => {
    setEditingId(item.id);
    setFormNgay(item.ngay);
    setFormChungLoai(resolveNhapCategory(item.chungLoai));
    setFormSl(String(item.sl));
    setFormGhiChu(item.ghiChu || '');
    setShowInputSection(true);
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  const handleDeleteEntry = async (id: string, date: string, cl: string, sl: number) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa đợt nhập ngày ${date} (${cl}: ${sl} công tơ)?`)) return;

    try {
      const res = await DataStore.deleteNhapDk963Entry(id);
      if (res.success) {
        showToast('info', `Đã xóa đợt nhập ngày ${date}`);
        if (editingId === id) {
          setEditingId(null);
          setFormSl('');
          setFormGhiChu('');
        }
      } else {
        showToast('error', res.error || 'Lỗi xóa đợt nhập');
      }
    } catch (err: any) {
      showToast('error', 'Lỗi: ' + (err?.message || 'Có sự cố'));
    }
  };

  // ==========================================
  // XUẤT EXCEL
  // ==========================================
  // 1. Xuất Excel bảng thống kê theo ngày (4 chủng loại)
  const handleExportDailyExcel = () => {
    try {
      const exportRows = filteredDailyStats.map((r, idx) => ({
        'STT': idx + 1,
        'Ngày': r.date,
        '1P Trực Tiếp - Nhập': r.nhap1PTT,
        '1P Gián Tiếp - Nhập': r.nhap1PGT,
        '1 Pha - Tổng Nhập': r.nhap1P,
        '1P Trực Tiếp - Đã Thay': r.thay1PTT,
        '1P Gián Tiếp - Đã Thay': r.thay1PGT,
        '1 Pha - Tổng Đã Thay': r.thay1P,
        '1 Pha - % Thay/Nhập': r.tyLe1P !== '-' ? `${r.tyLe1P}%` : '-',
        '3P Trực Tiếp - Nhập': r.nhap3PTT,
        '3P Gián Tiếp - Nhập': r.nhap3PGT,
        '3 Pha - Tổng Nhập': r.nhap3P,
        '3P Trực Tiếp - Đã Thay': r.thay3PTT,
        '3P Gián Tiếp - Đã Thay': r.thay3PGT,
        '3 Pha - Tổng Đã Thay': r.thay3P,
        '3 Pha - % Thay/Nhập': r.tyLe3P !== '-' ? `${r.tyLe3P}%` : '-',
        'Tổng Nhập Ngày': r.nhapTong,
        'Tổng Đã Thay Ngày': r.thayTong,
        'Tỷ Lệ Hoàn Tất Ngày': r.tyLeTong !== '-' ? `${r.tyLeTong}%` : '-',
        'Tồn Luỹ Kế Đến Ngày': r.tonLuyKe
      }));

      // Dòng tổng kết
      const sumNhap1PTT = filteredDailyStats.reduce((s, r) => s + r.nhap1PTT, 0);
      const sumNhap1PGT = filteredDailyStats.reduce((s, r) => s + r.nhap1PGT, 0);
      const sumNhap1P = filteredDailyStats.reduce((s, r) => s + r.nhap1P, 0);
      const sumThay1PTT = filteredDailyStats.reduce((s, r) => s + r.thay1PTT, 0);
      const sumThay1PGT = filteredDailyStats.reduce((s, r) => s + r.thay1PGT, 0);
      const sumThay1P = filteredDailyStats.reduce((s, r) => s + r.thay1P, 0);

      const sumNhap3PTT = filteredDailyStats.reduce((s, r) => s + r.nhap3PTT, 0);
      const sumNhap3PGT = filteredDailyStats.reduce((s, r) => s + r.nhap3PGT, 0);
      const sumNhap3P = filteredDailyStats.reduce((s, r) => s + r.nhap3P, 0);
      const sumThay3PTT = filteredDailyStats.reduce((s, r) => s + r.thay3PTT, 0);
      const sumThay3PGT = filteredDailyStats.reduce((s, r) => s + r.thay3PGT, 0);
      const sumThay3P = filteredDailyStats.reduce((s, r) => s + r.thay3P, 0);

      const sumNhapTong = filteredDailyStats.reduce((s, r) => s + r.nhapTong, 0);
      const sumThayTong = filteredDailyStats.reduce((s, r) => s + r.thayTong, 0);

      exportRows.push({
        'STT': 'TỔNG CỘNG' as any,
        'Ngày': '',
        '1P Trực Tiếp - Nhập': sumNhap1PTT,
        '1P Gián Tiếp - Nhập': sumNhap1PGT,
        '1 Pha - Tổng Nhập': sumNhap1P,
        '1P Trực Tiếp - Đã Thay': sumThay1PTT,
        '1P Gián Tiếp - Đã Thay': sumThay1PGT,
        '1 Pha - Tổng Đã Thay': sumThay1P,
        '1 Pha - % Thay/Nhập': sumNhap1P > 0 ? `${((sumThay1P / sumNhap1P) * 100).toFixed(1)}%` : '-',
        '3P Trực Tiếp - Nhập': sumNhap3PTT,
        '3P Gián Tiếp - Nhập': sumNhap3PGT,
        '3 Pha - Tổng Nhập': sumNhap3P,
        '3P Trực Tiếp - Đã Thay': sumThay3PTT,
        '3P Gián Tiếp - Đã Thay': sumThay3PGT,
        '3 Pha - Tổng Đã Thay': sumThay3P,
        '3 Pha - % Thay/Nhập': sumNhap3P > 0 ? `${((sumThay3P / sumNhap3P) * 100).toFixed(1)}%` : '-',
        'Tổng Nhập Ngày': sumNhapTong,
        'Tổng Đã Thay Ngày': sumThayTong,
        'Tỷ Lệ Hoàn Tất Ngày': sumNhapTong > 0 ? `${((sumThayTong / sumNhapTong) * 100).toFixed(1)}%` : '-',
        'Tồn Luỹ Kế Đến Ngày': sumNhapTong - sumThayTong
      });

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ThongKe_DienKe_TheoNgay');
      XLSX.writeFile(wb, `BaoCao_ThongKe_DienKe_963_${getTodayFormatted().replace(/\//g, '-')}.xlsx`);
      showToast('success', 'Đã xuất file Excel thống kê điện kế 4 chủng loại theo ngày thành công!');
    } catch (err: any) {
      showToast('error', 'Lỗi xuất Excel: ' + (err?.message || 'Có sự cố'));
    }
  };

  // 2. Xuất Excel danh sách các đợt nhập (Sheet NhapDK963)
  const handleExportNhapListExcel = () => {
    try {
      const rows = nhapList.map((item, idx) => ({
        'STT': idx + 1,
        'Ngày Nhận (Ngay)': item.ngay,
        'Chủng Loại (ChungLoai)': item.chungLoai,
        'Số Lượng (SL)': item.sl,
        'Ghi Chú': item.ghiChu || '',
        'Người Nhập': item.nguoiNhap || ''
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'NhapDK963');
      XLSX.writeFile(wb, `DanhSach_NhapDK963_${getTodayFormatted().replace(/\//g, '-')}.xlsx`);
      showToast('success', 'Đã xuất file Excel danh sách đợt nhập!');
    } catch (err: any) {
      showToast('error', 'Lỗi xuất Excel: ' + (err?.message || 'Có sự cố'));
    }
  };

  // 3. Xuất Excel danh sách chi tiết khách hàng drill-down
  const handleExportDrillDownExcel = () => {
    if (drillDownCustomers.length === 0) {
      showToast('info', 'Không có khách hàng nào để xuất');
      return;
    }
    try {
      const rows = drillDownCustomers.map((c, idx) => ({
        'STT': idx + 1,
        'Mã KH': c.maKh,
        'Tên Khách Hàng': c.tenKh,
        'Địa Chỉ': c.diaChi,
        'Khu Vực': c.kv,
        'Đợt': c.dot,
        'Số Pha (SO_PHA)': c.soPha || '',
        'Phiên (PHIEN)': c.phien || '',
        'Phân Loại (4 Loại)': c.phaseDetail,
        'Nhóm Pha': c.phaseGroup,
        'Loại Công Tơ': c.loaiCto || '',
        'Chủng Loại Cần Thay': c.chungLoaiCanThay || '',
        'HSN': c.hsn || '',
        'NV Thay': c.nv || '',
        'Ngày Giờ Thay': c.ngayGio || '',
        'Ngày Chuẩn Hóa': c.normDate,
        'Kết Quả': c.ketQua || 'Xong'
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ChiTiet_KH_DaThay');
      XLSX.writeFile(wb, `DS_KH_DaThay_${selectedDrillDown?.label || 'ChiTiet'}.xlsx`);
      showToast('success', `Đã xuất ${rows.length} khách hàng ra file Excel!`);
    } catch (err: any) {
      showToast('error', 'Lỗi xuất Excel: ' + (err?.message || 'Có sự cố'));
    }
  };

  if (!canAccess) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">
          Không Đủ Quyền Truy Cập Quản Lý Điện Kế
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Chức năng Quản lý Điện Kế (Tab 3 QĐ 963) không cho phép tài khoản nhân viên sử dụng, chỉ cho phép từ cấp <b>Tổ phó, Tổ trưởng trở lên</b> theo cấu hình phân quyền trong tab <b>Hệ thống</b>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* HEADER QUẢN LÝ ĐIỆN KẾ */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <span>Theo Dõi Nhập & Thay Điện Kế (QĐ 963)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                Sheet: NhapDK963
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi số lượng điện kế 1 Pha, 3 Pha đã nhận về kho và tiến độ đã thay xong trên lưới
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReloadFromSheet}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Đồng bộ dữ liệu đợt nhập mới nhất từ Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
            <span>{isRefreshing ? 'Đang đồng bộ...' : 'Đồng Bộ Sheet'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportDailyExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Xuất bảng thống kê theo ngày ra file Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Báo Cáo Excel</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4 KHỐI KPI TỔNG HỢP TOÀN BỘ */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: TỔNG ĐÃ NHẬP */}
        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-200/80 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
                Tổng Điện Kế Đã Nhập
              </span>
              <div className="text-2xl font-black text-indigo-950 mt-1">
                {kpiTotals.nhapTong.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-500">công tơ</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-indigo-100 text-[11px] space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>• 1 Pha:</span>
              <span className="font-bold text-slate-800">
                {kpiTotals.nhap1P.toLocaleString('vi-VN')}{' '}
                <span className="font-normal text-[10px] text-slate-500">
                  (TT: {kpiTotals.nhap1PTT} | GT: {kpiTotals.nhap1PGT})
                </span>
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>• 3 Pha:</span>
              <span className="font-bold text-slate-800">
                {kpiTotals.nhap3P.toLocaleString('vi-VN')}{' '}
                <span className="font-normal text-[10px] text-slate-500">
                  (TT: {kpiTotals.nhap3PTT} | GT: {kpiTotals.nhap3PGT})
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: TỔNG ĐÃ THAY XONG */}
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-200/80 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                Tổng Đã Thay Xong (963)
              </span>
              <div className="text-2xl font-black text-emerald-950 mt-1">
                {kpiTotals.thayTong.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-500">công tơ</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-emerald-100 text-[11px] space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>• 1 Pha:</span>
              <span className="font-bold text-slate-800">
                {kpiTotals.thay1P.toLocaleString('vi-VN')}{' '}
                <span className="font-normal text-[10px] text-slate-500">
                  (TT: {kpiTotals.thay1PTT} | GT: {kpiTotals.thay1PGT})
                </span>
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>• 3 Pha:</span>
              <span className="font-bold text-slate-800">
                {kpiTotals.thay3P.toLocaleString('vi-VN')}{' '}
                <span className="font-normal text-[10px] text-slate-500">
                  (TT: {kpiTotals.thay3PTT} | GT: {kpiTotals.thay3PGT})
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: TỶ LỆ HOÀN TẤT (%) */}
        <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-200/80 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                Tỷ Lệ Đã Thay / Nhập
              </span>
              <div className="text-2xl font-black text-amber-950 mt-1">
                {kpiTotals.tyLeTong}%
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden border border-slate-200">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, parseFloat(kpiTotals.tyLeTong) || 0))}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] space-y-0.5 text-slate-500 font-medium">
            <div className="flex justify-between">
              <span>1 Pha: <b>{kpiTotals.tyLe1P}%</b> <span className="text-[9px]">(TT: {kpiTotals.tyLe1PTT}% | GT: {kpiTotals.tyLe1PGT}%)</span></span>
            </div>
            <div className="flex justify-between">
              <span>3 Pha: <b>{kpiTotals.tyLe3P}%</b> <span className="text-[9px]">(TT: {kpiTotals.tyLe3PTT}% | GT: {kpiTotals.tyLe3PGT}%)</span></span>
            </div>
          </div>
        </div>

        {/* KPI 4: TỒN CHƯA THAY */}
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-200/80 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                Tồn Kho Chưa Thay
              </span>
              <div className="text-2xl font-black text-purple-950 mt-1">
                {kpiTotals.tonTong.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-500">công tơ</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-purple-100 text-[11px] space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>• 1 Pha tồn:</span>
              <span className={`font-bold ${kpiTotals.ton1P < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {kpiTotals.ton1P.toLocaleString('vi-VN')}{' '}
                <span className="font-normal text-[10px] text-slate-500">
                  (TT: {kpiTotals.ton1PTT} | GT: {kpiTotals.ton1PGT})
                </span>
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>• 3 Pha tồn:</span>
              <span className={`font-bold ${kpiTotals.ton3P < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {kpiTotals.ton3P.toLocaleString('vi-VN')}{' '}
                <span className="font-normal text-[10px] text-slate-500">
                  (TT: {kpiTotals.ton3PTT} | GT: {kpiTotals.ton3PGT})
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* KHỐI 1: FORM NHẬP THÊM SỐ LƯỢNG ĐIỆN KẾ (Sheet NhapDK963) */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-700" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-950">
              {editingId ? 'Chỉnh Sửa Đợt Nhập Điện Kế' : 'Nhập Thêm Số Lượng Điện Kế Đã Nhận (Lưu Sheet NhapDK963)'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowInputSection(!showInputSection)}
            className="text-xs text-amber-900 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{showInputSection ? 'Thu gọn' : 'Bung ra'}</span>
            {showInputSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showInputSection && (
          <form onSubmit={handleSaveNhapEntry} className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CỘT 1: NGÀY NHẬN */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Ngày Nhận (dd/mm/yyyy):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormNgay(getTodayFormatted())}
                    className="text-[10px] text-amber-700 hover:underline font-semibold"
                  >
                    Hôm nay
                  </button>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formNgay}
                    onChange={(e) => setFormNgay(e.target.value)}
                    placeholder="dd/mm/yyyy (ví dụ: 08/11/2026)"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-semibold text-slate-800 bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Mặc định là ngày hiện tại, có thể hiệu chỉnh theo ngày thực tế nhận điện kế.
                </p>
              </div>

              {/* CỘT 2: CHỦNG LOẠI ĐIỆN KẾ */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-amber-600" />
                  <span>Chủng Loại Điện Kế:</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['1 Pha Trực Tiếp', '1 Pha Gián Tiếp', '3 Pha Trực Tiếp', '3 Pha Gián Tiếp'] as const).map((cl) => (
                    <button
                      key={cl}
                      type="button"
                      onClick={() => setFormChungLoai(cl)}
                      className={`px-2 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center leading-snug ${
                        formChungLoai === cl
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cl}
                    </button>
                  ))}
                </div>
              </div>

              {/* CỘT 3: SỐ LƯỢNG (SL) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-amber-600" />
                    <span>Số Lượng Nhập (SL):</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Đơn vị: công tơ</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formSl}
                    onChange={(e) => setFormSl(e.target.value)}
                    placeholder="Nhập số lượng (vd: 50, 100...)"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-black text-slate-900 bg-white"
                  />
                  {/* Nút cộng nhanh */}
                  <div className="flex gap-1 shrink-0">
                    {[10, 50, 100].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => {
                          const cur = parseInt(formSl || '0', 10);
                          setFormSl(String(cur + inc));
                        }}
                        className="px-2 py-2 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                        title={`Thêm ${inc}`}
                      >
                        +{inc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* HÀNG GHI CHÚ VÀ NÚT SUBMIT */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <input
                type="text"
                value={formGhiChu}
                onChange={(e) => setFormGhiChu(e.target.value)}
                placeholder="Ghi chú đợt nhận (tùy chọn: Đợt 1 từ kho Công ty, bổ sung thay đợt 2...)"
                className="w-full sm:flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs text-slate-700 bg-slate-50/50"
              />

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setFormSl('');
                      setFormGhiChu('');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Hủy sửa
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSubmitting 
                      ? 'Đang lưu vào Sheet...' 
                      : (editingId ? 'Cập Nhật Đợt Nhập' : 'Lưu Đợt Nhập Vào Sheet NhapDK963')}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* ========================================================= */}
      {/* KHỐI 2: BẢNG DANH SÁCH CÁC ĐỢT NHẬP (Lịch Sử NhapDK963) */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-600" />
            <span className="font-bold text-slate-800 uppercase tracking-tight">
              Lịch Sử Các Đợt Nhận Điện Kế ({nhapList.length} đợt — Tổng {kpiTotals.nhapTong.toLocaleString('vi-VN')} công tơ)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportNhapListExcel}
              className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <Download className="w-3 h-3" />
              <span>Xuất Excel Đợt Nhập</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNhapListTable(!showNhapListTable)}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>{showNhapListTable ? 'Ẩn' : 'Hiện'}</span>
              {showNhapListTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {showNhapListTable && (
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b border-slate-200 z-10 text-[11px]">
                <tr>
                  <th className="p-2.5 w-12 text-center">STT</th>
                  <th className="p-2.5">Ngày Nhận (Ngay)</th>
                  <th className="p-2.5">Chủng Loại (ChungLoai)</th>
                  <th className="p-2.5 text-right">Số Lượng (SL)</th>
                  <th className="p-2.5">Ghi Chú</th>
                  <th className="p-2.5">Người Nhập</th>
                  <th className="p-2.5 text-center w-24">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {nhapList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                      Chưa có dữ liệu đợt nhận điện kế nào trong sheet NhapDK963. Hãy nhập thêm ở biểu mẫu phía trên!
                    </td>
                  </tr>
                ) : (
                  nhapList.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-amber-50/40 transition-colors">
                      <td className="p-2.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-amber-600" />
                        <span>{item.ngay}</span>
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                          item.chungLoai.includes('1') 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {item.chungLoai}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-black text-slate-900 text-sm">
                        {Number(item.sl).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-2.5 text-slate-500 max-w-xs truncate" title={item.ghiChu}>
                        {item.ghiChu || '-'}
                      </td>
                      <td className="p-2.5 text-slate-600 text-[11px]">
                        {item.nguoiNhap || '-'}
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditEntry(item)}
                            className="p-1 hover:bg-amber-100 rounded text-amber-700 transition-colors cursor-pointer"
                            title="Sửa đợt nhập"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(item.id, item.ngay, item.chungLoai, item.sl)}
                            className="p-1 hover:bg-rose-100 rounded text-rose-600 transition-colors cursor-pointer"
                            title="Xóa đợt nhập"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* KHỐI 3: BẢNG BÁO CÁO THỐNG KÊ ĐÃ NHẬP & ĐÃ THAY XONG THEO NGÀY */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
        {/* Tiêu đề & Bộ lọc */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-tight">
                Bảng Thống Kê Số Lượng & Tỷ Lệ % Đã Nhập & Đã Thay Xong Theo Ngày
              </h3>
              <p className="text-[11px] text-slate-500">
                So khớp số lượng nhập (Sheet NhapDK963) và số lượng đã thay xong (Sheet 963 — cột SO_PHA & NgayGio)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Presets */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              {(
                [
                  { id: 'all', label: 'Tất cả' },
                  { id: 'today', label: 'Hôm nay' },
                  { id: '7days', label: '7 ngày qua' },
                  { id: '30days', label: '30 ngày' }
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDateRangePreset(p.id)}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    dateRangePreset === p.id
                      ? 'bg-white text-amber-950 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Tìm kiếm ngày */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchDailyText}
                onChange={(e) => setSearchDailyText(e.target.value)}
                placeholder="Tìm ngày (vd: 08/11)..."
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 w-36"
              />
            </div>
          </div>
        </div>

        {/* Bảng dữ liệu theo ngày */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Header Tầng 1: Nhóm cột */}
              <tr className="bg-slate-800 text-white font-bold text-center text-[11px]">
                <th rowSpan={2} className="p-2.5 border-r border-slate-700 w-12">STT</th>
                <th rowSpan={2} className="p-2.5 border-r border-slate-700 min-w-[105px]">Ngày Thực Hiện</th>
                <th colSpan={5} className="p-2 border-r border-slate-700 bg-blue-950 text-blue-100">
                  ĐIỆN KẾ 1 PHA (SO_PHA = 1)
                </th>
                <th colSpan={5} className="p-2 border-r border-slate-700 bg-purple-950 text-purple-100">
                  ĐIỆN KẾ 3 PHA (SO_PHA = 3)
                </th>
                <th colSpan={3} className="p-2 border-r border-slate-700 bg-amber-950 text-amber-100">
                  TỔNG CỘNG TRONG NGÀY
                </th>
                <th rowSpan={2} className="p-2.5 border-r border-slate-700 min-w-[90px] bg-slate-900">
                  Tồn Luỹ Kế
                </th>
                <th rowSpan={2} className="p-2.5 text-center w-28">
                  Xem Chi Tiết
                </th>
              </tr>
              {/* Header Tầng 2: Chi tiết từng nhóm 4 loại */}
              <tr className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider text-center border-b border-slate-300">
                {/* 1 Pha */}
                <th className="p-2 border-r border-slate-200 text-right bg-blue-50/70" title="1 Pha Trực Tiếp - Đã Nhập">Nhập TT</th>
                <th className="p-2 border-r border-slate-200 text-right bg-blue-50/70" title="1 Pha Gián Tiếp - Đã Nhập">Nhập GT</th>
                <th className="p-2 border-r border-slate-200 text-right bg-blue-50/70 text-emerald-800" title="1 Pha Trực Tiếp - Đã Thay">Thay TT</th>
                <th className="p-2 border-r border-slate-200 text-right bg-blue-50/70 text-emerald-800" title="1 Pha Gián Tiếp - Đã Thay">Thay GT</th>
                <th className="p-2 border-r border-slate-200 bg-blue-50/70">% 1 Pha</th>
                {/* 3 Pha */}
                <th className="p-2 border-r border-slate-200 text-right bg-purple-50/70" title="3 Pha Trực Tiếp - Đã Nhập">Nhập TT</th>
                <th className="p-2 border-r border-slate-200 text-right bg-purple-50/70" title="3 Pha Gián Tiếp - Đã Nhập">Nhập GT</th>
                <th className="p-2 border-r border-slate-200 text-right bg-purple-50/70 text-emerald-800" title="3 Pha Trực Tiếp - Đã Thay">Thay TT</th>
                <th className="p-2 border-r border-slate-200 text-right bg-purple-50/70 text-emerald-800" title="3 Pha Gián Tiếp - Đã Thay">Thay GT</th>
                <th className="p-2 border-r border-slate-200 bg-purple-50/70">% 3 Pha</th>
                {/* Tổng ngày */}
                <th className="p-2 border-r border-slate-200 text-right bg-amber-50/70">Tổng Nhập</th>
                <th className="p-2 border-r border-slate-200 text-right bg-amber-50/70">Tổng Thay</th>
                <th className="p-2 border-r border-slate-200 bg-amber-50/70">% Ngày</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredDailyStats.length === 0 ? (
                <tr>
                  <td colSpan={17} className="p-8 text-center text-slate-400 italic">
                    Không tìm thấy dữ liệu thống kê nào phù hợp với bộ lọc ngày hiện tại.
                  </td>
                </tr>
              ) : (
                filteredDailyStats.map((row, idx) => (
                  <tr 
                    key={row.date} 
                    className={`transition-colors hover:bg-amber-50/50 ${
                      selectedDrillDown?.date === row.date ? 'bg-amber-100/60 font-semibold' : ''
                    }`}
                  >
                    <td className="p-2.5 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="p-2.5 font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">
                      {row.date}
                    </td>

                    {/* 1 Pha */}
                    <td className="p-2.5 text-right font-semibold text-slate-700 border-r border-slate-100 bg-blue-50/20">
                      {row.nhap1PTT > 0 ? row.nhap1PTT.toLocaleString('vi-VN') : '-'}
                    </td>
                    <td className="p-2.5 text-right font-semibold text-slate-700 border-r border-slate-100 bg-blue-50/20">
                      {row.nhap1PGT > 0 ? row.nhap1PGT.toLocaleString('vi-VN') : '-'}
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-700 border-r border-slate-100 bg-blue-50/20">
                      {row.thay1PTT > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDrillDown({
                            date: row.date,
                            category: '1 Pha Trực Tiếp',
                            label: `1 Pha Trực Tiếp ngày ${row.date}`
                          })}
                          className="hover:underline font-black text-emerald-700 cursor-pointer"
                          title="Bấm để xem danh sách khách hàng 1 Pha Trực Tiếp đã thay ngày này"
                        >
                          {row.thay1PTT.toLocaleString('vi-VN')}
                        </button>
                      ) : '-'}
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-700 border-r border-slate-100 bg-blue-50/20">
                      {row.thay1PGT > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDrillDown({
                            date: row.date,
                            category: '1 Pha Gián Tiếp',
                            label: `1 Pha Gián Tiếp ngày ${row.date}`
                          })}
                          className="hover:underline font-black text-emerald-700 cursor-pointer"
                          title="Bấm để xem danh sách khách hàng 1 Pha Gián Tiếp đã thay ngày này"
                        >
                          {row.thay1PGT.toLocaleString('vi-VN')}
                        </button>
                      ) : '-'}
                    </td>
                    <td className="p-2.5 text-center font-bold text-slate-600 border-r border-slate-100 bg-blue-50/20">
                      {row.tyLe1P !== '-' ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          parseFloat(row.tyLe1P) >= 100 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {row.tyLe1P}%
                        </span>
                      ) : '-'}
                    </td>

                    {/* 3 Pha */}
                    <td className="p-2.5 text-right font-semibold text-slate-700 border-r border-slate-100 bg-purple-50/20">
                      {row.nhap3PTT > 0 ? row.nhap3PTT.toLocaleString('vi-VN') : '-'}
                    </td>
                    <td className="p-2.5 text-right font-semibold text-slate-700 border-r border-slate-100 bg-purple-50/20">
                      {row.nhap3PGT > 0 ? row.nhap3PGT.toLocaleString('vi-VN') : '-'}
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-700 border-r border-slate-100 bg-purple-50/20">
                      {row.thay3PTT > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDrillDown({
                            date: row.date,
                            category: '3 Pha Trực Tiếp',
                            label: `3 Pha Trực Tiếp ngày ${row.date}`
                          })}
                          className="hover:underline font-black text-emerald-700 cursor-pointer"
                          title="Bấm để xem danh sách khách hàng 3 Pha Trực Tiếp đã thay ngày này"
                        >
                          {row.thay3PTT.toLocaleString('vi-VN')}
                        </button>
                      ) : '-'}
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-700 border-r border-slate-100 bg-purple-50/20">
                      {row.thay3PGT > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDrillDown({
                            date: row.date,
                            category: '3 Pha Gián Tiếp',
                            label: `3 Pha Gián Tiếp ngày ${row.date}`
                          })}
                          className="hover:underline font-black text-emerald-700 cursor-pointer"
                          title="Bấm để xem danh sách khách hàng 3 Pha Gián Tiếp đã thay ngày này"
                        >
                          {row.thay3PGT.toLocaleString('vi-VN')}
                        </button>
                      ) : '-'}
                    </td>
                    <td className="p-2.5 text-center font-bold text-slate-600 border-r border-slate-100 bg-purple-50/20">
                      {row.tyLe3P !== '-' ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          parseFloat(row.tyLe3P) >= 100 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {row.tyLe3P}%
                        </span>
                      ) : '-'}
                    </td>

                    {/* Tổng ngày */}
                    <td className="p-2.5 text-right font-black text-slate-800 border-r border-slate-100 bg-amber-50/20">
                      {row.nhapTong > 0 ? row.nhapTong.toLocaleString('vi-VN') : '-'}
                    </td>
                    <td className="p-2.5 text-right font-black text-emerald-800 border-r border-slate-100 bg-amber-50/20">
                      {row.thayTong > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDrillDown({
                            date: row.date,
                            category: 'all',
                            label: `tất cả công tơ ngày ${row.date}`
                          })}
                          className="hover:underline cursor-pointer"
                          title="Bấm để xem danh sách khách hàng đã thay trong ngày này"
                        >
                          {row.thayTong.toLocaleString('vi-VN')}
                        </button>
                      ) : '-'}
                    </td>
                    <td className="p-2.5 text-center font-black border-r border-slate-100 bg-amber-50/20">
                      {row.tyLeTong !== '-' ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          parseFloat(row.tyLeTong) >= 100 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {row.tyLeTong}%
                        </span>
                      ) : '-'}
                    </td>

                    {/* Tồn luỹ kế */}
                    <td className={`p-2.5 text-right font-black border-r border-slate-100 ${
                      row.tonLuyKe < 0 ? 'text-rose-600' : 'text-slate-800'
                    }`}>
                      {row.tonLuyKe.toLocaleString('vi-VN')}
                    </td>

                    {/* Thao tác xem chi tiết */}
                    <td className="p-2.5 text-center">
                      {row.thayTong > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDrillDown({
                            date: row.date,
                            category: 'all',
                            label: `ngày ${row.date}`
                          })}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-md transition-colors cursor-pointer border border-indigo-200"
                        >
                          Xem {row.thayTong} KH
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Dòng Tổng Cộng Footer */}
            {filteredDailyStats.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-bold text-xs">
                <tr>
                  <td colSpan={2} className="p-3 text-center uppercase tracking-wide border-r border-slate-700">
                    TỔNG CỘNG ({filteredDailyStats.length} Ngày)
                  </td>
                  {/* 1 Pha */}
                  <td className="p-3 text-right border-r border-slate-700 font-black">
                    {filteredDailyStats.reduce((s, r) => s + r.nhap1PTT, 0).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 text-right border-r border-slate-700 font-black">
                    {filteredDailyStats.reduce((s, r) => s + r.nhap1PGT, 0).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 text-right border-r border-slate-700 font-black text-emerald-400">
                    {filteredDailyStats.reduce((s, r) => s + r.thay1PTT, 0).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 text-right border-r border-slate-700 font-black text-emerald-400">
                    {filteredDailyStats.reduce((s, r) => s + r.thay1PGT, 0).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 text-center border-r border-slate-700 font-bold text-amber-300">
                    {kpiTotals.tyLe1P}%
                  </td>
                  {/* 3 Pha */}
                  <td className="p-3 text-right border-r border-slate-700 font-black">
                    {filteredDailyStats.reduce((s, r) => s + r.nhap3PTT, 0).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 text-right border-r border-slate-700 font-black">
                    {filteredDailyStats.reduce((s, r) => s + r.nhap3PGT, 0).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 text-right border-r border-slate-700 font-black text-emerald-400">
                    {filteredDailyStats.reduce((s, r) => s + r.thay3PTT, 0).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 text-right border-r border-slate-700 font-black text-emerald-400">
                    {filteredDailyStats.reduce((s, r) => s + r.thay3PGT, 0).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 text-center border-r border-slate-700 font-bold text-amber-300">
                    {kpiTotals.tyLe3P}%
                  </td>
                  {/* Tổng Ngày */}
                  <td className="p-3 text-right border-r border-slate-700 font-black text-amber-300 text-sm">
                    {filteredDailyStats.reduce((s, r) => s + r.nhapTong, 0).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 text-right border-r border-slate-700 font-black text-emerald-300 text-sm">
                    {filteredDailyStats.reduce((s, r) => s + r.thayTong, 0).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 text-center border-r border-slate-700 font-black text-amber-300">
                    {kpiTotals.tyLeTong}%
                  </td>
                  {/* Tồn */}
                  <td className="p-3 text-right border-r border-slate-700 font-black text-purple-300">
                    {kpiTotals.tonTong.toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedDrillDown({
                        date: undefined,
                        category: 'all',
                        label: 'toàn bộ khách hàng đã thay xong'
                      })}
                      className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] rounded-md transition-all cursor-pointer"
                    >
                      Xem Tất Cả
                    </button>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* KHỐI 4: BẢNG DANH SÁCH CHI TIẾT KHÁCH HÀNG ĐÃ THAY XONG (DRILL-DOWN) */}
      {/* ========================================================= */}
      {selectedDrillDown && (
        <div className="bg-white rounded-2xl border-2 border-indigo-300 shadow-md p-4 space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wide text-indigo-950">
                  Danh Sách Khách Hàng Đã Thay Xong — {selectedDrillDown.label}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Số lượng: <b>{drillDownCustomers.length}</b> khách hàng
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportDrillDownExcel}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel ({drillDownCustomers.length} KH)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDrillDown(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Đóng bảng</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[350px] rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10 text-[11px]">
                <tr>
                  <th className="p-2.5 w-12 text-center">STT</th>
                  <th className="p-2.5">Mã KH</th>
                  <th className="p-2.5">Tên Khách Hàng</th>
                  <th className="p-2.5">Địa Chỉ</th>
                  <th className="p-2.5 text-center">KV</th>
                  <th className="p-2.5 text-center">Đợt</th>
                  <th className="p-2.5 text-center" title="Cột So_pha trong sheet 963">Số Pha (So_pha)</th>
                  <th className="p-2.5 text-center" title="Cột Phien trong sheet 963: TT = Trực tiếp, GT = Gián tiếp">Phiên (Phien)</th>
                  <th className="p-2.5 text-center">Phân Loại (4 Loại)</th>
                  <th className="p-2.5">Chủng Loại Cần Thay</th>
                  <th className="p-2.5 text-center">HSN</th>
                  <th className="p-2.5">Người Thay</th>
                  <th className="p-2.5">Ngày Giờ Thay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {drillDownCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-6 text-center text-slate-400 italic">
                      Không có khách hàng nào trong nhóm này.
                    </td>
                  </tr>
                ) : (
                  drillDownCustomers.map((c, idx) => (
                    <tr key={c.maKh || idx} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="p-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-2 font-mono font-bold text-indigo-700">{c.maKh}</td>
                      <td className="p-2 font-bold text-slate-800">{c.tenKh}</td>
                      <td className="p-2 text-slate-500 max-w-xs truncate" title={c.diaChi}>{c.diaChi}</td>
                      <td className="p-2 text-center font-bold text-slate-600">{c.kv}</td>
                      <td className="p-2 text-center font-bold text-amber-700">Đ{c.dot}</td>
                      <td className="p-2 text-center font-mono font-bold text-slate-700">
                        {c.soPha || (c.phaseGroup === '3 Pha' ? '3' : '1')}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (c.phien || '').toUpperCase() === 'GT' || c.phaseDetail.includes('Gián Tiếp')
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                        }`}>
                          {c.phien ? c.phien.toUpperCase() : (c.phaseDetail.includes('Gián Tiếp') ? 'GT' : 'TT')}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.phaseDetail.includes('3 Pha')
                            ? 'bg-purple-100 text-purple-900'
                            : 'bg-blue-100 text-blue-900'
                        }`}>
                          {c.phaseDetail}
                        </span>
                      </td>
                      <td className="p-2 font-bold text-slate-700">{c.chungLoaiCanThay || c.loaiCto || '-'}</td>
                      <td className="p-2 text-center font-mono font-semibold">{c.hsn || 1}</td>
                      <td className="p-2 text-slate-700 font-medium">{c.nv || '-'}</td>
                      <td className="p-2 text-slate-600 font-mono text-[11px]">{c.ngayGio || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
