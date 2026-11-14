import React, { useState, useMemo, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx-js-style';
import {
  Calendar, FileSpreadsheet, RotateCcw, ChevronLeft, ChevronRight,
  Copy, Check, Eye, EyeOff, ClipboardList, Sparkles, Info,
  Save, RefreshCw, Lock
} from 'lucide-react';
import { DataStore, Entry963, KhTuanEntry, SheetMember } from '../store/DataStore';
import { resolvePhaseCategory, normalizeDateStr } from './Tab963DienKe';

interface Tab963BaoCaoNgayProps {
  entries963: Entry963[];
  sessionUser?: SheetMember | null;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

interface FourColCounts {
  p1tt: number;
  p1gt: number;
  p3tt: number;
  p3gt: number;
}

type PlanStorageMap = Record<string, FourColCounts>; // key: YYYY-MM-DD

const PLAN_STORAGE_KEY = 'tab963_bao_cao_ngay_plans_v1';

// Dòng 2 cố định không thay đổi trong suốt quá trình báo cáo (tính đến 12/11/2026)
const FIXED_BASELINE_12_11: FourColCounts = {
  p1tt: 129,
  p1gt: 5,
  p3tt: 106,
  p3gt: 160
};
const FIXED_BASELINE_LABEL = 'Tính đến 12/11';
const FIXED_BASELINE_GUIDE = 'Dòng này fix không thay đổi';
const START_DAILY_TRACKING_NUM = 20261113; // 13/11/2026

const emptyCounts = (): FourColCounts => ({ p1tt: 0, p1gt: 0, p3tt: 0, p3gt: 0 });

const sumRow = (c: FourColCounts): number => c.p1tt + c.p1gt + c.p3tt + c.p3gt;

// Convert Date -> 'YYYY-MM-DD' (local)
const toIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Parse 'YYYY-MM-DD' -> local Date
const fromIsoDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const addDays = (d: Date, days: number): Date => {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  return copy;
};

const formatDDMM = (d: Date): string => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
};

const formatDDMMYYYY = (d: Date): string => {
  return `${formatDDMM(d)}/${d.getFullYear()}`;
};

// Convert 'dd/mm/yyyy' -> comparable YYYYMMDD integer (or null if invalid)
const dateStrToNum = (ddmmyyyy: string): number | null => {
  if (!ddmmyyyy) return null;
  const parts = ddmmyyyy.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year) || year < 1900) return null;
  return year * 10000 + month * 100 + day;
};

const formatNum = (n: number, dashIfZero = false): string => {
  if (dashIfZero && n === 0) return '-';
  return n.toLocaleString('vi-VN');
};

const entriesToPlanMap = (items: KhTuanEntry[]): PlanStorageMap => {
  const map: PlanStorageMap = {};
  items.forEach((it) => {
    if (it && it.ngayIso) {
      map[it.ngayIso] = {
        p1tt: Number(it.p1tt) || 0,
        p1gt: Number(it.p1gt) || 0,
        p3tt: Number(it.p3tt) || 0,
        p3gt: Number(it.p3gt) || 0
      };
    }
  });
  return map;
};

export default function Tab963BaoCaoNgay({
  entries963,
  sessionUser,
  showToast
}: Tab963BaoCaoNgayProps) {
  // Ngày thực hiện / Ngày báo cáo (mặc định: hôm nay)
  const [reportDateIso, setReportDateIso] = useState<string>(() => toIsoDate(new Date()));
  const [showGuideCol, setShowGuideCol] = useState<boolean>(true);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [isSavingKhTuan, setIsSavingKhTuan] = useState<boolean>(false);
  const [isLoadingKhTuan, setIsLoadingKhTuan] = useState<boolean>(false);

  // Dữ liệu đã lưu trên sheet KHTuan
  const [savedPlansMap, setSavedPlansMap] = useState<PlanStorageMap>(() =>
    entriesToPlanMap(DataStore.getKhTuan963Entries())
  );

  // Lưu trữ bản nháp kế hoạch nhập tay theo từng ngày (key: YYYY-MM-DD)
  const [plansByDate, setPlansByDate] = useState<PlanStorageMap>(() => {
    const fromStore = entriesToPlanMap(DataStore.getKhTuan963Entries());
    if (Object.keys(fromStore).length > 0) return fromStore;
    try {
      const raw = localStorage.getItem(PLAN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {};
  });

  // Các ngày đang sửa chưa bấm Lưu
  const [dirtyDates, setDirtyDates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plansByDate));
    } catch {}
  }, [plansByDate]);

  // Đồng bộ từ sheet KHTuan khi mở tab và khi có sự kiện cập nhật
  const syncSavedFromStore = useCallback((resetDraft: boolean = false) => {
    const freshMap = entriesToPlanMap(DataStore.getKhTuan963Entries());
    setSavedPlansMap(freshMap);
    if (resetDraft) {
      setPlansByDate(freshMap);
      setDirtyDates({});
    } else {
      setPlansByDate((prev) => {
        const next = { ...prev };
        Object.keys(freshMap).forEach((iso) => {
          if (!dirtyDates[iso]) {
            next[iso] = freshMap[iso];
          }
        });
        return next;
      });
    }
  }, [dirtyDates]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoadingKhTuan(true);
      try {
        const res = await DataStore.fetchKhTuan963Data(false);
        if (!mounted) return;
        const freshMap = entriesToPlanMap(res.items);
        setSavedPlansMap(freshMap);
        setPlansByDate((prev) => {
          const merged = { ...prev };
          Object.keys(freshMap).forEach((iso) => {
            merged[iso] = freshMap[iso];
          });
          return merged;
        });
      } finally {
        if (mounted) setIsLoadingKhTuan(false);
      }
    };
    load();

    const handleUpdated = () => syncSavedFromStore(false);
    window.addEventListener('kh_tuan_963_updated', handleUpdated);
    return () => {
      mounted = false;
      window.removeEventListener('kh_tuan_963_updated', handleUpdated);
    };
  }, []);

  const todayIso = toIsoDate(new Date());
  const reportDateObj = useMemo(() => fromIsoDate(reportDateIso), [reportDateIso]);
  const reportDateNum = useMemo(
    () => reportDateObj.getFullYear() * 10000 + (reportDateObj.getMonth() + 1) * 100 + reportDateObj.getDate(),
    [reportDateObj]
  );

  // 7 ngày kế hoạch tiếp theo tính từ ngày thực hiện (ngày +1 đến ngày +7)
  const next7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(reportDateObj, i + 1);
      const iso = toIsoDate(d);
      return {
        index: i + 1,
        dateObj: d,
        iso,
        labelDDMM: formatDDMM(d),
        labelDDMMYYYY: formatDDMMYYYY(d),
        guideText:
          i === 0
            ? 'Kế hoạch phải làm (cho nhập) ngày đầu của tuần tính từ ngày thực hiện'
            : `Kế hoạch phải làm (cho nhập) ngày ${i + 1} của tuần tính từ ngày thực hiện`
      };
    });
  }, [reportDateObj]);

  // Tính toán 4 cột cho từng dòng cố định từ sheet 963
  const reportData = useMemo(() => {
    const tongSo = emptyCounts(); // Tổng hợp từ số liệu phải thay (tính cả thu hồi)
    const den12_11: FourColCounts = { ...FIXED_BASELINE_12_11 }; // Fix cứng không thay đổi (129, 5, 106, 160 -> 400)
    const ngayBaoCao = emptyCounts(); // Số thay của ngày báo cáo
    const luyKeTu13_11 = emptyCounts(); // Số thay từ 13/11/2026 đến hết ngày báo cáo

    entries963.forEach((c) => {
      const cat = resolvePhaseCategory(c);
      let colKey: keyof FourColCounts = 'p1tt';
      if (cat.soPhaGroup === '1 Pha') {
        colKey = cat.kieuDo === 'Gián Tiếp' ? 'p1gt' : 'p1tt';
      } else {
        colKey = cat.kieuDo === 'Gián Tiếp' ? 'p3gt' : 'p3tt';
      }

      // Row 1: Tổng số (tính cả thu hồi)
      tongSo[colKey] += 1;

      // Kiểm tra đã thay xong chưa
      const kq = (c.ketQua || '').trim().toLowerCase();
      const isDone = kq === 'xong' || kq.includes('xong');
      if (!isDone) return;

      const normStr = normalizeDateStr(c.ngayGio);
      const entryNum = dateStrToNum(normStr);

      if (entryNum === reportDateNum) {
        ngayBaoCao[colKey] += 1;
      }

      // Cộng dồn lũy kế các ngày từ 13/11/2026 đến hết ngày báo cáo hiện tại
      if (entryNum !== null && entryNum >= START_DAILY_TRACKING_NUM && entryNum <= reportDateNum) {
        luyKeTu13_11[colKey] += 1;
      }
    });

    const tLuy: FourColCounts = {
      p1tt: den12_11.p1tt + luyKeTu13_11.p1tt,
      p1gt: den12_11.p1gt + luyKeTu13_11.p1gt,
      p3tt: den12_11.p3tt + luyKeTu13_11.p3tt,
      p3gt: den12_11.p3gt + luyKeTu13_11.p3gt
    };

    const conLai: FourColCounts = {
      p1tt: tongSo.p1tt - tLuy.p1tt,
      p1gt: tongSo.p1gt - tLuy.p1gt,
      p3tt: tongSo.p3tt - tLuy.p3tt,
      p3gt: tongSo.p3gt - tLuy.p3gt
    };

    // Tổng kế hoạch 7 ngày
    const tongKeHoach7Ngay = emptyCounts();
    const planRows = next7Days.map((day) => {
      const plan = plansByDate[day.iso] || emptyCounts();
      tongKeHoach7Ngay.p1tt += Number(plan.p1tt) || 0;
      tongKeHoach7Ngay.p1gt += Number(plan.p1gt) || 0;
      tongKeHoach7Ngay.p3tt += Number(plan.p3tt) || 0;
      tongKeHoach7Ngay.p3gt += Number(plan.p3gt) || 0;
      return {
        ...day,
        plan
      };
    });

    const conLaiCuoi: FourColCounts = {
      p1tt: conLai.p1tt - tongKeHoach7Ngay.p1tt,
      p1gt: conLai.p1gt - tongKeHoach7Ngay.p1gt,
      p3tt: conLai.p3tt - tongKeHoach7Ngay.p3tt,
      p3gt: conLai.p3gt - tongKeHoach7Ngay.p3gt
    };

    return {
      tongSo,
      den12_11,
      ngayBaoCao,
      tLuy,
      conLai,
      planRows,
      tongKeHoach7Ngay,
      conLaiCuoi
    };
  }, [entries963, reportDateNum, next7Days, plansByDate]);

  const hasUnsavedChanges = useMemo(() => {
    return Object.keys(dirtyDates).some((iso) => {
      if (!dirtyDates[iso] || iso <= todayIso) return false;
      const cur = plansByDate[iso] || emptyCounts();
      const saved = savedPlansMap[iso] || emptyCounts();
      return (
        cur.p1tt !== saved.p1tt ||
        cur.p1gt !== saved.p1gt ||
        cur.p3tt !== saved.p3tt ||
        cur.p3gt !== saved.p3gt
      );
    });
  }, [dirtyDates, plansByDate, savedPlansMap, todayIso]);

  const handlePlanChange = (dateIso: string, field: keyof FourColCounts, rawValue: string) => {
    const currentToday = toIsoDate(new Date());
    if (dateIso <= currentToday) {
      showToast('info', 'Ngày này đã tới hoặc đã qua ngày thực hiện — kế hoạch đã được khóa, không thể chỉnh sửa.');
      return;
    }
    const cleaned = rawValue.replace(/[^0-9]/g, '');
    const num = cleaned === '' ? 0 : parseInt(cleaned, 10);
    setPlansByDate((prev) => ({
      ...prev,
      [dateIso]: {
        ...(prev[dateIso] || emptyCounts()),
        [field]: isNaN(num) ? 0 : num
      }
    }));
    setDirtyDates((prev) => ({ ...prev, [dateIso]: true }));
  };

  const handleClearWeekPlans = () => {
    const currentToday = toIsoDate(new Date());
    const unlockedDays = next7Days.filter((d) => d.iso > currentToday);
    if (unlockedDays.length === 0) {
      showToast('info', 'Tất cả các ngày trong tuần này đã tới/qua ngày thực hiện nên không thể xóa.');
      return;
    }
    setPlansByDate((prev) => {
      const next = { ...prev };
      unlockedDays.forEach((d) => {
        delete next[d.iso];
      });
      return next;
    });
    setDirtyDates((prev) => {
      const next = { ...prev };
      unlockedDays.forEach((d) => {
        next[d.iso] = true;
      });
      return next;
    });
    showToast('info', `Đã đưa số liệu nháp của ${unlockedDays.length} ngày chưa tới hạn về 0 (Bấm "Lưu KHTuan" để ghi lên sheet).`);
  };

  // Sao chép kế hoạch từ ngày đầu tiên có nhập cho các ngày chưa tới ngày thực hiện
  const handleCopyDay1ToRestOfWeek = () => {
    const currentToday = toIsoDate(new Date());
    const day1Plan = plansByDate[next7Days[0].iso] || emptyCounts();
    if (sumRow(day1Plan) === 0) {
      showToast('info', `Vui lòng nhập kế hoạch ngày đầu (${next7Days[0].labelDDMM}) trước khi sao chép sang các ngày sau.`);
      return;
    }
    const targetDays = next7Days.filter((d, idx) => idx > 0 && d.iso > currentToday);
    if (targetDays.length === 0) {
      showToast('info', 'Không có ngày nào chưa tới ngày thực hiện để sao chép.');
      return;
    }
    setPlansByDate((prev) => {
      const next = { ...prev };
      targetDays.forEach((d) => {
        next[d.iso] = { ...day1Plan };
      });
      return next;
    });
    setDirtyDates((prev) => {
      const next = { ...prev };
      targetDays.forEach((d) => {
        next[d.iso] = true;
      });
      return next;
    });
    showToast('success', `Đã sao chép kế hoạch ngày ${next7Days[0].labelDDMM} cho ${targetDays.length} ngày chưa tới hạn (Bấm "Lưu KHTuan" để lưu).`);
  };

  // Lưu kế hoạch tuần vào sheet KHTuan (chỉ lưu được các ngày chưa tới ngày thực hiện)
  const handleSaveKhTuan = async () => {
    const currentToday = toIsoDate(new Date());
    const candidateIsos = new Set<string>();
    next7Days.forEach((d) => {
      if (d.iso > currentToday) candidateIsos.add(d.iso);
    });
    Object.keys(dirtyDates).forEach((iso) => {
      if (dirtyDates[iso] && iso > currentToday) candidateIsos.add(iso);
    });

    if (candidateIsos.size === 0) {
      showToast('info', 'Tất cả các ngày trong tuần này đã tới hoặc đã qua ngày thực hiện — không có ngày nào đủ điều kiện lưu thay đổi.');
      return;
    }

    const nowIsoStr = new Date().toISOString();
    const updaterName = sessionUser?.name || '';
    const entriesToSave: KhTuanEntry[] = Array.from(candidateIsos)
      .sort()
      .map((iso) => {
        const dObj = fromIsoDate(iso);
        const c = plansByDate[iso] || emptyCounts();
        return {
          ngayIso: iso,
          ngay: formatDDMMYYYY(dObj),
          p1tt: Number(c.p1tt) || 0,
          p1gt: Number(c.p1gt) || 0,
          p3tt: Number(c.p3tt) || 0,
          p3gt: Number(c.p3gt) || 0,
          tong: sumRow(c),
          nguoiCapNhat: updaterName,
          capNhatLuc: nowIsoStr
        };
      });

    setIsSavingKhTuan(true);
    try {
      const res = await DataStore.saveKhTuan963Week(entriesToSave, currentToday);
      const freshMap = entriesToPlanMap(res.items);
      setSavedPlansMap(freshMap);
      setPlansByDate((prev) => ({ ...prev, ...freshMap }));
      setDirtyDates({});

      if (res.sheetSynced) {
        showToast('success', `Đã lưu kế hoạch (${entriesToSave.length} ngày chưa tới hạn) vào sheet KHTuan thành công!`);
      } else if (res.success) {
        showToast('info', `Đã lưu trên máy chủ, nhưng chưa đồng bộ được lên Google Sheet KHTuan${res.error ? `: ${res.error}` : '.'}`);
      } else {
        showToast('error', res.error || 'Không thể lưu kế hoạch tuần vào sheet KHTuan.');
      }
    } finally {
      setIsSavingKhTuan(false);
    }
  };

  // Tải lại kế hoạch trực tiếp từ sheet KHTuan
  const handleReloadKhTuan = async () => {
    setIsLoadingKhTuan(true);
    try {
      const res = await DataStore.fetchKhTuan963Data(true);
      const freshMap = entriesToPlanMap(res.items);
      setSavedPlansMap(freshMap);
      setPlansByDate(freshMap);
      setDirtyDates({});
      if (res.items.length > 0) {
        showToast('success', `Đã tải lại ${res.items.length} ngày kế hoạch từ ${res.source === 'sheet' ? 'sheet KHTuan' : 'hệ thống'}.`);
      } else {
        showToast('info', 'Sheet KHTuan hiện chưa có dữ liệu kế hoạch nào được lưu.');
      }
    } catch (err: any) {
      showToast('error', 'Lỗi khi tải lại dữ liệu từ sheet KHTuan: ' + (err?.message || 'Không rõ'));
    } finally {
      setIsLoadingKhTuan(false);
    }
  };

  // Copy nội dung báo cáo nhanh (text/tab-separated để dán trực tiếp vào Zalo/Excel)
  const handleCopyTableText = () => {
    const lines: string[] = [
      ['Hạng mục / Ngày', '1P3G TT', '1P3G GT', '3P3G TT', '3P3G GT', 'Tổng'].join('\t'),
      ['Tổng số', reportData.tongSo.p1tt, reportData.tongSo.p1gt, reportData.tongSo.p3tt, reportData.tongSo.p3gt, sumRow(reportData.tongSo)].join('\t'),
      [FIXED_BASELINE_LABEL, reportData.den12_11.p1tt, reportData.den12_11.p1gt, reportData.den12_11.p3tt, reportData.den12_11.p3gt, sumRow(reportData.den12_11)].join('\t'),
      [`Ngày thực hiện ${formatDDMMYYYY(reportDateObj)}`, reportData.ngayBaoCao.p1tt, reportData.ngayBaoCao.p1gt, reportData.ngayBaoCao.p3tt, reportData.ngayBaoCao.p3gt, sumRow(reportData.ngayBaoCao)].join('\t'),
      ['T. Lũy', reportData.tLuy.p1tt, reportData.tLuy.p1gt, reportData.tLuy.p3tt, reportData.tLuy.p3gt, sumRow(reportData.tLuy)].join('\t'),
      ['Còn lại', reportData.conLai.p1tt, reportData.conLai.p1gt, reportData.conLai.p3tt, reportData.conLai.p3gt, sumRow(reportData.conLai)].join('\t'),
      ...reportData.planRows.map((r) =>
        [r.labelDDMM, r.plan.p1tt, r.plan.p1gt, r.plan.p3tt, r.plan.p3gt, sumRow(r.plan)].join('\t')
      ),
      ['Còn lại (cuối)', reportData.conLaiCuoi.p1tt, reportData.conLaiCuoi.p1gt, reportData.conLaiCuoi.p3tt, reportData.conLaiCuoi.p3gt, sumRow(reportData.conLaiCuoi)].join('\t')
    ];

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
      showToast('success', 'Đã sao chép bảng báo cáo ngày (dạng bảng) — có thể dán trực tiếp vào Excel hoặc Zalo!');
    }).catch(() => {
      showToast('error', 'Không thể sao chép vào clipboard.');
    });
  };

  // Xuất file Excel chuẩn theo mẫu hình
  const handleExportExcel = () => {
    try {
      const headers = ['Hạng mục / Ngày', '1P3G TT', '1P3G GT', '3P3G TT', '3P3G GT', 'Tổng'];
      if (showGuideCol) headers.push('Cách báo cáo');

      const makeRow = (label: string, c: FourColCounts, guide: string) => {
        const arr: any[] = [label, c.p1tt, c.p1gt, c.p3tt, c.p3gt, sumRow(c)];
        if (showGuideCol) arr.push(guide);
        return arr;
      };

      const aoa: any[][] = [
        headers,
        makeRow('Tổng số', reportData.tongSo, 'Tổng hợp từ số liệu phải thay (tính cả thu hồi)'),
        makeRow(FIXED_BASELINE_LABEL, reportData.den12_11, FIXED_BASELINE_GUIDE),
        makeRow(`Ngày thực hiện ${formatDDMMYYYY(reportDateObj)}`, reportData.ngayBaoCao, 'Số thay của ngày báo cáo'),
        makeRow('T. Lũy', reportData.tLuy, 'Lũy kế đã thay tính đến hết ngày báo cáo'),
        makeRow('Còn lại', reportData.conLai, 'Số lượng còn lại tính đến ngày báo cáo'),
        ...reportData.planRows.map((r) => makeRow(r.labelDDMM, r.plan, r.guideText)),
        makeRow('Còn lại (cuối)', reportData.conLaiCuoi, 'Số liệu còn lại sau khi trừ kế hoạch sẽ làm trong 1 tuần')
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Style cells cho đẹp và giống mẫu Excel
      const borderThin = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      };

      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:G14');
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[addr]) continue;
          const isHeader = R === 0;
          const isTLuy = R === 4;
          const isConLai = R === 5;
          const isConLaiCuoi = R === aoa.length - 1;
          const isNumCol = C >= 1 && C <= 5;

          ws[addr].s = {
            font: {
              name: 'Times New Roman',
              sz: 11,
              bold: isHeader || isTLuy || isConLai || isConLaiCuoi || C === 0
            },
            alignment: {
              vertical: 'center',
              horizontal: isHeader ? 'center' : isNumCol ? 'right' : 'left',
              wrapText: true
            },
            fill: isConLai && C <= 5
              ? { fgColor: { rgb: 'FFFF00' } }
              : isHeader
              ? { fgColor: { rgb: 'F1F5F9' } }
              : undefined,
            border: borderThin,
            numFmt: isNumCol && !isHeader ? '#,##0' : undefined
          };
        }
      }

      ws['!cols'] = [
        { wch: 24 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        ...(showGuideCol ? [{ wch: 52 }] : [])
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'BaoCaoNgay_963');
      XLSX.writeFile(wb, `BaoCaoNgay_QD963_${formatDDMMYYYY(reportDateObj).replace(/\//g, '-')}.xlsx`);
      showToast('success', `Đã xuất file Excel Báo Cáo Ngày ${formatDDMMYYYY(reportDateObj)} thành công!`);
    } catch (err: any) {
      showToast('error', 'Lỗi xuất Excel: ' + (err?.message || 'Có sự cố xảy ra'));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Thanh điều khiển */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 flex-wrap">
              <span>Báo Cáo Ngày Thực Hiện &amp; Kế Hoạch Tuần (QĐ 963)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                Ngày {formatDDMMYYYY(reportDateObj)}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổng hợp theo 4 nhóm chủng loại (<b>1P3G TT</b>, <b>1P3G GT</b>, <b>3P3G TT</b>, <b>3P3G GT</b>) và nhập kế hoạch 7 ngày tiếp theo
            </p>
          </div>
        </div>

        {/* Điều khiển chọn ngày & Thao tác */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Chọn ngày báo cáo */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setReportDateIso(toIsoDate(addDays(reportDateObj, -1)))}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Lùi 1 ngày"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <input
                type="date"
                value={reportDateIso}
                onChange={(e) => {
                  if (e.target.value) setReportDateIso(e.target.value);
                }}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setReportDateIso(toIsoDate(addDays(reportDateObj, 1)))}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Tăng 1 ngày"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setReportDateIso(toIsoDate(new Date()))}
              className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
            >
              Hôm nay
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowGuideCol(!showGuideCol)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Ẩn / Hiện cột Cách báo cáo"
          >
            {showGuideCol ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showGuideCol ? 'Ẩn Cách BC' : 'Hiện Cách BC'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyTableText}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Sao chép bảng số liệu để dán vào Zalo hoặc Excel"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSummary ? 'Đã chép' : 'Copy Bảng'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Thanh công cụ hỗ trợ nhập & lưu kế hoạch tuần (Sheet KHTuan) */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-amber-950">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Nhập kế hoạch 7 ngày (<b>{next7Days[0].labelDDMM}</b> → <b>{next7Days[6].labelDDMM}</b>) và bấm <b>Lưu KHTuan</b>. Chỉ được sửa &amp; lưu các ngày <b>chưa tới ngày thực hiện</b> (sau ngày {formatDDMMYYYY(new Date())}).
          </span>
          {hasUnsavedChanges && (
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 font-bold text-[10px] whitespace-nowrap animate-pulse">
              Chưa lưu KHTuan
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReloadKhTuan}
            disabled={isLoadingKhTuan}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-60"
            title="Tải lại kế hoạch đã lưu từ sheet KHTuan"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingKhTuan ? 'animate-spin' : ''}`} />
            <span>{isLoadingKhTuan ? 'Đang tải...' : 'Tải lại KHTuan'}</span>
          </button>
          <button
            type="button"
            onClick={handleCopyDay1ToRestOfWeek}
            className="px-2.5 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
            title={`Sao chép số liệu ngày ${next7Days[0].labelDDMM} cho các ngày chưa tới hạn`}
          >
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Chép ngày đầu ({next7Days[0].labelDDMM}) sang cả tuần</span>
          </button>
          <button
            type="button"
            onClick={handleClearWeekPlans}
            className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Xóa nháp tuần</span>
          </button>
          <button
            type="button"
            onClick={handleSaveKhTuan}
            disabled={isSavingKhTuan}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-60 ${
              hasUnsavedChanges
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-300'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            title="Lưu kế hoạch tuần các ngày chưa tới hạn vào sheet KHTuan"
          >
            <Save className={`w-3.5 h-3.5 ${isSavingKhTuan ? 'animate-pulse' : ''}`} />
            <span>{isSavingKhTuan ? 'Đang lưu KHTuan...' : 'Lưu KHTuan'}</span>
          </button>
        </div>
      </div>

      {/* BẢNG BÁO CÁO NGÀY THEO MẪU */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-black text-[13px] border-b-2 border-slate-400">
                <th className="py-3 px-3.5 text-left border-r border-slate-300 min-w-[185px]">
                  Hạng mục / Ngày
                </th>
                <th className="py-3 px-3 text-center border-r border-slate-300 min-w-[95px]">
                  1P3G TT
                </th>
                <th className="py-3 px-3 text-center border-r border-slate-300 min-w-[95px]">
                  1P3G GT
                </th>
                <th className="py-3 px-3 text-center border-r border-slate-300 min-w-[95px]">
                  3P3G TT
                </th>
                <th className="py-3 px-3 text-center border-r border-slate-300 min-w-[95px]">
                  3P3G GT
                </th>
                <th className="py-3 px-3 text-center border-r border-slate-300 min-w-[95px]">
                  Tổng
                </th>
                {showGuideCol && (
                  <th className="py-3 px-3.5 text-center min-w-[280px]">
                    Cách báo cáo
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-slate-900 text-[13px]">
              {/* 1. Tổng số */}
              <tr className="bg-white hover:bg-slate-50/70">
                <td className="py-2.5 px-3.5 font-black border-r border-slate-300">
                  Tổng số
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold border-r border-slate-300">
                  {formatNum(reportData.tongSo.p1tt)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold border-r border-slate-300">
                  {formatNum(reportData.tongSo.p1gt)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold border-r border-slate-300">
                  {formatNum(reportData.tongSo.p3tt)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold border-r border-slate-300">
                  {formatNum(reportData.tongSo.p3gt)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold border-r border-slate-300">
                  {formatNum(sumRow(reportData.tongSo))}
                </td>
                {showGuideCol && (
                  <td className="py-2.5 px-3.5 text-xs text-slate-700">
                    Tổng hợp từ số liệu phải thay (tính cả thu hồi)
                  </td>
                )}
              </tr>

              {/* 2. Tính đến 12/11 (Dòng fix cố định không thay đổi) */}
              <tr className="bg-white hover:bg-slate-50/70">
                <td className="py-2.5 px-3.5 font-black border-r border-slate-300">
                  {FIXED_BASELINE_LABEL}
                </td>
                <td className="py-2.5 px-3 text-right font-mono border-r border-slate-300">
                  {formatNum(reportData.den12_11.p1tt)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono border-r border-slate-300">
                  {formatNum(reportData.den12_11.p1gt)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono border-r border-slate-300">
                  {formatNum(reportData.den12_11.p3tt)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono border-r border-slate-300">
                  {formatNum(reportData.den12_11.p3gt)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold border-r border-slate-300">
                  {formatNum(sumRow(reportData.den12_11))}
                </td>
                {showGuideCol && (
                  <td className="py-2.5 px-3.5 text-xs text-slate-700">
                    {FIXED_BASELINE_GUIDE}
                  </td>
                )}
              </tr>

              {/* 3. Ngày thực hiện */}
              <tr className="bg-emerald-50/40 hover:bg-emerald-50/70">
                <td className="py-2.5 px-3.5 font-black border-r border-slate-300 leading-tight">
                  <div>Ngày thực hiện</div>
                  <div className="text-emerald-800 font-mono">{formatDDMMYYYY(reportDateObj)}</div>
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-900 border-r border-slate-300">
                  {formatNum(reportData.ngayBaoCao.p1tt, true)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-900 border-r border-slate-300">
                  {formatNum(reportData.ngayBaoCao.p1gt, true)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-900 border-r border-slate-300">
                  {formatNum(reportData.ngayBaoCao.p3tt, true)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-900 border-r border-slate-300">
                  {formatNum(reportData.ngayBaoCao.p3gt, true)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-900 border-r border-slate-300">
                  {formatNum(sumRow(reportData.ngayBaoCao), true)}
                </td>
                {showGuideCol && (
                  <td className="py-2.5 px-3.5 text-xs text-slate-700">
                    Số thay của ngày báo cáo
                  </td>
                )}
              </tr>

              {/* 4. T. Lũy */}
              <tr className="bg-slate-50 font-black hover:bg-slate-100/80">
                <td className="py-2.5 px-3.5 border-r border-slate-300">
                  T. Lũy
                </td>
                <td className="py-2.5 px-3 text-right font-mono border-r border-slate-300">
                  {formatNum(reportData.tLuy.p1tt)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono border-r border-slate-300">
                  {formatNum(reportData.tLuy.p1gt)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono border-r border-slate-300">
                  {formatNum(reportData.tLuy.p3tt)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono border-r border-slate-300">
                  {formatNum(reportData.tLuy.p3gt)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono border-r border-slate-300">
                  {formatNum(sumRow(reportData.tLuy))}
                </td>
                {showGuideCol && (
                  <td className="py-2.5 px-3.5 text-xs font-normal text-slate-700">
                    Lũy kế đã thay tính đến hết ngày báo cáo
                  </td>
                )}
              </tr>

              {/* 5. Còn lại (Vàng nổi bật như mẫu) */}
              <tr className="font-black border-y-2 border-slate-400">
                <td className="py-2.5 px-3.5 bg-yellow-300 text-slate-950 border-r border-slate-400">
                  Còn lại
                </td>
                <td className="py-2.5 px-3 text-right font-mono bg-yellow-300 text-slate-950 border-r border-slate-400">
                  {formatNum(reportData.conLai.p1tt)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono bg-yellow-300 text-slate-950 border-r border-slate-400">
                  {formatNum(reportData.conLai.p1gt)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono bg-yellow-300 text-slate-950 border-r border-slate-400">
                  {formatNum(reportData.conLai.p3tt)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono bg-yellow-300 text-slate-950 border-r border-slate-400">
                  {formatNum(reportData.conLai.p3gt)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono bg-yellow-300 text-slate-950 border-r border-slate-400">
                  {formatNum(sumRow(reportData.conLai))}
                </td>
                {showGuideCol && (
                  <td className="py-2.5 px-3.5 text-xs font-normal bg-white text-slate-700">
                    Số lượng còn lại tính đến ngày báo cáo
                  </td>
                )}
              </tr>

              {/* 6-12. 7 ngày kế hoạch (chỉ cho sửa & lưu khi chưa tới ngày thực hiện: row.iso > todayIso) */}
              {reportData.planRows.map((row) => {
                const isEditable = row.iso > todayIso;
                const isRowDirty = isEditable && !!dirtyDates[row.iso] && (() => {
                  const saved = savedPlansMap[row.iso] || emptyCounts();
                  return (
                    row.plan.p1tt !== saved.p1tt ||
                    row.plan.p1gt !== saved.p1gt ||
                    row.plan.p3tt !== saved.p3tt ||
                    row.plan.p3gt !== saved.p3gt
                  );
                })();
                return (
                  <tr
                    key={row.iso}
                    className={`transition-colors ${
                      !isEditable
                        ? 'bg-slate-50/80'
                        : isRowDirty
                        ? 'bg-amber-50/50 hover:bg-amber-50/80'
                        : 'bg-white hover:bg-indigo-50/40'
                    }`}
                  >
                    <td className="py-1.5 px-3.5 font-black text-right border-r border-slate-300 font-mono">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isEditable && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[9px] font-sans font-bold"
                            title="Đã tới hoặc đã qua ngày thực hiện — kế hoạch đã khóa"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            <span>Khóa</span>
                          </span>
                        )}
                        {isRowDirty && (
                          <span
                            className="inline-block w-2 h-2 rounded-full bg-amber-500"
                            title="Đã thay đổi — bấm Lưu KHTuan để cập nhật lên sheet"
                          />
                        )}
                        <span>{row.labelDDMM}</span>
                      </div>
                    </td>
                    {(['p1tt', 'p1gt', 'p3tt', 'p3gt'] as const).map((field) => (
                      <td key={field} className="py-1 px-2 border-r border-slate-300">
                        <input
                          type="number"
                          min={0}
                          disabled={!isEditable}
                          value={row.plan[field]}
                          onChange={(e) => handlePlanChange(row.iso, field, e.target.value)}
                          title={
                            isEditable
                              ? 'Nhập kế hoạch (bấm Lưu KHTuan để lưu lên sheet)'
                              : 'Đã tới hoặc qua ngày thực hiện — không thể thay đổi'
                          }
                          className={`w-full text-right font-mono font-semibold rounded-md px-2 py-1 text-[13px] border focus:outline-none ${
                            !isEditable
                              ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                              : isRowDirty
                              ? 'bg-white text-amber-950 border-amber-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                              : 'bg-slate-50 hover:bg-white focus:bg-white text-slate-900 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                          }`}
                        />
                      </td>
                    ))}
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-indigo-900 border-r border-slate-300 bg-slate-50/60">
                      {formatNum(sumRow(row.plan))}
                    </td>
                    {showGuideCol && (
                      <td className="py-1.5 px-3.5 text-xs text-slate-700">
                        {row.guideText}
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* 13. Còn lại (cuối) */}
              <tr className="bg-slate-100 font-black border-t-2 border-slate-400">
                <td className="py-2.5 px-3.5 border-r border-slate-300">
                  Còn lại (cuối)
                </td>
                <td className={`py-2.5 px-3 text-right font-mono border-r border-slate-300 ${reportData.conLaiCuoi.p1tt < 0 ? 'text-rose-600' : ''}`}>
                  {formatNum(reportData.conLaiCuoi.p1tt)}
                </td>
                <td className={`py-2.5 px-3 text-right font-mono border-r border-slate-300 ${reportData.conLaiCuoi.p1gt < 0 ? 'text-rose-600' : ''}`}>
                  {formatNum(reportData.conLaiCuoi.p1gt)}
                </td>
                <td className={`py-2.5 px-3 text-right font-mono border-r border-slate-300 ${reportData.conLaiCuoi.p3tt < 0 ? 'text-rose-600' : ''}`}>
                  {formatNum(reportData.conLaiCuoi.p3tt)}
                </td>
                <td className={`py-2.5 px-3 text-right font-mono border-r border-slate-300 ${reportData.conLaiCuoi.p3gt < 0 ? 'text-rose-600' : ''}`}>
                  {formatNum(reportData.conLaiCuoi.p3gt)}
                </td>
                <td className={`py-2.5 px-3 text-right font-mono border-r border-slate-300 ${sumRow(reportData.conLaiCuoi) < 0 ? 'text-rose-600' : 'text-indigo-950'}`}>
                  {formatNum(sumRow(reportData.conLaiCuoi))}
                </td>
                {showGuideCol && (
                  <td className="py-2.5 px-3.5 text-xs font-normal text-slate-700">
                    Số liệu còn lại sau khi trừ kế hoạch sẽ làm trong 1 tuần
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
