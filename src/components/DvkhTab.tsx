import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx-js-style';
import Papa from 'papaparse';
import { 
  FileText, Plus, CheckSquare, Square, Send, UserCheck, 
  Clock, AlertTriangle, CheckCircle2, Mic, MicOff, Filter, 
  Search, RefreshCw, X, Calendar, User, ChevronDown, ChevronUp,
  Download, Sparkles, Shield, AlertCircle, Eye, EyeOff, Layers, Headphones,
  Upload, FileSpreadsheet, HelpCircle, Camera, Image as ImageIcon, ExternalLink, Maximize2
} from 'lucide-react';
import { DataStore, SheetMember, DvkhEntry } from '../store/DataStore';
import { normalizeRoleStr } from '../store/PermissionStore';

// Helper nén ảnh siêu nhẹ (~30-50KB) cực nhanh, tối ưu dung lượng nhỏ nhất và lưu nhanh nhất lên Google Drive
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

interface DvkhTabProps {
  sessionUser: SheetMember | null;
  refreshToggle?: number;
}

export default function DvkhTab({ sessionUser, refreshToggle = 0 }: DvkhTabProps) {
  const [dvkhList, setDvkhList] = useState<DvkhEntry[]>(() => DataStore.getDvkhEntries());
  const [activeSubTab, setActiveSubTab] = useState<'tab1' | 'tab2' | 'tab3'>('tab1');
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // System config for NgayHoanTat
  const [allowCustomNgayHoanTat, setAllowCustomNgayHoanTat] = useState(() => DataStore.getAllowCustomNgayHoanTatDvkh());

  // Listen to updates from other parts of the app
  useEffect(() => {
    const handleUpdate = () => {
      setDvkhList(DataStore.getDvkhEntries());
    };
    const handleConfigUpdate = () => {
      setAllowCustomNgayHoanTat(DataStore.getAllowCustomNgayHoanTatDvkh());
    };
    window.addEventListener('dvkh_updated', handleUpdate);
    window.addEventListener('dvkh_config_updated', handleConfigUpdate);
    return () => {
      window.removeEventListener('dvkh_updated', handleUpdate);
      window.removeEventListener('dvkh_config_updated', handleConfigUpdate);
    };
  }, []);

  useEffect(() => {
    setDvkhList(DataStore.getDvkhEntries());
  }, [refreshToggle]);

  // Current User Role & Department Analysis
  const roleStrNorm = useMemo(() => {
    let r = sessionUser?.role || (sessionUser as any)?.chucDanh || (sessionUser as any)?.chucVu || '';
    const rawName = sessionUser?.name || '';
    const normName = rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();

    if (normName) {
      const members = DataStore.getMembers();
      const found = members.find(m => {
        const mNorm = String(m.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();
        return mNorm === normName;
      });
      if (found) {
        const fRole = found.role || (found as any).chucDanh || (found as any).chucVu || '';
        if (fRole) {
          r = r ? `${r}, ${fRole}` : fRole;
        }
      }
    }

    if (normName.includes('nguyen thanh phong') || normName.includes('thanh phong') || (sessionUser as any)?.email?.includes('phong7nt')) {
      const normR = r.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
      if (!normR.includes('doi truong')) {
        r = r ? `${r}, Đội trưởng` : 'Đội trưởng';
      }
    }

    return normalizeRoleStr(r);
  }, [sessionUser, refreshToggle]);

  const teamNorm = useMemo(() => {
    return normalizeRoleStr(sessionUser?.team || '');
  }, [sessionUser]);

  const boPhanNorm = useMemo(() => {
    const bp = sessionUser?.boPhanCongTac || sessionUser?.boPhan || (sessionUser as any)?.['Bộ phận công tác'] || (sessionUser as any)?.['Bộ phận'] || '';
    return normalizeRoleStr(bp);
  }, [sessionUser]);

  // 1. Is user from DVKH department?
  // "khi người của bộ phận DVKH đăng nhập thành công (tức trường "Bộ phận công tác" trong sheet CongTac là "DVKH")"
  const isDvkhUser = useMemo(() => {
    return boPhanNorm.includes('dvkh') || boPhanNorm.includes('dich vu khach hang') || 
           teamNorm.includes('dvkh') || teamNorm.includes('dich vu khach hang') ||
           roleStrNorm.includes('dvkh');
  }, [boPhanNorm, teamNorm, roleStrNorm]);

  // 2. Is user Đội trưởng / Đội phó?
  const isDoiLeader = useMemo(() => {
    const rawName = sessionUser?.name || '';
    const normName = rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();
    if (normName.includes('nguyen thanh phong') || normName.includes('thanh phong') || (sessionUser as any)?.email?.includes('phong7nt')) {
      return true;
    }
    return roleStrNorm.includes('doi truong') || roleStrNorm.includes('giam doc') || roleStrNorm.includes('doi pho') || roleStrNorm.includes('truong doi');
  }, [roleStrNorm, sessionUser]);

  // 3. Is user Tổ trưởng / Tổ phó?
  const isToLeader = useMemo(() => {
    return roleStrNorm.includes('to truong') || roleStrNorm.includes('to pho') || roleStrNorm.includes('truong to') || roleStrNorm.includes('pho to');
  }, [roleStrNorm]);

  // Display Role Title
  const displayRoleTitle = useMemo(() => {
    const rawName = sessionUser?.name || '';
    const normName = rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();
    if (normName.includes('nguyen thanh phong') || normName.includes('thanh phong') || (sessionUser as any)?.email?.includes('phong7nt') || roleStrNorm.includes('doi truong') || roleStrNorm.includes('truong doi') || roleStrNorm.includes('giam doc')) {
      return 'Đội trưởng';
    }
    if (roleStrNorm.includes('doi pho') || roleStrNorm.includes('pho doi')) {
      return 'Đội phó';
    }
    if (roleStrNorm.includes('to truong') || roleStrNorm.includes('truong to')) {
      return 'Tổ trưởng';
    }
    if (roleStrNorm.includes('to pho') || roleStrNorm.includes('pho to')) {
      return 'Tổ phó';
    }
    if (isDvkhUser) {
      return 'DVKH';
    }
    return sessionUser?.role || 'Nhân viên';
  }, [roleStrNorm, isDvkhUser, sessionUser]);

  // Quyền xác nhận nhận hồ sơ ở Tab 1:
  // "bộ phận DVKH chỉ có quyền tạo và giao qua QLHTDD thôi bạn ơi, phần xác nhận giao là chức năng của Đội QLHTDD (cụ thể là Tổ phó hoặc tổ trưởng hoặc Đội phó hoặc Đội trưởng)."
  const canConfirmReceipt = useMemo(() => {
    // DVKH chỉ có quyền tạo và giao qua QLHTĐĐ, không có quyền xác nhận giao
    if (isDvkhUser && !isDoiLeader) return false;
    // Chức năng của Đội QLHTĐĐ: Tổ phó, Tổ trưởng, Đội phó hoặc Đội trưởng
    if (isDoiLeader) return true;
    if (isToLeader) return true;
    return false;
  }, [isDvkhUser, isDoiLeader, isToLeader]);

  // Helper date format: dd/mm/yyyy hh:mm:ss
  const getCurrentDateTimeStr = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // Helper date format: dd/mm/yyyy
  const getCurrentDateStr = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  // ==============================================================
  // TAB 1: NHẬP MỚI VÀ GIAO HỒ SƠ DVKH
  // ==============================================================
  const [newMaKh, setNewMaKh] = useState('');
  const [newTenKh, setNewTenKh] = useState('');
  const [newDiaChi, setNewDiaChi] = useState('');
  const [newSdt, setNewSdt] = useState('');
  const [newGhiChu, setNewGhiChu] = useState('');
  const [newLoaiYeuCau, setNewLoaiYeuCau] = useState('Gắn mới');
  const [tab1SelectedMaKhs, setTab1SelectedMaKhs] = useState<string[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportTooltip, setShowImportTooltip] = useState(false);
  const importTooltipTimeoutRef = useRef<any>(null);

  const handleMouseEnterImport = () => {
    if (importTooltipTimeoutRef.current) clearTimeout(importTooltipTimeoutRef.current);
    setShowImportTooltip(true);
  };
  const handleMouseLeaveImport = () => {
    if (importTooltipTimeoutRef.current) clearTimeout(importTooltipTimeoutRef.current);
    importTooltipTimeoutRef.current = setTimeout(() => {
      setShowImportTooltip(false);
    }, 280);
  };

  // STT tự động tăng cho hồ sơ nhập mới theo số lượng record
  const nextStt = useMemo(() => {
    const maxStt = dvkhList.reduce((max, item) => Math.max(max, typeof item.stt === 'number' ? item.stt : parseInt(String(item.stt || 0), 10) || 0), 0);
    return Math.max(maxStt + 1, dvkhList.length + 1);
  }, [dvkhList]);

  // Tab 1 records waiting to be delivered (state 'Chưa giao')
  const tab1PendingRecords = useMemo(() => {
    return dvkhList.filter(e => {
      const st = String(e.trangThai || '').trim().toLowerCase();
      return st === 'chưa giao' || st === 'chua giao' || (!st && !e.nguoiNhan && !e.ngayGiao && !e.nguoiThucHien && e.ketQua !== 'Xong');
    });
  }, [dvkhList]);

  // Sub-tab 1 badge count: số hồ sơ đã nhập chuẩn bị giao (trạng thái 'Chưa giao')
  const countTab1Pending = useMemo(() => {
    return tab1PendingRecords.length;
  }, [tab1PendingRecords]);

  // Sub-tab 2 badge count: hồ sơ tồn chưa giao cho đi thực hiện (đã nhận nhưng chưa giao thi công: 'Đã Nhận')
  const countTab2Pending = useMemo(() => {
    return dvkhList.filter(e => e.trangThai === 'Đã Nhận').length;
  }, [dvkhList]);

  // Sub-tab 3 badge count: hồ sơ đã giao chưa hoàn tất ('Đã Giao thi công' hoặc 'Trở ngại')
  const countTab3Pending = useMemo(() => {
    if (isDvkhUser) {
      return dvkhList.filter(e => e.trangThai === 'Đã Giao thi công' || e.trangThai === 'Trở ngại').length;
    }
    // If regular employee, only show their own assigned incomplete records
    if (!isDoiLeader && !isToLeader) {
      const myName = (sessionUser?.name || '').trim().toLowerCase();
      return dvkhList.filter(e => {
        const assignedName = (e.nguoiThucHien || e.nguoiNhan || '').trim().toLowerCase();
        return assignedName === myName && (e.trangThai === 'Đã Giao thi công' || e.trangThai === 'Trở ngại');
      }).length;
    }
    return dvkhList.filter(e => e.trangThai === 'Đã Giao thi công' || e.trangThai === 'Trở ngại').length;
  }, [dvkhList, isDvkhUser, isDoiLeader, isToLeader, sessionUser?.name]);

  // Tab 1 records waiting for QLHTĐĐ confirmation ('Chờ nhận' or already delivered by DVKH)
  const tab1DeliveredWaitingConfirm = useMemo(() => {
    return dvkhList.filter(e => {
      const st = String(e.trangThai || '').trim().toLowerCase();
      return st === 'chờ nhận' || st === 'cho nhan';
    });
  }, [dvkhList]);

  const handleAddNewRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaKh.trim() || !newTenKh.trim()) {
      alert('Vui lòng nhập Mã khách hàng và Tên khách hàng!');
      return;
    }

    // Check duplicate MaKH
    const exists = dvkhList.some(item => item.maKh.trim().toLowerCase() === newMaKh.trim().toLowerCase());
    if (exists) {
      alert(`Mã khách hàng "${newMaKh}" đã tồn tại trong danh sách! Vui lòng kiểm tra lại.`);
      return;
    }

    setIsAddingNew(true);
    const nowStr = getCurrentDateTimeStr();
    const newEntry: DvkhEntry = {
      stt: nextStt,
      maKh: newMaKh.trim(),
      tenKh: newTenKh.trim(),
      diaChi: newDiaChi.trim(),
      sdt: newSdt.trim(),
      loaiYeuCau: newLoaiYeuCau || 'Gắn mới', // Loại yêu cầu đưa vào cột Loại (trường Loai)
      ngayNhan: nowStr, // Ngày tạo hồ sơ để giao sang QLHTĐĐ cập nhật vào cột ngày nhận (trường NgayNhan)
      ngayTao: nowStr,
      nguoiGiao: '', // Đối với Người giao luôn là người của DVKH nên không cần thiết phải lưu
      nguoiTao: sessionUser?.name || 'DVKH',
      trangThai: 'Chưa giao', // Cập nhật trạng thái "Chưa giao" vào cột trạng thái (trường TrangThai)
      ghiChu: newGhiChu.trim() // Phần nội dung ghi chú ban đầu đưa vào ghi chú (trường GhiChu)
    };

    await DataStore.addDvkhEntry(newEntry);
    setDvkhList([...DataStore.getDvkhEntries()]);
    setNewMaKh('');
    setNewTenKh('');
    setNewDiaChi('');
    setNewSdt('');
    setNewGhiChu('');
    setIsAddingNew(false);
    showToast('success', `Đã thêm hồ sơ KH "${newEntry.tenKh}" (${newEntry.maKh}) với STT #${newEntry.stt} vào danh sách chưa giao!`);
  };

  // Download template Excel file for Import
  const handleDownloadTemplate = () => {
    const wsData = [
      ["STT", "Mã KH", "Tên KH", "Địa chỉ", "Số điện thoại", "Loại", "Ghi chú"],
      [1, "PK0100123456", "Công ty TNHH Hoàng Gia", "124 Trương Công Định, Phường 3, TP. Vũng Tàu", "0908123456", "Gắn mới 3 pha", "Khách hàng hẹn sáng thứ 7"],
      [2, "PK0100234567", "Nguyễn Văn Hùng", "45 Lê Hồng Phong, Phường 7, TP. Vũng Tàu", "0912345678", "Thay 3 giá", ""],
      [3, "PK0100345678", "Trần Thị Thu Thảo", "88 Ba Cu, Phường 1, TP. Vũng Tàu", "0987654321", "Gắn mới 1 pha", "Có mặt sau 9h"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 30 }, { wch: 45 }, { wch: 16 }, { wch: 20 }, { wch: 35 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachKhachHang");
    XLSX.writeFile(wb, "Mau_Import_Ho_So_DVKH.xlsx");
  };

  // Handle file import (Excel / CSV)
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const normalizeKey = (k: string) => String(k || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s_]+/g, '').replace(/đ/g, 'd');
      let rawRows: any[] = [];

      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
        const allRows = (parsed.data as any[]) || [];
        if (allRows.length === 0) {
          alert('File CSV không có dữ liệu!');
          return;
        }

        // Quét thông minh 10 dòng đầu để tìm dòng chứa tiêu đề cột (có Mã KH / Tên KH)
        let headerRowIdx = 0;
        for (let r = 0; r < Math.min(10, allRows.length); r++) {
          const rowNorm = (allRows[r] || []).map((c: any) => normalizeKey(String(c || ''))).join(' ');
          if (rowNorm.includes('makh') || (rowNorm.includes('ma') && rowNorm.includes('ten'))) {
            headerRowIdx = r;
            break;
          }
        }

        const headers = (allRows[headerRowIdx] || []).map((c: any) => String(c || '').trim());
        rawRows = allRows.slice(headerRowIdx + 1).map((r: any[]) => {
          const obj: any = {};
          headers.forEach((h: string, idx: number) => {
            if (h) obj[h] = r[idx];
          });
          return obj;
        });
      } else {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const firstSheet = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheet];
        const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
        if (!allRows || allRows.length === 0) {
          alert('File Excel không có dữ liệu!');
          return;
        }

        // Quét thông minh 10 dòng đầu tìm dòng tiêu đề bảng
        let headerRowIdx = 0;
        for (let r = 0; r < Math.min(10, allRows.length); r++) {
          const rowNorm = (allRows[r] || []).map((c: any) => normalizeKey(String(c || ''))).join(' ');
          if (rowNorm.includes('makh') || (rowNorm.includes('ma') && rowNorm.includes('ten'))) {
            headerRowIdx = r;
            break;
          }
        }

        const headers = (allRows[headerRowIdx] || []).map((c: any) => String(c || '').trim());
        rawRows = allRows.slice(headerRowIdx + 1).map((r: any[]) => {
          const obj: any = {};
          headers.forEach((h: string, idx: number) => {
            if (h) obj[h] = r[idx];
          });
          return obj;
        });
      }

      if (!rawRows || rawRows.length === 0) {
        alert('File không có dòng dữ liệu hợp lệ hoặc định dạng không đúng!');
        return;
      }

      const currentList = DataStore.getDvkhEntries();
      const existingMaKhSet = new Set(currentList.map(item => String(item.maKh || '').trim().toLowerCase()));

      const importedEntries: DvkhEntry[] = [];
      let skippedDuplicates = 0;
      let skippedMissingInfo = 0;

      let currentMaxStt = currentList.reduce((max, item) => Math.max(max, typeof item.stt === 'number' ? item.stt : parseInt(String(item.stt || 0), 10) || 0), 0);
      if (currentMaxStt === 0) currentMaxStt = currentList.length;
      const startStt = currentMaxStt + 1;
      const nowStr = getCurrentDateTimeStr();
      const creatorName = sessionUser?.name || (isDvkhUser ? 'DVKH' : 'QLHTĐĐ');

      for (const row of rawRows) {
        const keys = Object.keys(row);
        const getVal = (aliases: string[]) => {
          for (const alias of aliases) {
            const normAlias = normalizeKey(alias);
            for (const k of keys) {
              if (normalizeKey(k) === normAlias) {
                return String(row[k] || '').trim();
              }
            }
          }
          return '';
        };

        const sttRaw = getVal(['stt', 'số thứ tự', 'so thu tu', 'so_thu_tu', 'stt_hs']);
        const maKh = getVal(['makh', 'mã kh', 'ma khach hang', 'mã khách hàng', 'ma_kh', 'mã', 'makhachhang']);
        const tenKh = getVal(['tenkh', 'tên kh', 'ten khach hang', 'tên khách hàng', 'họ tên', 'họ và tên', 'tên', 'khach hang']);
        const diaChi = getVal(['diachi', 'địa chỉ', 'dia chi', 'địa chỉ khách hàng']);
        const sdt = getVal(['sdt', 'số điện thoại', 'so dien thoai', 'điện thoại', 'dien thoai', 'phone', 'tel']);
        const loaiYeuCau = getVal(['loai', 'loại', 'loaiyeucau', 'loại yêu cầu', 'loai hs', 'yêu cầu', 'yeu cau', 'loaiyeucauhs']) || 'Gắn mới';
        const ghiChu = getVal(['ghichu', 'ghi chú', 'note', 'nội dung', 'ghi chú ban đầu', 'nội dung ghi chú', 'ghichubandau']);

        if (!maKh || !tenKh) {
          skippedMissingInfo++;
          continue;
        }

        const lowerMaKh = maKh.toLowerCase();
        if (existingMaKhSet.has(lowerMaKh)) {
          skippedDuplicates++;
          continue;
        }

        let entryStt = 0;
        if (sttRaw) {
          const parsed = parseInt(sttRaw, 10);
          if (!isNaN(parsed) && parsed > 0) {
            entryStt = parsed;
            if (entryStt > currentMaxStt) currentMaxStt = entryStt;
          }
        }
        if (!entryStt) {
          currentMaxStt++;
          entryStt = currentMaxStt;
        }

        existingMaKhSet.add(lowerMaKh);

        importedEntries.push({
          stt: entryStt,
          maKh,
          tenKh,
          diaChi,
          sdt,
          loaiYeuCau, // Đưa vào cột Loại (trường Loai)
          ghiChu: ghiChu || '', // Ghi chú ban đầu đưa vào ghi chú (trường GhiChu)
          trangThai: 'Chưa giao', // Trạng thái "Chưa giao" đưa vào cột trạng thái (trường TrangThai)
          ngayNhan: nowStr, // Ngày tạo hồ sơ để giao sang QLHTĐĐ cập nhật vào cột ngày nhận (trường NgayNhan)
          ngayTao: nowStr,
          nguoiGiao: '', // Đối với Người giao luôn là người của DVKH nên không cần thiết phải lưu
          nguoiTao: creatorName
        });
      }

      if (importedEntries.length === 0) {
        let msg = 'Không có hồ sơ nào được import.';
        if (skippedDuplicates > 0) msg += ` Có ${skippedDuplicates} hồ sơ bị trùng Mã KH đã tồn tại.`;
        if (skippedMissingInfo > 0) msg += ` Có ${skippedMissingInfo} dòng thiếu Mã KH hoặc Tên KH.`;
        alert(msg);
        return;
      }

      await DataStore.addDvkhEntries(importedEntries);
      const updatedList = DataStore.getDvkhEntries();
      setDvkhList([...updatedList]);
      setTab1SelectedMaKhs([]);

      let successMsg = `Đã import thành công ${importedEntries.length} hồ sơ mới (STT từ #${startStt} đến #${currentMaxStt}) vào danh sách chưa giao!`;
      if (skippedDuplicates > 0) successMsg += ` (Bỏ qua ${skippedDuplicates} mã đã trùng)`;
      showToast('success', successMsg);
    } catch (err: any) {
      console.error('Import error:', err);
      alert('Lỗi đọc file: ' + (err.message || 'Không thể xử lý file import'));
    } finally {
      setIsLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Tab 1: Giao danh sách khách hàng sang QLHTĐĐ
  const handleDeliverToQlhtdd = async () => {
    if (tab1SelectedMaKhs.length === 0) {
      alert('Vui lòng chọn ít nhất một hồ sơ chưa giao để tiến hành giao!');
      return;
    }

    if (!isDvkhUser && !isDoiLeader) {
      alert('Chỉ nhân sự thuộc Bộ phận DVKH hoặc Đội trưởng mới có quyền thực hiện giao hồ sơ sang Đội QLHTĐĐ!');
      return;
    }

    const nowStr = getCurrentDateTimeStr();
    await DataStore.batchUpdateDvkh(tab1SelectedMaKhs, {
      ngayNhan: nowStr,
      trangThai: 'Chờ nhận'
    });

    setDvkhList(DataStore.getDvkhEntries());
    setTab1SelectedMaKhs([]);
    showToast('success', `Đã giao thành công ${tab1SelectedMaKhs.length} hồ sơ sang Đội QLHTĐĐ!`);
  };

  // Tab 1: Xác nhận tiếp nhận hồ sơ đã giao
  const handleConfirmReceipt = async (maKh: string) => {
    if (!canConfirmReceipt) {
      alert('Chỉ Tổ trưởng Treo tháo, Tổ phó treo tháo, Đội trưởng hoặc Đội phó mới có quyền xác nhận tiếp nhận hồ sơ!');
      return;
    }

    const nowStr = getCurrentDateTimeStr();
    const currentUserName = sessionUser?.name || 'Lãnh đạo QLHTĐĐ';

    await DataStore.updateDvkhEntry(maKh, {
      nguoiNhan: currentUserName,
      ngayNhan: nowStr,
      trangThai: 'Đã Nhận'
    });

    setDvkhList(DataStore.getDvkhEntries());
    showToast('success', `Đã tiếp nhận hồ sơ "${maKh}" vào Đội QLHTĐĐ!`);
  };

  const handleConfirmAllReceipts = async () => {
    if (!canConfirmReceipt) {
      alert('Chỉ Tổ trưởng Treo tháo, Tổ phó treo tháo, Đội trưởng hoặc Đội phó mới có quyền xác nhận tiếp nhận hồ sơ!');
      return;
    }

    const pendingKeys = tab1DeliveredWaitingConfirm.map(e => e.maKh);
    if (pendingKeys.length === 0) return;

    const nowStr = getCurrentDateTimeStr();
    const currentUserName = sessionUser?.name || 'Lãnh đạo QLHTĐĐ';

    await DataStore.batchUpdateDvkh(pendingKeys, {
      nguoiNhan: currentUserName,
      ngayNhan: nowStr,
      trangThai: 'Đã Nhận'
    });

    setDvkhList(DataStore.getDvkhEntries());
    showToast('success', `Đã tiếp nhận toàn bộ ${pendingKeys.length} hồ sơ vào Đội QLHTĐĐ!`);
  };

  // ==============================================================
  // TAB 2: GIAO THI CÔNG
  // ==============================================================
  const [tab2SelectedMaKhs, setTab2SelectedMaKhs] = useState<string[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');

  // Eligible employees list for assignment
  const eligibleAssignees = useMemo(() => {
    const allMembers = DataStore.getMembers();
    // Đội trưởng, Đội phó: toàn bộ nhân viên trong các tổ treo tháo
    if (isDoiLeader) {
      return allMembers.filter(m => {
        const mBp = normalizeRoleStr(m.boPhanCongTac || m.boPhan || (m as any)?.['Bộ phận công tác']);
        return !mBp.includes('dvkh');
      });
    }
    // Tổ trưởng, Tổ phó: nhân viên thuộc tổ mình
    if (isToLeader) {
      return allMembers.filter(m => m.team === sessionUser?.team);
    }
    return [];
  }, [isDoiLeader, isToLeader, sessionUser?.team]);

  // Tab 2 records: 'Đã Nhận' (tồn chưa giao thi công)
  const tab2Records = useMemo(() => {
    return dvkhList.filter(e => e.trangThai === 'Đã Nhận');
  }, [dvkhList]);

  const handleAssignToTechnician = async () => {
    if (tab2SelectedMaKhs.length === 0) {
      alert('Vui lòng chọn ít nhất một hồ sơ để giao thi công!');
      return;
    }
    if (!selectedAssignee) {
      alert('Vui lòng chọn nhân viên thực hiện thi công từ danh sách!');
      return;
    }

    if (isDvkhUser && !isDoiLeader) {
      alert('Bộ phận DVKH không có quyền giao thi công ở Tab 2!');
      return;
    }

    const nowStr = getCurrentDateTimeStr();
    const currentUserName = sessionUser?.name || 'Tổ trưởng/Đội trưởng';

    await DataStore.batchUpdateDvkh(tab2SelectedMaKhs, {
      ngayGiao: nowStr,
      nguoiGiao: currentUserName,
      // Không cập nhật cột người nhận (giữ nguyên người nhận của Đội QLHTĐĐ)
      nguoiThucHien: selectedAssignee,
      trangThai: 'Đã Giao thi công'
    });

    setDvkhList(DataStore.getDvkhEntries());
    setTab2SelectedMaKhs([]);
    setSelectedAssignee('');
    showToast('success', `Đã giao ${tab2SelectedMaKhs.length} hồ sơ cho nhân viên "${selectedAssignee}" thi công!`);
  };

  // ==============================================================
  // TAB 3: THỰC HIỆN & BÁO CÁO KẾT QUẢ
  // ==============================================================
  const [managerViewAllTab3, setManagerViewAllTab3] = useState(false);
  const [updatingRecord, setUpdatingRecord] = useState<DvkhEntry | null>(null);
  const [updateNgayHoanTat, setUpdateNgayHoanTat] = useState(getCurrentDateStr());
  const [updateKetQua, setUpdateKetQua] = useState<'Xong' | 'Chưa'>('Xong');
  const [updateGhiChu, setUpdateGhiChu] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // States for uploading proof photos to Google Drive
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [uploadPicError, setUploadPicError] = useState('');
  const [picPreview, setPicPreview] = useState('');
  const [uploadedPicUrl, setUploadedPicUrl] = useState('');
  const [picSizeKb, setPicSizeKb] = useState(0);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputPicRef = useRef<HTMLInputElement>(null);
  const [viewingImageModal, setViewingImageModal] = useState<{ url: string; title: string } | null>(null);

  // Tab 3 visible records:
  // Requirement 4: "Chỉ nhân viên được giao thực hiện mới thấy được hồ sơ đã giao, và gắn rồi cập nhật kết quả."
  const tab3Records = useMemo(() => {
    const incompleteRecords = dvkhList.filter(e => e.trangThai === 'Đã Giao thi công' || e.trangThai === 'Trở ngại');
    
    // If DVKH user: they cannot update, but can monitor
    if (isDvkhUser) {
      return incompleteRecords;
    }

    // If manager and toggled view all:
    if ((isDoiLeader || isToLeader) && managerViewAllTab3) {
      return incompleteRecords;
    }

    // By default: regular employee ONLY sees records assigned to them
    const myName = (sessionUser?.name || '').trim().toLowerCase();
    return incompleteRecords.filter(e => {
      const assigned = (e.nguoiThucHien || e.nguoiNhan || '').trim().toLowerCase();
      return assigned === myName;
    });
  }, [dvkhList, isDvkhUser, isDoiLeader, isToLeader, managerViewAllTab3, sessionUser?.name]);

  const openUpdateModal = (record: DvkhEntry) => {
    if (isDvkhUser && !isDoiLeader) {
      alert('Bộ phận DVKH không có quyền cập nhật kết quả thi công ở Tab 3!');
      return;
    }

    const myName = (sessionUser?.name || '').trim().toLowerCase();
    const assigned = (record.nguoiThucHien || record.nguoiNhan || '').trim().toLowerCase();
    if (!isDoiLeader && !isToLeader && assigned !== myName) {
      alert('Bạn chỉ có quyền cập nhật các hồ sơ được giao đích danh cho bạn!');
      return;
    }

    setUpdatingRecord(record);
    setUpdateNgayHoanTat(record.ngayHoanTat || getCurrentDateStr());
    setUpdateKetQua(record.ketQua === 'Chưa' ? 'Chưa' : 'Xong');
    setUpdateGhiChu(record.ghiChu || '');
    setPicPreview(record.pic || '');
    setUploadedPicUrl(record.pic || '');
    setPicSizeKb(0);
    setUploadPicError('');
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file || !updatingRecord) return;

    setIsUploadingPic(true);
    setUploadPicError('');

    try {
      // 1. Tối ưu nén ảnh siêu nhẹ (~30-50KB) cực nhanh, đảm bảo lưu nhanh nhất và dung lượng nhỏ nhất
      const { base64, sizeKb } = await compressImageFile(file, 960, 960, 0.65);
      setPicSizeKb(sizeKb);
      setPicPreview(base64);

      // Tên file lưu trên Google Drive: DVKH_mã KH
      const fileName = `DVKH_${updatingRecord.maKh}.jpg`;
      const folderId = '1eze4kVWtdUr0gjKSEAB_BKSfm5CNg3fv';

      const driveUrl = await DataStore.uploadImageToDrive(base64, fileName, 'image/jpeg', folderId, {
        maKh: updatingRecord.maKh
      });

      setUploadedPicUrl(driveUrl);
      setIsUploadingPic(false);
      showToast('success', `Đã lưu ảnh chứng minh (${fileName}, ${sizeKb}KB) lên Google Drive!`);
    } catch (err: any) {
      console.error('Lỗi tải ảnh chứng minh:', err);
      setIsUploadingPic(false);
      setUploadPicError(err.message || 'Không thể lưu ảnh lên Google Drive');
    }
  };

  const handleSaveResult = async () => {
    if (!updatingRecord) return;

    if (updateKetQua === 'Chưa' && !updateGhiChu.trim()) {
      alert('Khi kết quả là "Chưa" (Trở ngại), BẮT BUỘC phải nhập ghi chú nguyên nhân trở ngại (có thể bấm nút micro để nói)!');
      return;
    }

    const nowStr = getCurrentDateTimeStr();
    let finalGhiChu = updateGhiChu.trim();

    // Đối với khách hàng trở ngại: Thêm ngày giờ báo cáo vào ghi chú: (ngày giờ) + nội dung ghi chú + "; "
    if (updateKetQua === 'Chưa') {
      const cleanNote = updateGhiChu.trim();
      if (!/^\(\d{1,2}\/\d{1,2}\/\d{4}/.test(cleanNote)) {
        finalGhiChu = `(${nowStr}) ${cleanNote}; `;
        if (updatingRecord.ghiChu && !cleanNote.includes(updatingRecord.ghiChu)) {
          const oldNote = updatingRecord.ghiChu.trim();
          finalGhiChu = oldNote.endsWith(';') || oldNote.endsWith('; ')
            ? `${oldNote} (${nowStr}) ${cleanNote}; `
            : `${oldNote}; (${nowStr}) ${cleanNote}; `;
        }
      } else {
        if (!finalGhiChu.endsWith('; ') && !finalGhiChu.endsWith(';')) {
          finalGhiChu = `${finalGhiChu}; `;
        }
      }
    }

    const finalTrangThai: 'Xong' | 'Trở ngại' = updateKetQua === 'Xong' ? 'Xong' : 'Trở ngại';
    const finalNgayHoanTat = allowCustomNgayHoanTat ? (updateNgayHoanTat.trim() || getCurrentDateStr()) : getCurrentDateStr();
    const finalPic = uploadedPicUrl || picPreview || updatingRecord.pic || '';

    await DataStore.updateDvkhEntry(updatingRecord.maKh, {
      ngayHoanTat: finalNgayHoanTat,
      ketQua: updateKetQua,
      ghiChu: finalGhiChu,
      trangThai: finalTrangThai,
      pic: finalPic
    });

    setDvkhList(DataStore.getDvkhEntries());
    setUpdatingRecord(null);
    setPicPreview('');
    setUploadedPicUrl('');
    setPicSizeKb(0);
    setUploadPicError('');
    showToast('success', `Đã cập nhật kết quả "${updateKetQua}" cho hồ sơ ${updatingRecord.maKh}!`);
  };

  // Voice speech-to-text recording
  const handleToggleVoiceRecording = () => {
    if (isRecordingVoice) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecordingVoice(false);
      setVoiceNotice(null);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Trình duyệt của bạn chưa hỗ trợ nhận dạng giọng nói trực tiếp. Bạn vui lòng gõ nội dung ghi chú bằng bàn phím.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecordingVoice(true);
        setVoiceNotice('Đang lắng nghe tiếng Việt... Hãy nói nội dung ghi chú.');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) {
          setUpdateGhiChu(prev => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed}. ${transcript.trim()}` : transcript.trim();
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecordingVoice(false);
        setVoiceNotice(`Lỗi giọng nói: ${event.error}. Có thể do chưa cấp quyền Micro.`);
        setTimeout(() => setVoiceNotice(null), 4000);
      };

      recognition.onend = () => {
        setIsRecordingVoice(false);
        setVoiceNotice(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.warn('Speech init error:', e);
      setIsRecordingVoice(false);
      alert('Không thể khởi động Micro. Vui lòng kiểm tra quyền truy cập microphone trên thiết bị.');
    }
  };

  // Clean up voice on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
    };
  }, []);

  // ==============================================================
  // PHẦN DƯỚI TAB DVKH: DANH SÁCH TỔNG HỢP VỚI BỘ LỌC HÌNH PHỄU
  // ==============================================================
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterTrangThai, setFilterTrangThai] = useState('ALL');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('ALL');

  const bottomFilteredList = useMemo(() => {
    return dvkhList.filter(item => {
      // Search text
      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        const matchName = (item.tenKh || '').toLowerCase().includes(q);
        const matchMa = (item.maKh || '').toLowerCase().includes(q);
        const matchAddr = (item.diaChi || '').toLowerCase().includes(q);
        const matchNote = (item.ghiChu || '').toLowerCase().includes(q);
        const matchAssignee = (item.nguoiThucHien || item.nguoiNhan || '').toLowerCase().includes(q);
        if (!matchName && !matchMa && !matchAddr && !matchNote && !matchAssignee) {
          return false;
        }
      }

      // Status filter
      if (filterTrangThai !== 'ALL' && item.trangThai !== filterTrangThai) {
        return false;
      }

      // Assignee filter
      if (filterAssignee !== 'ALL') {
        const assigned = item.nguoiThucHien || item.nguoiNhan || '';
        if (assigned !== filterAssignee) return false;
      }

      // Date range filter based on ngayNhan (dd/mm/yyyy ...)
      if (filterFromDate || filterToDate) {
        const parseDate = (dStr?: string) => {
          if (!dStr) return null;
          const parts = dStr.split(' ')[0].split('/');
          if (parts.length >= 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
          }
          return null;
        };
        const recordDate = parseDate(item.ngayNhan || item.ngayTao);
        if (recordDate) {
          if (filterFromDate) {
            const fromTime = new Date(filterFromDate).getTime();
            if (recordDate < fromTime) return false;
          }
          if (filterToDate) {
            const toTime = new Date(filterToDate).getTime() + 24 * 60 * 60 * 1000;
            if (recordDate > toTime) return false;
          }
        }
      }

      return true;
    });
  }, [dvkhList, filterSearch, filterTrangThai, filterAssignee, filterFromDate, filterToDate]);

  // Toast feedback helper
  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setSyncStatusMsg({ type, text });
    setTimeout(() => {
      setSyncStatusMsg(null);
    }, 4000);
  };

  // Sync with Google Sheets manually
  const handleManualSync = async () => {
    setIsLoading(true);
    showToast('info', 'Đang đồng bộ dữ liệu với Google Sheets...');
    try {
      await DataStore.syncMasterData();
      setDvkhList(DataStore.getDvkhEntries());
      showToast('success', 'Đã cập nhật dữ liệu mới nhất từ máy chủ Google Sheets!');
    } catch (e: any) {
      showToast('error', 'Lỗi đồng bộ máy chủ: ' + (e.message || 'Mất kết nối'));
    } finally {
      setIsLoading(false);
    }
  };

  // Export CSV helper
  const handleExportCSV = () => {
    const headers = ['STT', 'Mã KH', 'Tên KH', 'Địa chỉ', 'Ngày nhận', 'Ngày hoàn tất', 'Ghi chú', 'Trạng thái', 'Người thực hiện', 'Kết quả'];
    const rows = bottomFilteredList.map((item, idx) => [
      item.stt || (idx + 1),
      item.maKh,
      `"${item.tenKh.replace(/"/g, '""')}"`,
      `"${item.diaChi.replace(/"/g, '""')}"`,
      item.ngayNhan || '',
      item.ngayHoanTat || '',
      `"${(item.ghiChu || '').replace(/"/g, '""')}"`,
      item.trangThai,
      item.nguoiThucHien || item.nguoiNhan || '',
      item.ketQua || ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_Sach_Ho_So_DVKH_${getCurrentDateStr().replace(/\//g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Status badge styling
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Chưa giao':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">Chưa giao</span>;
      case 'Chờ nhận':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Chờ nhận</span>;
      case 'Đã Nhận':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">Đã Nhận</span>;
      case 'Đã Giao thi công':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">Đã Giao thi công</span>;
      case 'Trở ngại':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">Trở ngại</span>;
      case 'Xong':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Xong</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-[#005a9c] text-white p-5 md:p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <Headphones className="w-6 h-6 text-purple-200" />
              </span>
              <div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-wide">
                  Quản Lý Hồ Sơ Dịch Vụ Khách Hàng (DVKH)
                </h2>
                <p className="text-xs md:text-sm text-purple-100 mt-0.5">
                  Quy trình tiếp nhận, giao thi công và báo cáo kết quả gắn mới, thay 3 giá giữa Đội DVKH và Đội QLHTĐĐ.
                </p>
              </div>
            </div>
            
            {/* User identity & Role recognition */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="bg-white/20 px-3 py-1 rounded-full font-semibold border border-white/20 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Người dùng: <b>{sessionUser?.name || 'Khách'}</b></span>
              </span>
              <span className="bg-white/25 px-3 py-1 rounded-full font-bold border border-white/30 text-amber-200 flex items-center gap-1">
                <span>Chức danh: <b>{displayRoleTitle}</b></span>
              </span>
              <span className={`px-3 py-1 rounded-full font-bold border ${
                isDvkhUser 
                  ? 'bg-amber-400 text-amber-950 border-amber-300' 
                  : 'bg-emerald-500/30 text-emerald-100 border-emerald-400/40'
              }`}>
                {isDvkhUser ? 'Bộ phận: DVKH' : `Bộ phận: QLHTĐĐ (${sessionUser?.team || 'Đội QLHTĐĐ'})`}
              </span>
              {isDoiLeader && (
                <span className="bg-amber-300 text-amber-950 border border-amber-200 px-2.5 py-1 rounded-full text-[11px] font-black shadow-xs">
                  Quản trị Đội trưởng
                </span>
              )}
              {canConfirmReceipt && !isDoiLeader && (
                <span className="bg-sky-400/30 text-sky-100 border border-sky-300/40 px-2.5 py-1 rounded-full text-[11px] font-bold">
                  Quyền tiếp nhận hồ sơ
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {dvkhList.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Bạn có chắc muốn làm mới danh sách DVKH về trống (xóa cache)?')) {
                    DataStore.saveDvkhEntries([]);
                    setDvkhList([]);
                    showToast('success', 'Đã đặt lại danh sách DVKH về trống!');
                  }
                }}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 border border-rose-400/30 text-xs font-semibold transition-all backdrop-blur-md shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                title="Làm mới danh sách về 0 hồ sơ nếu còn sót dữ liệu mẫu"
              >
                <span>Xóa cache ({dvkhList.length})</span>
              </button>
            )}

            <button
              onClick={handleManualSync}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all backdrop-blur-md shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
              title="Đồng bộ dữ liệu với Google Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Đồng bộ Sheet</span>
            </button>
          </div>
        </div>

        {/* Global summary count pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-5 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
            <span className="text-purple-200 text-[10px] uppercase font-bold">Tổng hồ sơ</span>
            <div className="text-lg font-black mt-0.5">{dvkhList.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
            <span className="text-purple-200 text-[10px] uppercase font-bold">Chưa giao</span>
            <div className="text-lg font-black mt-0.5 text-amber-300">{countTab1Pending}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
            <span className="text-purple-200 text-[10px] uppercase font-bold">Chờ nhận QLHTĐĐ</span>
            <div className="text-lg font-black mt-0.5 text-sky-300">{tab1DeliveredWaitingConfirm.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
            <span className="text-purple-200 text-[10px] uppercase font-bold">Tồn chưa giao thi công</span>
            <div className="text-lg font-black mt-0.5 text-blue-200">{countTab2Pending}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
            <span className="text-purple-200 text-[10px] uppercase font-bold">Đang thi công</span>
            <div className="text-lg font-black mt-0.5 text-purple-200">{countTab3Pending}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
            <span className="text-purple-200 text-[10px] uppercase font-bold">Hoàn tất</span>
            <div className="text-lg font-black mt-0.5 text-emerald-300">
              {dvkhList.filter(e => e.trangThai === 'Xong').length}
            </div>
          </div>
        </div>
      </div>

      {/* Toast notification message */}
      {syncStatusMsg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-md transition-all animate-in fade-in slide-in-from-top-2 ${
          syncStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' :
          syncStatusMsg.type === 'error' ? 'bg-rose-50 text-rose-900 border border-rose-200' :
          'bg-sky-50 text-sky-900 border border-sky-200'
        }`}>
          <div className="flex items-center gap-2">
            {syncStatusMsg.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {syncStatusMsg.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
            {syncStatusMsg.type === 'info' && <RefreshCw className="w-5 h-5 text-sky-600 animate-spin shrink-0" />}
            <span>{syncStatusMsg.text}</span>
          </div>
          <button onClick={() => setSyncStatusMsg(null)} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3 SUB-TABS NAVIGATION WITH WARNING BADGES */}
      <div className="flex border-b border-slate-200 bg-white p-1.5 rounded-2xl shadow-xs gap-2">
        {/* Sub-tab 1 */}
        <button
          onClick={() => setActiveSubTab('tab1')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${
            activeSubTab === 'tab1'
              ? 'bg-purple-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Tab 1: Nhập & Giao HS (DVKH)</span>
          {countTab1Pending > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeSubTab === 'tab1' ? 'bg-amber-300 text-amber-950' : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {countTab1Pending}
            </span>
          )}
        </button>

        {/* Sub-tab 2 */}
        <button
          onClick={() => setActiveSubTab('tab2')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${
            activeSubTab === 'tab2'
              ? 'bg-purple-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Tab 2: Giao Thi Công (QLHTĐĐ)</span>
          {countTab2Pending > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeSubTab === 'tab2' ? 'bg-blue-300 text-blue-950' : 'bg-blue-100 text-blue-800 border border-blue-300'
            }`}>
              {countTab2Pending}
            </span>
          )}
        </button>

        {/* Sub-tab 3 */}
        <button
          onClick={() => setActiveSubTab('tab3')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${
            activeSubTab === 'tab3'
              ? 'bg-purple-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Tab 3: Thực Hiện & Báo Cáo</span>
          {countTab3Pending > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeSubTab === 'tab3' ? 'bg-rose-300 text-rose-950' : 'bg-rose-100 text-rose-800 border border-rose-300'
            }`}>
              {countTab3Pending}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1 CONTENT: NHẬP MỚI & GIAO HỒ SƠ DVKH */}
      {/* ========================================================= */}
      {activeSubTab === 'tab1' && (
        <div className="space-y-6 animate-fade-in">
          {/* Role-specific Notice */}
          {isDoiLeader ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Xin chào <b>{sessionUser?.name}</b> (<b>{displayRoleTitle}</b>). Bạn có quyền quản trị toàn diện: Nhập mới, Import file, Giao hồ sơ, Tiếp nhận hồ sơ từ DVKH (ở mục bên dưới) và Giao thi công cho toàn bộ nhân viên các tổ treo tháo (ở Tab 2).
              </span>
            </div>
          ) : isToLeader ? (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 text-xs text-sky-900 flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                Xin chào <b>{sessionUser?.name}</b> (<b>{displayRoleTitle}</b> - {sessionUser?.team}). Bạn có quyền xác nhận tiếp nhận hồ sơ đã giao sang QLHTĐĐ (ở mục tiếp nhận bên dưới) và giao thi công cho nhân viên thuộc tổ mình ở Tab 2.
              </span>
            </div>
          ) : isDvkhUser ? (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 text-xs text-purple-900 flex items-center gap-2.5">
              <Headphones className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                Bạn đang làm việc với tài khoản <b>Bộ phận DVKH</b>. Hãy nhập mới từng hồ sơ hoặc bấm <b>Import File</b> để đưa danh sách khách hàng cần thi công vào hệ thống, sau đó chọn hồ sơ để giao sang Đội QLHTĐĐ.
              </span>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                Tài khoản: <b>{sessionUser?.name}</b> ({displayRoleTitle}). Hồ sơ mới do Bộ phận DVKH nhập và chuyển giao. Bạn thực hiện các hồ sơ được phân công ở <b>Tab 3</b>.
              </span>
            </div>
          )}

          {/* Form: Nhập mới HS (STT tự tăng, MaKH, TenKH, DiaChi) + IMPORT FUNCTION */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700 font-bold">
                  <Plus className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-800 uppercase">
                  Nhập Mới Hồ Sơ DVKH (STT Tự Tăng)
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold hidden lg:inline mr-1">
                  STT kế tiếp: <b className="text-purple-700">{dvkhList.length + 1}</b>
                </span>

                {/* DIRECT DOWNLOAD TEMPLATE BUTTON */}
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-300 shadow-2xs active:scale-95 cursor-pointer"
                  title="Tải về file Excel mẫu có sẵn các cột chuẩn để nạp"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">File Mẫu</span>
                </button>

                {/* IMPORT BUTTON WITH HOVER TOOLTIP */}
                <div 
                  className="relative inline-block"
                  onMouseEnter={handleMouseEnterImport}
                  onMouseLeave={handleMouseLeaveImport}
                >
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={(!isDvkhUser && !isDoiLeader && !isToLeader) || isLoading}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import File (Excel / CSV)</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleImportFile}
                    className="hidden"
                  />

                  {/* HOVER TOOLTIP GUIDING IMPORT STRUCTURE */}
                  {showImportTooltip && (
                    <div 
                      onMouseEnter={handleMouseEnterImport}
                      onMouseLeave={handleMouseLeaveImport}
                      className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 p-4 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700 text-xs leading-relaxed animate-in fade-in zoom-in-95 pointer-events-auto"
                    >
                      <div className="font-bold text-emerald-400 flex items-center gap-1.5 border-b border-slate-700 pb-2 mb-2.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span className="uppercase text-[11px] tracking-wide">Cấu Trúc File Import (Excel / CSV)</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mb-2">
                        Hệ thống hỗ trợ file Excel (<b>.xlsx, .xls</b>) hoặc file <b>.csv</b>. Dòng đầu tiên là tiêu đề các cột:
                      </p>
                      <div className="bg-slate-800/90 rounded-xl p-2.5 space-y-1.5 font-mono text-[11px] border border-slate-700/80">
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-300 font-bold">• STT:</span>
                          <span className="text-slate-300 font-sans text-[10px]">Tùy chọn (Tự tăng nếu để trống)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-300 font-bold">• Mã KH:</span>
                          <span className="text-amber-300 font-sans text-[10px]">Bắt buộc (ví dụ: PK0100...)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-300 font-bold">• Tên KH:</span>
                          <span className="text-amber-300 font-sans text-[10px]">Bắt buộc (Tên khách hàng)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">• Địa chỉ:</span>
                          <span className="text-slate-400 font-sans text-[10px]">Khuyến nghị (Số nhà, đường...)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">• Số điện thoại:</span>
                          <span className="text-slate-400 font-sans text-[10px]">Tùy chọn (SĐT liên hệ)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">• Loại yêu cầu:</span>
                          <span className="text-slate-400 font-sans text-[10px]">Gắn mới 1 pha, 3 pha, Thay 3 giá...</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">• Ghi chú:</span>
                          <span className="text-slate-400 font-sans text-[10px]">Ghi chú ban đầu (nếu có)</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-700 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Tự động nhận diện tên cột linh hoạt</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadTemplate();
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-2xs active:scale-95"
                        >
                          <Download className="w-3 h-3" />
                          <span>Tải file Excel mẫu</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleAddNewRecord} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3.5">
              {/* STT */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  STT (Tự tăng)
                </label>
                <input
                  type="text"
                  value={`#${nextStt}`}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-100 text-slate-700 font-mono font-bold text-center cursor-not-allowed"
                  title="STT tự động tăng dần theo số lượng hồ sơ hiện có"
                />
              </div>

              {/* Mã KH */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã KH (MaKH) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMaKh}
                  onChange={(e) => setNewMaKh(e.target.value)}
                  placeholder="Ví dụ: PK0100..."
                  disabled={!isDvkhUser && !isDoiLeader && !isToLeader}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none uppercase font-mono disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Tên KH */}
              <div className="lg:col-span-4 sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Khách Hàng (TenKH) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTenKh}
                  onChange={(e) => setNewTenKh(e.target.value)}
                  placeholder="Họ và tên khách hàng..."
                  disabled={!isDvkhUser && !isDoiLeader && !isToLeader}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* SĐT */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số Điện Thoại (SĐT)
                </label>
                <input
                  type="text"
                  value={newSdt}
                  onChange={(e) => setNewSdt(e.target.value)}
                  placeholder="090..."
                  disabled={!isDvkhUser && !isDoiLeader && !isToLeader}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Loại yêu cầu */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Loại Yêu Cầu (Loại)
                </label>
                <select
                  value={newLoaiYeuCau}
                  onChange={(e) => setNewLoaiYeuCau(e.target.value)}
                  disabled={!isDvkhUser && !isDoiLeader && !isToLeader}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="Gắn mới">Gắn mới</option>
                  <option value="Gắn mới 1 pha">Gắn mới 1 pha</option>
                  <option value="Gắn mới 3 pha">Gắn mới 3 pha</option>
                  <option value="Thay 3 giá">Thay 3 giá</option>
                  <option value="Di dời">Di dời công tơ</option>
                  <option value="Sang tải">Sang tải công tơ</option>
                  <option value="Kiểm tra">Kiểm tra đo đếm</option>
                </select>
              </div>

              {/* Địa chỉ */}
              <div className="lg:col-span-5 sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa Chỉ Khách Hàng (DiaChi)
                </label>
                <input
                  type="text"
                  value={newDiaChi}
                  onChange={(e) => setNewDiaChi(e.target.value)}
                  placeholder="Số nhà, tên đường, phường/xã..."
                  disabled={!isDvkhUser && !isDoiLeader && !isToLeader}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Ghi chú */}
              <div className="lg:col-span-5 sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi Chú Ban Đầu (GhiChu)
                </label>
                <input
                  type="text"
                  value={newGhiChu}
                  onChange={(e) => setNewGhiChu(e.target.value)}
                  placeholder="Hẹn giờ thi công, lưu ý hiện trường..."
                  disabled={!isDvkhUser && !isDoiLeader && !isToLeader}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Nút Thêm hồ sơ */}
              <div className="lg:col-span-2 sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={(!isDvkhUser && !isDoiLeader && !isToLeader) || isAddingNew}
                  className="w-full h-[37px] flex items-center justify-center gap-1.5 px-4 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Thêm hồ sơ</span>
                </button>
              </div>
            </form>
          </div>

          {/* Table: Danh sách hồ sơ ở trạng thái chưa giao */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700 font-bold">
                  <Send className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase">
                    Hồ Sơ Chưa Giao Sang QLHTĐĐ ({tab1PendingRecords.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Chọn các hồ sơ bên dưới để giao sang Đội QLHTĐĐ (chuyển trạng thái sang "Chờ nhận").
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (tab1SelectedMaKhs.length === tab1PendingRecords.length) {
                      setTab1SelectedMaKhs([]);
                    } else {
                      setTab1SelectedMaKhs(tab1PendingRecords.map(r => r.maKh));
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  {tab1SelectedMaKhs.length === tab1PendingRecords.length && tab1PendingRecords.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
                <button
                  type="button"
                  onClick={handleDeliverToQlhtdd}
                  disabled={tab1SelectedMaKhs.length === 0 || (!isDvkhUser && !isDoiLeader)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Giao {tab1SelectedMaKhs.length > 0 ? `(${tab1SelectedMaKhs.length})` : ''} sang QLHTĐĐ</span>
                </button>
              </div>
            </div>

            {tab1PendingRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                Chưa có hồ sơ nào ở trạng thái chưa giao. Bạn có thể bấm "Thêm" hoặc "Import File" ở trên để đưa hồ sơ mới vào hệ thống.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5 border-b border-slate-200 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={tab1SelectedMaKhs.length === tab1PendingRecords.length && tab1PendingRecords.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTab1SelectedMaKhs(tab1PendingRecords.map(r => r.maKh));
                            } else {
                              setTab1SelectedMaKhs([]);
                            }
                          }}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-3 py-2.5 border-b border-slate-200 w-12 text-center">STT</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Mã KH</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Tên Khách Hàng</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Địa Chỉ</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">SĐT</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Loại</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Ngày Nhận</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Ghi Chú</th>
                      <th className="px-3 py-2.5 border-b border-slate-200 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tab1PendingRecords.map((item, idx) => {
                      const isSelected = tab1SelectedMaKhs.includes(item.maKh);
                      return (
                        <tr key={item.maKh} className={isSelected ? 'bg-purple-50/50' : 'hover:bg-slate-50'}>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTab1SelectedMaKhs(prev => [...prev, item.maKh]);
                                } else {
                                  setTab1SelectedMaKhs(prev => prev.filter(k => k !== item.maKh));
                                }
                              }}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2 text-center text-slate-500 font-mono font-bold">
                            {item.stt || (idx + 1)}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-purple-900">
                            {item.maKh}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {item.tenKh}
                          </td>
                          <td className="px-3 py-2 text-slate-600 max-w-xs truncate" title={item.diaChi}>
                            {item.diaChi || '-'}
                          </td>
                          <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">
                            {item.sdt || '-'}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                              {item.loaiYeuCau || 'Gắn mới'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-500 text-[11px] font-mono">
                            {item.ngayNhan || item.ngayTao || '-'}
                          </td>
                          <td className="px-3 py-2 text-slate-600 max-w-xs truncate italic" title={item.ghiChu}>
                            {item.ghiChu || '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {renderStatusBadge(item.trangThai || 'Chưa giao')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Xác Nhận Tiếp Nhận Hồ Sơ Đã Giao Vào QLHTĐĐ */}
          <div className="bg-gradient-to-br from-sky-50/70 via-white to-slate-50 rounded-2xl border border-sky-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sky-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-sky-600 text-white font-bold">
                  <UserCheck className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase">
                    Tiếp Nhận Hồ Sơ Đã Giao Sang QLHTĐĐ ({tab1DeliveredWaitingConfirm.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isDvkhUser 
                      ? 'Bộ phận DVKH chỉ có quyền tạo và giao hồ sơ sang Đội QLHTĐĐ. Xác nhận tiếp nhận là thẩm quyền của Đội QLHTĐĐ (Tổ phó, Tổ trưởng, Đội phó hoặc Đội trưởng).'
                      : 'Dành cho Tổ phó, Tổ trưởng, Đội phó hoặc Đội trưởng Đội QLHTĐĐ bấm xác nhận tiếp nhận hồ sơ vào Đội.'}
                  </p>
                </div>
              </div>

              {canConfirmReceipt && tab1DeliveredWaitingConfirm.length > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmAllReceipts}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tiếp nhận toàn bộ ({tab1DeliveredWaitingConfirm.length})</span>
                </button>
              )}
            </div>

            {tab1DeliveredWaitingConfirm.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                Hiện không có hồ sơ nào đang chờ xác nhận tiếp nhận vào QLHTĐĐ.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-sky-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-sky-100/70 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5 border-b border-sky-200 w-12 text-center">STT</th>
                      <th className="px-3 py-2.5 border-b border-sky-200">Mã KH</th>
                      <th className="px-3 py-2.5 border-b border-sky-200">Tên Khách Hàng</th>
                      <th className="px-3 py-2.5 border-b border-sky-200">Địa Chỉ</th>
                      <th className="px-3 py-2.5 border-b border-sky-200">Ngày Giao Từ DVKH</th>
                      <th className="px-3 py-2.5 border-b border-sky-200 text-center">Trạng Thái</th>
                      <th className="px-3 py-2.5 border-b border-sky-200 text-center w-32">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100">
                    {tab1DeliveredWaitingConfirm.map((item, idx) => (
                      <tr key={item.maKh} className="hover:bg-sky-50/50">
                        <td className="px-3 py-2 text-center text-slate-500 font-mono">
                          {item.stt || (idx + 1)}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-sky-900">
                          {item.maKh}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-800">
                          {item.tenKh}
                        </td>
                        <td className="px-3 py-2 text-slate-600 max-w-xs truncate" title={item.diaChi}>
                          {item.diaChi}
                        </td>
                        <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">
                          {item.ngayNhan || '-'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {renderStatusBadge(item.trangThai)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {canConfirmReceipt ? (
                            <button
                              type="button"
                              onClick={() => handleConfirmReceipt(item.maKh)}
                              className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                            >
                              Xác nhận nhận
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                              Chờ QLHTĐĐ nhận
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2 CONTENT: GIAO THI CÔNG QLHTĐĐ */}
      {/* ========================================================= */}
      {activeSubTab === 'tab2' && (
        <div className="space-y-6 animate-fade-in">
          {/* Notice if user is from DVKH and not Đội trưởng */}
          {isDvkhUser && !isDoiLeader && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <b>Hạn chế phân quyền:</b> Nhân sự thuộc Bộ phận DVKH không có quyền giao hồ sơ thi công ở Tab 2. Chức năng này dành cho Tổ trưởng/Tổ phó treo tháo và Đội trưởng/Đội phó phân công cho kỹ thuật viên.
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                    <UserCheck className="w-4 h-4" />
                  </span>
                  <span>Hồ Sơ Đã Nhận Tồn Chưa Giao Thi Công ({tab2Records.length})</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Chọn hồ sơ và chọn nhân viên thực hiện để giao thi công (cập nhật Trạng thái = "Đã Giao thi công", Ngày giao = hiện tại).
                </p>
              </div>

              {/* Assignment controls */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  disabled={(isDvkhUser && !isDoiLeader) || (!isDoiLeader && !isToLeader)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-48 disabled:bg-slate-100"
                >
                  <option value="">-- Chọn nhân viên thi công --</option>
                  {eligibleAssignees.map(m => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.team})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAssignToTechnician}
                  disabled={(isDvkhUser && !isDoiLeader) || tab2SelectedMaKhs.length === 0 || !selectedAssignee}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Giao thi công {tab2SelectedMaKhs.length > 0 ? `(${tab2SelectedMaKhs.length})` : ''}</span>
                </button>
              </div>
            </div>

            {tab2Records.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                Không có hồ sơ tồn chưa giao thi công. Tất cả hồ sơ đã được phân công hoặc chưa tiếp nhận.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5 border-b border-slate-200 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={tab2SelectedMaKhs.length === tab2Records.length && tab2Records.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTab2SelectedMaKhs(tab2Records.map(r => r.maKh));
                            } else {
                              setTab2SelectedMaKhs([]);
                            }
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-3 py-2.5 border-b border-slate-200 w-12 text-center">STT</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Mã KH</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Tên Khách Hàng</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Địa Chỉ</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Loại Yêu Cầu</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Ngày Tiếp Nhận</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Người Tiếp Nhận</th>
                      <th className="px-3 py-2.5 border-b border-slate-200 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tab2Records.map((item, idx) => {
                      const isSelected = tab2SelectedMaKhs.includes(item.maKh);
                      return (
                        <tr key={item.maKh} className={isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTab2SelectedMaKhs(prev => [...prev, item.maKh]);
                                } else {
                                  setTab2SelectedMaKhs(prev => prev.filter(k => k !== item.maKh));
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2 text-center text-slate-500 font-mono">
                            {item.stt || (idx + 1)}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-blue-900">
                            {item.maKh}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {item.tenKh}
                          </td>
                          <td className="px-3 py-2 text-slate-600 max-w-xs truncate" title={item.diaChi}>
                            {item.diaChi}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                              {item.loaiYeuCau || 'Gắn mới'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">
                            {item.ngayNhan || '-'}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-700">
                            {item.nguoiNhan || '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {renderStatusBadge(item.trangThai)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3 CONTENT: THỰC HIỆN & BÁO CÁO KẾT QUẢ */}
      {/* ========================================================= */}
      {activeSubTab === 'tab3' && (
        <div className="space-y-6 animate-fade-in">
          {/* Notice if user is from DVKH and not Đội trưởng */}
          {isDvkhUser && !isDoiLeader && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <b>Hạn chế phân quyền:</b> Nhân sự thuộc Bộ phận DVKH không thể cập nhật kết quả thi công ở Tab 3. Chỉ nhân viên được giao việc mới có thể cập nhật kết quả.
              </div>
            </div>
          )}

          {/* Manager toggle to view all vs only personal records */}
          {(isDoiLeader || isToLeader) && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-slate-700 font-semibold">
                Chế độ xem của Lãnh đạo ({displayRoleTitle}):
              </span>
              <button
                type="button"
                onClick={() => setManagerViewAllTab3(!managerViewAllTab3)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-800 shadow-2xs cursor-pointer"
              >
                {managerViewAllTab3 ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                <span>{managerViewAllTab3 ? 'Đang xem tất cả hồ sơ thi công' : 'Chỉ xem hồ sơ giao cho tôi'}</span>
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                    <CheckSquare className="w-4 h-4" />
                  </span>
                  <span>Hồ Sơ Đã Giao Chưa Hoàn Tất ({tab3Records.length})</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bấm vào nút "Cập nhật kết quả" trên từng dòng để báo cáo hoàn tất (Xong) hoặc ghi nhận trở ngại (kèm ghi chú bằng giọng nói).
                </p>
              </div>

              <div className="text-[11px] text-slate-500">
                Chính sách ngày hoàn tất:{' '}
                <b>{allowCustomNgayHoanTat ? 'Cho phép chọn ngày' : 'Cố định ngày hiện tại'}</b>
              </div>
            </div>

            {tab3Records.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                {isDvkhUser && !isDoiLeader
                  ? 'Hiện không có hồ sơ nào đang trong trạng thái thi công hoặc trở ngại.'
                  : 'Bạn không có hồ sơ nào được phân công chưa hoàn tất. Chúc mừng bạn đã hoàn thành công việc!'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5 border-b border-slate-200 w-12 text-center">STT</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Mã KH</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Tên Khách Hàng</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Địa Chỉ</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Người Thực Hiện</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Ngày Giao</th>
                      <th className="px-3 py-2.5 border-b border-slate-200 text-center">Trạng Thái</th>
                      <th className="px-3 py-2.5 border-b border-slate-200">Ghi Chú</th>
                      <th className="px-3 py-2.5 border-b border-slate-200 text-center w-24">Ảnh</th>
                      <th className="px-3 py-2.5 border-b border-slate-200 text-center w-32">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tab3Records.map((item, idx) => (
                      <tr key={item.maKh} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-center text-slate-500 font-mono">
                          {item.stt || (idx + 1)}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-800">
                          {item.maKh}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-800">
                          {item.tenKh}
                        </td>
                        <td className="px-3 py-2 text-slate-600 max-w-xs truncate" title={item.diaChi}>
                          {item.diaChi}
                        </td>
                        <td className="px-3 py-2 font-semibold text-purple-900">
                          {item.nguoiThucHien || item.nguoiNhan || '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">
                          {item.ngayGiao || '-'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {renderStatusBadge(item.trangThai)}
                        </td>
                        <td className="px-3 py-2 text-slate-600 max-w-xs truncate italic" title={item.ghiChu}>
                          {item.ghiChu || '-'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.pic ? (
                            <button
                              type="button"
                              onClick={() => setViewingImageModal({ url: item.pic!, title: `Ảnh chứng minh - KH ${item.tenKh} (${item.maKh})` })}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[11px] font-bold border border-purple-200 cursor-pointer transition-all shadow-2xs hover:scale-105"
                              title="Bấm để xem ảnh chứng minh trở ngại"
                            >
                              <Camera className="w-3.5 h-3.5 text-purple-600" />
                              <span>Xem</span>
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[10px] italic">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => openUpdateModal(item)}
                            disabled={isDvkhUser && !isDoiLeader}
                            className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            Báo cáo kết quả
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* UPDATE MODAL IN TAB 3: NGÀY HOÀN TẤT + KẾT QUẢ + GHI CHÚ BẰNG GIỌNG NÓI */}
      {/* ========================================================= */}
      {updatingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-800 to-indigo-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-purple-200" />
                <h3 className="font-bold text-sm uppercase">Cập Nhật Kết Quả Hồ Sơ Thi Công</h3>
              </div>
              <button
                type="button"
                onClick={() => setUpdatingRecord(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Customer info recap */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>Khách hàng: <b>{updatingRecord.tenKh}</b> ({updatingRecord.maKh})</div>
                <div className="text-slate-600">Địa chỉ: {updatingRecord.diaChi}</div>
                <div className="text-slate-600">Người thực hiện: <b>{updatingRecord.nguoiThucHien || updatingRecord.nguoiNhan}</b></div>
              </div>

              {/* Ngày hoàn tất */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Ngày Hoàn Tất (dd/mm/yyyy)</span>
                  {allowCustomNgayHoanTat ? (
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Được phép chọn ngày
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">
                      Cố định ngày hiện tại
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={updateNgayHoanTat}
                  onChange={(e) => setUpdateNgayHoanTat(e.target.value)}
                  disabled={!allowCustomNgayHoanTat}
                  placeholder="dd/mm/yyyy"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-mono disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              {/* Kết quả (Chưa / Xong) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kết Quả Thực Hiện <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUpdateKetQua('Xong')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      updateKetQua === 'Xong'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xong (Hoàn tất)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUpdateKetQua('Chưa')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      updateKetQua === 'Chưa'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Chưa (Trở ngại)</span>
                  </button>
                </div>
              </div>

              {/* Ghi chú & Voice note */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Ghi Chú {updateKetQua === 'Chưa' ? <span className="text-rose-500 font-bold">* (Bắt buộc)</span> : <span className="text-slate-400 font-normal">(Tùy chọn)</span>}
                  </label>
                  
                  {/* Speech to text microphone button */}
                  <button
                    type="button"
                    onClick={handleToggleVoiceRecording}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                      isRecordingVoice
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                    }`}
                    title="Bấm để nói nội dung ghi chú tiếng Việt"
                  >
                    {isRecordingVoice ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isRecordingVoice ? 'Đang nghe...' : 'Nói ghi chú (Voice)'}</span>
                  </button>
                </div>

                {voiceNotice && (
                  <div className="mb-2 text-[11px] text-rose-600 font-semibold flex items-center gap-1.5 bg-rose-50 p-2 rounded-lg border border-rose-200">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    <span>{voiceNotice}</span>
                  </div>
                )}

                <textarea
                  rows={3}
                  value={updateGhiChu}
                  onChange={(e) => setUpdateGhiChu(e.target.value)}
                  placeholder={updateKetQua === 'Chưa' ? 'Bắt buộc nhập lý do chưa hoàn thành (Ví dụ: khách hàng vắng nhà, sự cố cáp...)' : 'Ghi chú thêm nếu có...'}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none leading-relaxed"
                />
              </div>

              {/* PHẦN ĐẶC BIỆT DÀNH CHO KHÁCH HÀNG TRỞ NGẠI: NGÀY GIỜ BÁO CÁO & LƯU ẢNH CHỨNG MINH */}
              {updateKetQua === 'Chưa' && (
                <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex items-start gap-2 text-xs text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Quy định ghi nhận khách hàng trở ngại:</span>
                      <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                        Hệ thống tự động thêm ngày giờ báo cáo vào ghi chú: <code>({getCurrentDateTimeStr()}) [nội dung ghi chú]; </code>. Đồng thời chụp/tải ảnh chứng minh lưu tự động về thư mục Google Drive.
                      </p>
                    </div>
                  </div>

                  {/* Ảnh chứng minh trở ngại */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-purple-700" />
                        <span>Hình ảnh chứng minh trở ngại (Google Drive)</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        DVKH_{updatingRecord.maKh}.jpg
                      </span>
                    </label>

                    {/* Hidden inputs for Camera and File picker */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageSelected}
                      className="hidden"
                    />
                    <input
                      ref={fileInputPicRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelected}
                      className="hidden"
                    />

                    {/* Buttons: Camera & File upload */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={isUploadingPic}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Chụp ảnh (Camera)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputPicRef.current?.click()}
                        disabled={isUploadingPic}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span>Chọn ảnh từ máy</span>
                      </button>
                    </div>

                    {/* Loading State */}
                    {isUploadingPic && (
                      <div className="mt-2.5 p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center gap-2.5 text-xs text-purple-900 animate-pulse">
                        <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
                        <div>
                          <div className="font-bold">Đang nén tối ưu & lưu lên Google Drive...</div>
                          <div className="text-[10px] text-purple-700">Tối ưu kích thước nhỏ nhất (~30-50KB) để lưu nhanh nhất</div>
                        </div>
                      </div>
                    )}

                    {/* Error State */}
                    {uploadPicError && (
                      <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="flex-1">{uploadPicError}</span>
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="text-[11px] font-bold text-rose-800 underline cursor-pointer"
                        >
                          Thử lại
                        </button>
                      </div>
                    )}

                    {/* Photo preview / thumbnail */}
                    {(uploadedPicUrl || picPreview) && !isUploadingPic && (
                      <div className="mt-2.5 p-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-3 shadow-xs">
                        <img
                          src={uploadedPicUrl || picPreview}
                          alt="Chứng minh trở ngại"
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90"
                          onClick={() => setViewingImageModal({ url: uploadedPicUrl || picPreview, title: `DVKH_${updatingRecord.maKh}.jpg` })}
                        />
                        <div className="flex-1 min-w-0 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Đã lưu ảnh Google Drive</span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-600 truncate">
                            DVKH_{updatingRecord.maKh}.jpg
                          </div>
                          {picSizeKb > 0 && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                              {picSizeKb} KB (Đã tối ưu siêu nhẹ)
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setViewingImageModal({ url: uploadedPicUrl || picPreview, title: `DVKH_${updatingRecord.maKh}.jpg` })}
                            className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title="Xem kích thước lớn"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedPicUrl('');
                              setPicPreview('');
                              setPicSizeKb(0);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa ảnh này"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-1 text-[10px] text-slate-400 italic">
                      Thư mục lưu trữ: Google Drive (DVKH) • Tên file: DVKH_{updatingRecord.maKh}.jpg
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUpdatingRecord(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveResult}
                className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Lưu kết quả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. PHẦN DƯỚI TAB DVKH: DANH SÁCH TỔNG HỢP & BỘ LỌC HÌNH PHỄU */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        {/* Header of bottom list */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 text-purple-700 font-bold">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase">
                Danh Sách Toàn Bộ Hồ Sơ DVKH ({bottomFilteredList.length} / {dvkhList.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Hiển thị Tên KH, Địa chỉ, Ngày nhận, Ngày hoàn tất, Ghi chú và Trạng thái HS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Tìm tên, mã, địa chỉ..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none w-44 sm:w-56"
              />
              {filterSearch && (
                <button onClick={() => setFilterSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Funnel Filter Button */}
            <button
              type="button"
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                showFilterDrawer || filterTrangThai !== 'ALL' || filterAssignee !== 'ALL' || filterFromDate || filterToDate
                  ? 'bg-purple-700 text-white border-purple-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="Mở bộ lọc tìm kiếm nâng cao"
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bộ lọc (Phễu)</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              title="Xuất file CSV / Excel"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Funnel Filter Panel */}
        {showFilterDrawer && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in slide-in-from-top-1 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-purple-600" />
                <span>Tiêu Chí Lọc Nâng Cao</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setFilterTrangThai('ALL');
                  setFilterAssignee('ALL');
                  setFilterFromDate('');
                  setFilterToDate('');
                  setFilterSearch('');
                }}
                className="text-purple-700 hover:text-purple-900 font-semibold cursor-pointer text-[11px]"
              >
                Đặt lại bộ lọc
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Trạng thái hồ sơ
                </label>
                <select
                  value={filterTrangThai}
                  onChange={(e) => setFilterTrangThai(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none bg-white"
                >
                  <option value="ALL">-- Tất cả trạng thái --</option>
                  <option value="Chưa giao">Chưa giao</option>
                  <option value="Chờ nhận">Chờ nhận</option>
                  <option value="Đã Nhận">Đã Nhận</option>
                  <option value="Đã Giao thi công">Đã Giao thi công</option>
                  <option value="Trở ngại">Trở ngại</option>
                  <option value="Xong">Xong</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Người thực hiện / Nhận
                </label>
                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none bg-white"
                >
                  <option value="ALL">-- Tất cả nhân viên --</option>
                  {Array.from(new Set(dvkhList.map(e => e.nguoiThucHien || e.nguoiNhan).filter(Boolean))).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Từ ngày (Ngày nhận / Tạo)
                </label>
                <input
                  type="date"
                  value={filterFromDate}
                  onChange={(e) => setFilterFromDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={filterToDate}
                  onChange={(e) => setFilterToDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* The Main Data Table */}
        {bottomFilteredList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs italic">
            Chưa có hồ sơ nào trong danh sách. Dữ liệu sẽ xuất hiện khi bạn thêm mới, import file hoặc khi đồng bộ từ Google Sheets.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2.5 border-b border-slate-200 w-12 text-center">STT</th>
                  <th className="px-3 py-2.5 border-b border-slate-200">Mã KH</th>
                  <th className="px-3 py-2.5 border-b border-slate-200">Tên Khách Hàng</th>
                  <th className="px-3 py-2.5 border-b border-slate-200">Địa Chỉ</th>
                  <th className="px-3 py-2.5 border-b border-slate-200">Loại</th>
                  <th className="px-3 py-2.5 border-b border-slate-200">Ngày Nhận</th>
                  <th className="px-3 py-2.5 border-b border-slate-200">Ngày Hoàn Tất</th>
                  <th className="px-3 py-2.5 border-b border-slate-200">Ghi Chú</th>
                  <th className="px-3 py-2.5 border-b border-slate-200 text-center">Ảnh</th>
                  <th className="px-3 py-2.5 border-b border-slate-200 text-center">Trạng Thái HS</th>
                  <th className="px-3 py-2.5 border-b border-slate-200">Người Thực Hiện</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bottomFilteredList.map((item, idx) => (
                  <tr key={item.maKh} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 text-center text-slate-500 font-mono font-bold">
                      {item.stt || (idx + 1)}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-purple-900">
                      {item.maKh}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-800">
                      {item.tenKh}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate" title={item.diaChi}>
                      {item.diaChi || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                        {item.loaiYeuCau || 'Gắn mới'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 font-mono text-[11px]">
                      {item.ngayNhan || item.ngayTao || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 font-mono text-[11px]">
                      {item.ngayHoanTat || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate italic" title={item.ghiChu}>
                      {item.ghiChu || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {item.pic ? (
                        <button
                          type="button"
                          onClick={() => setViewingImageModal({ url: item.pic!, title: `Ảnh chứng minh - KH ${item.tenKh} (${item.maKh})` })}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-200 cursor-pointer transition-all hover:scale-105"
                          title="Bấm để xem ảnh chứng minh"
                        >
                          <Camera className="w-3 h-3 text-purple-600" />
                          <span>Xem</span>
                        </button>
                      ) : (
                        <span className="text-slate-300 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {renderStatusBadge(item.trangThai)}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700">
                      {item.nguoiThucHien || item.nguoiNhan || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LIGHTBOX MODAL ĐỂ XEM ẢNH CHỨNG MINH KÍCH THƯỚC ĐẦY ĐỦ */}
      {viewingImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-purple-800 to-indigo-800 text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-200" />
                <h3 className="font-bold text-xs uppercase">{viewingImageModal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingImageModal(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-100 flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-auto">
              <img
                src={viewingImageModal.url}
                alt="Ảnh chứng minh"
                className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-md"
              />
            </div>
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
              <a
                href={viewingImageModal.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-purple-700 hover:text-purple-900 font-bold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở trong tab mới / Google Drive</span>
              </a>
              <button
                type="button"
                onClick={() => setViewingImageModal(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
