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
  Minimize2
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { DataStore, KthtddEntry, SheetMember } from '../store/DataStore';

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

// Helper: Format phone number with leading 0 (e.g. 989667788 -> 0989667788)
export const formatPhoneNumber = (rawPhone?: string | number): string => {
  if (rawPhone === undefined || rawPhone === null) return '';
  let p = String(rawPhone).trim().replace(/\s+/g, '');
  if (!p || p === '0' || p === '-' || p === 'N/A') return '';
  // Convert country code +84 or 84
  if (p.startsWith('+84')) {
    p = '0' + p.slice(3);
  } else if (p.startsWith('84') && p.length >= 11) {
    p = '0' + p.slice(2);
  }
  // Add leading 0 if purely numeric and doesn't start with 0
  if (/^\d+$/.test(p) && !p.startsWith('0')) {
    p = '0' + p;
  }
  return p;
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

  // Section 2.4: Thống kê
  const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month' | 'all'>('day');
  const [statsCustomDate, setStatsCustomDate] = useState<string>('');

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
  const handleSyncFromSheet = async () => {
    try {
      setSyncing(true);
      setSyncProgress('Đang kết nối tới Google Sheets...');
      const fresh = await DataStore.fetchKthtddFromSheet(undefined, msg => {
        setSyncProgress(msg);
      });
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
      setInspectSuccessMsg('');
      // Auto open inspect section if closed
      setOpenSections(prev => ({ ...prev, inspect: true }));
    }
  }, [selectedCustomer]);

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

  // Grouping for Tree View (Khu vực -> Mã trạm -> Tên trạm -> Mã KH -> Tên KH)
  // Hỗ trợ tìm kiếm theo: Mã trạm, Tên trạm, Mã KH, Tên KH, Địa chỉ (cả có dấu & không dấu)
  const treeData = useMemo<Record<string, AreaNode>>(() => {
    const qRaw = searchQuery.trim();
    const qNorm = normalizeSearchStr(qRaw);
    const qLower = qRaw.toLowerCase();

    let filtered = entries;
    if (qNorm) {
      filtered = entries.filter(e => {
        // Direct match with accents
        if (
          e.maTram?.toLowerCase().includes(qLower) ||
          e.tenTram?.toLowerCase().includes(qLower) ||
          e.maKh?.toLowerCase().includes(qLower) ||
          e.tenKh?.toLowerCase().includes(qLower) ||
          e.diaChi?.toLowerCase().includes(qLower)
        ) {
          return true;
        }

        // Normalized diacritic-insensitive match
        const maTramNorm = normalizeSearchStr(e.maTram);
        const tenTramNorm = normalizeSearchStr(e.tenTram);
        const maKhNorm = normalizeSearchStr(e.maKh);
        const tenKhNorm = normalizeSearchStr(e.tenKh);
        const diaChiNorm = normalizeSearchStr(e.diaChi);

        return (
          maTramNorm.includes(qNorm) ||
          tenTramNorm.includes(qNorm) ||
          maKhNorm.includes(qNorm) ||
          tenKhNorm.includes(qNorm) ||
          diaChiNorm.includes(qNorm)
        );
      });
    }

    const areaMap: Record<string, AreaNode> = {};

    for (const item of filtered) {
      const kv = item.khuVuc || 'Chưa phân khu vực';
      const stKey = item.maTram || item.tenTram || 'Không rõ trạm';

      if (!areaMap[kv]) {
        areaMap[kv] = {
          khuVuc: kv,
          totalKh: 0,
          checkedKh: 0,
          stations: {}
        };
      }
      areaMap[kv].totalKh++;
      if (item.ketQua && item.ketQua.trim().length > 0) {
        areaMap[kv].checkedKh++;
      }

      if (!areaMap[kv].stations[stKey]) {
        areaMap[kv].stations[stKey] = {
          maTram: item.maTram || '',
          tenTram: item.tenTram || 'Trạm không tên',
          khuVuc: kv,
          nguoiThucHien: item.nguoiThucHien || '',
          totalKh: 0,
          checkedKh: 0,
          customers: []
        };
      }

      areaMap[kv].stations[stKey].totalKh++;
      if (item.ketQua && item.ketQua.trim().length > 0) {
        areaMap[kv].stations[stKey].checkedKh++;
      }
      if (!areaMap[kv].stations[stKey].nguoiThucHien && item.nguoiThucHien) {
        areaMap[kv].stations[stKey].nguoiThucHien = item.nguoiThucHien;
      }
      areaMap[kv].stations[stKey].customers.push(item);
    }

    return areaMap;
  }, [entries, searchQuery]);

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

  // Save Assignment
  const handleSaveAssign = async () => {
    if (!assignStation) return;
    if (selectedAssignees.length === 0) {
      setAssignMsg({ text: 'Vui lòng chọn ít nhất 1 nhân viên để phân công.', type: 'error' });
      return;
    }

    const nguoiThucHien = selectedAssignees.join('; ');
    setIsSavingAssign(true);
    setAssignMsg(null);

    try {
      const res = await DataStore.assignKthtdd({
        maTram: assignStation.maTram,
        nguoiThucHien
      });

      if (res.ok) {
        setAssignMsg({ text: `Đã phân công thành công cho trạm ${assignStation.tenTram}!`, type: 'success' });
        setTimeout(() => {
          setAssignStation(null);
          setAssignMsg(null);
        }, 1200);
      } else {
        setAssignMsg({ text: res.message || 'Lỗi phân công', type: 'error' });
      }
    } catch (e: any) {
      setAssignMsg({ text: e.message || 'Lỗi kết nối', type: 'error' });
    } finally {
      setIsSavingAssign(false);
    }
  };

  // Save Customer Inspection Result (Section 2.2)
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

    setIsSavingInspect(true);
    setInspectSuccessMsg('');

    try {
      const res = await DataStore.updateKthtdd({
        maKh: selectedCustomer.maKh,
        ngay: inspectNgay || getTodayFormatted(),
        ketQua: inspectKetQua,
        chi: inspectChi,
        deXuat: inspectDeXuat
      });

      if (res.ok) {
        setInspectSuccessMsg(`✓ Đã lưu kết quả kiểm tra cho khách hàng ${selectedCustomer.tenKh} (${selectedCustomer.maKh})`);

        if (andNext) {
          const sameStationKhs = entries.filter(
            e => e.maTram === selectedCustomer.maTram && e.maKh !== selectedCustomer.maKh && !e.ketQua
          );
          if (sameStationKhs.length > 0) {
            setSelectedMaKh(sameStationKhs[0].maKh);
          } else {
            const allInStation = entries.filter(e => e.maTram === selectedCustomer.maTram);
            const currIdx = allInStation.findIndex(e => e.maKh === selectedCustomer.maKh);
            if (currIdx !== -1 && currIdx < allInStation.length - 1) {
              setSelectedMaKh(allInStation[currIdx + 1].maKh);
            }
          }
        }
      } else {
        alert('Lỗi cập nhật: ' + res.message);
      }
    } catch (e: any) {
      alert('Lỗi lưu kết quả: ' + (e.message || String(e)));
    } finally {
      setIsSavingInspect(false);
    }
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

  // Export List to Excel (Format Phone number with leading 0)
  const handleExportExcel = () => {
    if (filteredListEntries.length === 0) {
      alert('Không có dữ liệu để xuất Excel.');
      return;
    }

    const title = listType === 'done' ? 'DANH SÁCH ĐÃ KIỆN TOÀN HTDD' : 'DANH SÁCH CHƯA KIỆN TOÀN HTDD';
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
      'Đề xuất': item.deXuat
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kiện toàn HTDD');

    const fileName = `Kien_Toan_HTDD_${listType === 'done' ? 'Da_Kien_Toan' : 'Chua_Kien_Toan'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Section 2.4: Thống kê số liệu thực hiện (đã có kết quả) theo ngày, tuần, tháng
  const statsData = useMemo(() => {
    const doneEntries = entries.filter(e => e.ketQua && e.ketQua.trim().length > 0);
    const now = new Date();
    const todayStr = getTodayFormatted();

    const parseDateStr = (str: string) => {
      if (!str) return null;
      const parts = str.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      return null;
    };

    const filteredByTime = doneEntries.filter(item => {
      if (statsPeriod === 'all') return true;

      const itemDate = parseDateStr(item.ngay);
      if (!itemDate) return false;

      if (statsPeriod === 'day') {
        const targetDay = statsCustomDate || todayStr;
        return item.ngay.trim() === targetDay.trim();
      }

      if (statsPeriod === 'week') {
        const dayOfWeek = now.getDay() || 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() - dayOfWeek + 1);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        return itemDate >= monday && itemDate <= sunday;
      }

      if (statsPeriod === 'month') {
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
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
      areaList: Object.values(areaStatsMap),
      assigneeList: Object.values(assigneeStatsMap).sort((a, b) => b.doneCount - a.doneCount)
    };
  }, [entries, statsPeriod, statsCustomDate]);

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
              onClick={handleSyncFromSheet}
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
                  Khu vực ➔ Trạm ➔ KH
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

            {/* Search Input with Voice Mic - Hỗ trợ tìm kiếm theo Mã trạm, Tên trạm, Mã KH, Tên KH, Địa chỉ */}
            <div className="relative flex items-center mt-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm Mã trạm, Tên trạm, Mã KH, Tên KH, Địa chỉ..."
                className="w-full pl-9 pr-20 py-2.5 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#005a9c] focus:ring-2 focus:ring-[#005a9c]/20 outline-none transition-all placeholder:text-slate-400 font-medium"
              />

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-10 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

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
                            const isStationMatched = searchQuery.trim().length > 0 && (
                              normalizeSearchStr(station.maTram).includes(normalizeSearchStr(searchQuery)) ||
                              normalizeSearchStr(station.tenTram).includes(normalizeSearchStr(searchQuery))
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

                                {/* Level 3: Mã KH -> Tên KH */}
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
                                              <b>{customer.maKh}</b> ➔ {customer.tenKh}
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

                    <div className="flex items-center gap-1.5">
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

                  {/* Grid details (Phone formatted with leading 0) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 text-slate-600">
                    <div className="flex items-start gap-1.5 sm:col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>
                        <b className="text-slate-700">Địa chỉ:</b> {selectedCustomer.diaChi || 'Chưa có thông tin'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>
                        <b className="text-slate-700">Khu vực:</b> {selectedCustomer.khuVuc}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">
                        <b className="text-slate-700">Trạm:</b> {selectedCustomer.maTram} - {selectedCustomer.tenTram}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-500">No:</span>
                      <span>
                        <b className="text-slate-700">Số No:</b> {selectedCustomer.soNo || 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-500">DS:</span>
                      <span>
                        <b className="text-slate-700">Danh số:</b> {selectedCustomer.danhSo || 'N/A'}
                      </span>
                    </div>

                    {/* Số điện thoại (Tự động thêm số 0 ở trước - Requirement 3) */}
                    {selectedCustomer.soDienThoai && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>
                          <b className="text-slate-700">Số ĐT:</b>{' '}
                          <a
                            href={`tel:${formatPhoneNumber(selectedCustomer.soDienThoai)}`}
                            className="text-[#005a9c] hover:underline font-bold font-mono"
                          >
                            {formatPhoneNumber(selectedCustomer.soDienThoai)}
                          </a>
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 sm:col-span-2">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>
                        <b className="text-slate-700">Người thực hiện:</b>{' '}
                        {selectedCustomer.nguoiThucHien || 'Chưa phân công'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Input Section */}
                <div className="bg-white rounded-xl border border-teal-200/80 p-3 md:p-4 shadow-xs flex flex-col gap-3">
                  <div className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span>Nhập kết quả kiểm tra</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* 1. Trường Ngày (mặc định hôm nay dd/mm/yyyy) */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#005a9c]" />
                        <span>Ngày kiểm tra</span>
                      </label>
                      <input
                        type="text"
                        value={inspectNgay}
                        onChange={e => setInspectNgay(e.target.value)}
                        placeholder="dd/mm/yyyy"
                        className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-[#005a9c] focus:ring-1 focus:ring-[#005a9c] outline-none font-medium"
                      />
                    </div>

                    {/* 2. Trường Kết quả: chỉ 2 giá trị "Bình thường" hoặc "Không" */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Kết quả <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectKetQua('Bình thường')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all border ${
                            inspectKetQua === 'Bình thường'
                              ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Bình thường</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInspectKetQua('Không')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all border ${
                            inspectKetQua === 'Không'
                              ? 'bg-rose-600 border-rose-700 text-white shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Không</span>
                        </button>
                      </div>
                    </div>

                    {/* 3. Trường Chì?: chỉ 2 trạng thái "Có" hoặc "Không" */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Chì? <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectChi('Có')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all border ${
                            inspectChi === 'Có'
                              ? 'bg-blue-600 border-blue-700 text-white shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Có chì</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInspectChi('Không')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all border ${
                            inspectChi === 'Không'
                              ? 'bg-amber-600 border-amber-700 text-white shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Không chì</span>
                        </button>
                      </div>
                    </div>
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
                                  <a
                                    href={`tel:${formattedPhone}`}
                                    onClick={e => e.stopPropagation()}
                                    className="hover:underline hover:text-[#005a9c]"
                                  >
                                    {formattedPhone}
                                  </a>
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
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedMaKh(item.maKh);
                                    setMobileTab('inspect');
                                    setOpenSections(prev => ({ ...prev, inspect: true }));
                                  }}
                                  className="px-2 py-1 bg-[#005a9c] hover:bg-[#004b87] text-white text-[10px] font-bold rounded shadow-xs"
                                >
                                  Kiểm tra
                                </button>
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
                    onClick={() => {
                      setStatsPeriod('day');
                      setStatsCustomDate('');
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statsPeriod === 'day' ? 'bg-[#005a9c] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatsPeriod('week');
                      setStatsCustomDate('');
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statsPeriod === 'week' ? 'bg-[#005a9c] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tuần này
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatsPeriod('month');
                      setStatsCustomDate('');
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statsPeriod === 'month' ? 'bg-[#005a9c] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tháng này
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatsPeriod('all');
                      setStatsCustomDate('');
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statsPeriod === 'all' ? 'bg-[#005a9c] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả
                  </button>
                </div>

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
                  📊 Thống kê đang thu gọn • Đã kiểm tra: <b>{statsData.totalDone.toLocaleString('vi-VN')}</b> KH (Bình thường: <b>{statsData.totalBinhThuong}</b>, Không: <b>{statsData.totalKhong}</b>)
                </span>
                <span className="text-emerald-600 font-bold text-[11px] underline">Mở rộng ➔</span>
              </div>
            ) : (
              <>
                {/* Custom date picker if period === 'day' */}
                {statsPeriod === 'day' && (
                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <span className="font-bold text-slate-600">Chọn ngày xem thống kê:</span>
                    <input
                      type="text"
                      value={statsCustomDate}
                      onChange={e => setStatsCustomDate(e.target.value)}
                      placeholder={`Mặc định: ${getTodayFormatted()}`}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-medium outline-none text-xs"
                    />
                    {statsCustomDate && (
                      <button
                        type="button"
                        onClick={() => setStatsCustomDate('')}
                        className="text-xs text-rose-500 font-bold hover:underline"
                      >
                        Về hôm nay
                      </button>
                    )}
                  </div>
                )}

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
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#005a9c]" />
                    <span>Thống kê theo Từng Khu vực</span>
                  </span>
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
    </div>
  );
}
