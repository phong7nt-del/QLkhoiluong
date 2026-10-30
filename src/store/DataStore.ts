import Papa from 'papaparse';
import { get, set, del } from 'idb-keyval';
import { PermissionStore, normalizeRoleStr } from './PermissionStore';

export interface Station {
  id: string; // Mã trạm
  name: string; // Tên trạm
  type: string; // Loại trạm
  area: string; // Khu vực (Tổ)
  details: Record<string, string>; // Tất cả các thông tin khác
}

export interface WorkloadEntry {
  id: string;
  team: string;
  members: string[]; // Thay workGroup bằng members
  content: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  isLocal?: boolean;
}

export interface TaskProgress {
  id: string; // TT
  content: string; // Nội dung
  reference: string; // căn cứ
  deadline: string; // ngày hoàn tất (dd/mm/yyyy)
  assignee: string; // Phân công
  status: string; // Hoàn tất ('xong' or '')
  explanation?: string; // Giải trình
  isLocal?: boolean;
  timestamp?: number;
}

export interface XuLyDoXaEntry {
  stt?: number;
  loaiXl: string;
  nguoiXl: string;
  thoiGianXl: string;
  maDd: string;
  tenKh?: string;
  cachXl: string;
  ketQua?: string;
  ghiChu: string;
}

export interface SheetMember {
  team: string;
  name: string;
  role?: string;
  msnv?: string;
  sinhNhat?: string;
  boPhanCongTac?: string;
  boPhan?: string;
  [key: string]: any;
}

export interface KthtddEntry {
  stt?: string | number;
  maKh: string;
  tenKh: string;
  diaChi: string;
  maTram: string;
  tenTram: string;
  danhSo: string;
  soDienThoai: string;
  soNo: string;
  khuVuc: string;
  ngay: string;
  ketQua: string; // 'Bình thường' | 'Không' | ''
  chi: string;    // 'Có' | 'Không' | ''
  deXuat: string;
  nguoiThucHien: string;
  x?: string;     // Tọa độ X (Vĩ độ / Latitude hoặc X sheet)
  y?: string;     // Tọa độ Y (Kinh độ / Longitude hoặc Y sheet)
  pic?: string;   // Đường link ảnh công tơ trên Google Drive (trường Pic sheet KTHTDD)
}

export interface DvkhEntry {
  stt?: number | string;
  maKh: string;
  tenKh: string;
  diaChi: string;
  ngayNhan?: string; // dd/mm/yyyy hh:mm:ss (Ngày nhận hồ sơ vào QLHTĐĐ)
  nguoiNhan?: string; // Tên người nhận (Tổ trưởng/Đội phó/Đội trưởng)
  ngayGiao?: string; // dd/mm/yyyy hh:mm:ss (Ngày giao thi công cho nhân viên)
  nguoiGiao?: string; // Tên người giao việc
  nguoiThucHien?: string; // Nhân viên thực hiện thi công
  ngayHoanTat?: string; // dd/mm/yyyy
  ketQua?: 'Chưa' | 'Xong' | ''; // Kết quả thực hiện
  ghiChu?: string; // Ghi chú (bắt buộc nếu Chưa)
  sdt?: string; // Số điện thoại liên hệ khách hàng
  trangThai: 'Chưa giao' | 'Chờ giao' | 'Chờ nhận' | 'Đã Nhận' | 'Đã Giao thi công' | 'Trở ngại' | 'Xong';
  loaiYeuCau?: string; // Gắn mới, Thay 3 giá, Di dời, v.v.
  ngayTao?: string; // dd/mm/yyyy hh:mm:ss
  nguoiTao?: string; // Người tạo từ DVKH
  pic?: string; // Link ảnh chứng minh trở ngại trên Google Drive
  isLocal?: boolean;
}

export interface LocalDvkhUpdate {
  maKh: string;
  updates: Partial<DvkhEntry>;
  timestamp: number;
  synced: boolean;
}

export const getDvkhStatusWeight = (status?: string): number => {
  if (!status) return -1;
  const s = status.trim().toLowerCase();
  if (s.includes('xong')) return 5;
  if (s.includes('tro ngai') || s.includes('trở ngại')) return 4;
  if (s.includes('giao thi cong') || s.includes('giao thi công') || s.includes('da giao')) return 3;
  if (s.includes('da nhan') || s.includes('đã nhận') || s.includes('da tiep nhan') || s.includes('đã tiếp nhận') || s.includes('tiep nhan') || s.includes('tiếp nhận')) return 2;
  if (s.includes('cho nhan') || s.includes('chờ nhận') || s.includes('cho tiep nhan') || s.includes('chờ tiếp nhận')) return 1;
  if (s.includes('chua giao') || s.includes('chưa giao')) return 0;
  return 0;
};

export interface OnlineStats {
  status: string;
  totalLogins: number;
  onlineCount: number;
  onlineUsers?: string[];
}

export interface TuyenDuongExclusion {
  id: string;
  year: number;
  month: number; // 1-12, hoặc 0 cho cả năm
  memberName: string;
  team?: string;
  reason: string; // Lý do bị loại khỏi xét tuyên dương (vi phạm lỗi)
  createdAt: string;
  createdBy?: string;
}

export interface KthtddMemberAreaPermission {
  memberName: string;
  scope: 'default' | 'all' | 'managed'; // 'default': theo mặc định vai trò/hệ thống, 'all': tất cả khu vực, 'managed': chỉ khu vực quản lý
  managedArea?: string; // Tên khu vực cụ thể hoặc rỗng (tự động theo Tổ)
}

export interface KthtddAreaPolicyConfig {
  defaultEmployeeScope: 'all' | 'managed'; // Mặc định cho nhân viên: 'managed' (chỉ khu vực quản lý) hoặc 'all'
  memberOverrides: Record<string, KthtddMemberAreaPermission>; // key là normalized memberName
}

export const DEFAULT_KTHTDD_AREA_POLICY: KthtddAreaPolicyConfig = {
  defaultEmployeeScope: 'managed', // Mặc định: nhân viên chỉ làm ở khu vực của mình quản lý
  memberOverrides: {}
};

export interface Holiday {
  id: string;
  date: string; // 'YYYY-MM-DD'
  name: string;
}

export const DEFAULT_HOLIDAYS_2026: Holiday[] = [
  { id: 'hol-2026-01-01', date: '2026-01-01', name: 'Tết Dương Lịch' },
  { id: 'hol-2026-02-16', date: '2026-02-16', name: 'Nghỉ Tết Nguyên đán (29 Tết)' },
  { id: 'hol-2026-02-17', date: '2026-02-17', name: 'Tết Nguyên đán (Mùng 1 Tết)' },
  { id: 'hol-2026-02-18', date: '2026-02-18', name: 'Tết Nguyên đán (Mùng 2 Tết)' },
  { id: 'hol-2026-02-19', date: '2026-02-19', name: 'Tết Nguyên đán (Mùng 3 Tết)' },
  { id: 'hol-2026-02-20', date: '2026-02-20', name: 'Nghỉ bù Tết Nguyên đán' },
  { id: 'hol-2026-04-26', date: '2026-04-26', name: 'Giỗ Tổ Hùng Vương (10/3 ÂL)' },
  { id: 'hol-2026-04-27', date: '2026-04-27', name: 'Nghỉ bù Giỗ Tổ Hùng Vương' },
  { id: 'hol-2026-04-30', date: '2026-04-30', name: 'Giải phóng miền Nam (30/4)' },
  { id: 'hol-2026-05-01', date: '2026-05-01', name: 'Quốc tế Lao động (1/5)' },
  { id: 'hol-2026-09-02', date: '2026-09-02', name: 'Quốc khánh (2/9)' },
  { id: 'hol-2026-09-03', date: '2026-09-03', name: 'Nghỉ liền kề Quốc khánh (3/9)' },
];

export interface DinhMucItem {
  id?: string;
  stt?: number | string;      // Cột A: Số thứ tự
  name: string;               // Cột B: Nội dung (Tên danh mục công việc)
  quota: number;              // Cột C: Định mức ngày (khối lượng định mức giao trong 1 ngày)
  isGroup?: boolean;          // Cột D (Đ): Chung nhóm ('x' = true)
  relation?: string;          // Cột E: Mã quan hệ công tác (ví dụ: 42, 22, 32, ...)
  history?: Record<string, number>; // Kế hoạch theo các tháng/năm
  custom?: boolean;           // Đánh dấu người dùng tạo hoặc chỉnh sửa thủ công
}

export interface ExternalReportLink {
  id: string;
  title: string;
  url: string;
  description: string;
  icon?: string;
  color?: string;
  imageUrl?: string;
  badge?: string;
  createdAt?: string;
}

export const DEFAULT_EXTERNAL_REPORT_LINKS: ExternalReportLink[] = [
  {
    id: 'link_tram_bien_ap',
    title: 'Trạm Biến Áp',
    url: 'https://quan-ly-tram-bien-ap.vercel.app/',
    description: 'Truy cập hệ thống quản lý chi tiết thông tin, sơ đồ và thông số vận hành của các trạm biến áp.',
    icon: 'zap',
    color: 'blue',
    imageUrl: 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b6?q=80&w=1600&auto=format&fit=crop',
  },
  {
    id: 'link_xu_ly_dau_tat',
    title: 'Xử lý đấu tắt',
    url: 'https://xu-ly-tam-pcvt.vercel.app/#/login',
    description: 'Phần mềm hỗ trợ phát hiện, lập biên bản và theo dõi quy trình xử lý các sự cố đấu tắt an toàn.',
    icon: 'shield',
    color: 'red',
    imageUrl: 'https://images.unsplash.com/photo-1627914371465-d0c3ebbbabfc?fm=jpg&q=80&w=1600&fit=crop',
  },
  {
    id: 'link_xu_ly_ton_tai',
    title: 'Xử lý tồn tại sau KT',
    url: 'https://ket-qua-xu-ly-htdd.vercel.app/',
    description: 'Báo cáo kết quả xử lý các tồn tại sau kiểm tra, theo dõi tiến độ khắc phục đo đếm.',
    icon: 'clipboard',
    color: 'emerald',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop',
  },
  {
    id: 'link_tien_do_thay_3_gia',
    title: 'Tiến độ thay 3 giá',
    url: 'https://tiendo-thaycongto3gia.vercel.app/',
    description: 'Theo dõi tiến độ, số lượng và thông tin chi tiết quá trình thay thế công tơ 3 giá.',
    icon: 'gauge',
    color: 'blue',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1600&auto=format&fit=crop',
  },
  {
    id: 'link_on_thi_nghiep_vu',
    title: 'Ôn thi nghiệp vụ',
    url: 'https://on-thi-trac-nghiem.vercel.app/',
    description: 'Hệ thống thi trắc nghiệm, ôn luyện và kiểm tra nghiệp vụ định kỳ.',
    icon: 'book',
    color: 'amber',
    imageUrl: 'https://images.unsplash.com/photo-1546410531-bea5aadcb6ce?q=80&w=1600&auto=format&fit=crop',
  }
];

export interface LocalTutiUpdate {
  entryId: string;
  updates: Partial<TutiEntry>;
  timestamp: number;
  synced: boolean;
}

export interface TutiEntry {
  id: string;
  maTram: string; // Mã trạm
  tenDiemDo: string; // Tên điểm đo
  thongSoTU: string; // Thông số TU
  thongSoTI: string; // Thông số TI
  kiemTraTU: string; // Kiểm tra TU
  kiemTraTI: string; // Kiểm tra TI
  khac: string; // Khác
  ketLuan: string; // Kết luận ('Đúng' | 'Sai' | '')
  ngayCapNhat: string; // Ngày cập nhật (dd/mm/yyyy)
  ngayDuaLen: string; // Ngày đưa lên (dd/mm/yyyy)
  nguoiDuaLen?: string;
  nguoiKiemTra?: string;
  isLocal?: boolean;
  localTimestamp?: number;
}

export interface QuaHanEntry {
  MA_DVIQLY?: string;
  MA_TBI?: string;
  SO_TBI?: string;
  SO_HUU?: string;
  MA_CLOAI?: string;
  DONG_DIEN?: string;
  DIEN_AP?: string;
  SO_PHA?: string;
  NGAY_KDINH?: string;
  HAN_KDINH?: string;
  LUU_KHO?: string;
  MA_DDO?: string;
  MA_KHANG?: string;
  VH_CONG?: string;
  HSN?: string;
  NGAY_TTHAO?: string;
  TEN_TCHI?: string;
  MA_TCHI?: string;
  MA_KVUC?: string;
  STT?: string;
  TEN_KHANG?: string;
  DCHI_DDO?: string;
  DCHI_KHANG?: string;
  SO_COT?: string;
  SO_HOP?: string;
  MA_SOGCS?: string;
  MA_TRAM?: string;
  DTHOAI?: string;
  HOP_BO?: string;
  CHUOI_GIA?: string;
  LOAI_TT_GT?: string;
  TSO_TI?: string;
  TSO_TU?: string;
  DIEN_AP_TI?: string;
  khuVuc?: string;
}

export interface TuSheetEntry {
  MA_DVIQLY?: string;
  MA_TBI?: string;
  SO_TBI?: string;
  SO_HUU?: string;
  MA_CLOAI?: string;
  DIEN_AP?: string;
  CAP_CXAC?: string;
  SO_PHA?: string;
  TYSO_DAU?: string;
  NGAY_KDINH?: string;
  HAN_KDINH?: string;
  LUU_KHO?: string;
  MA_DDO?: string;
  MA_KHANG?: string;
  HSN?: string;
  NGAY_TTHAO?: string;
  MA_TCHI?: string;
  MA_KVUC?: string;
  STT?: string;
  TEN_KHANG?: string;
  DCHI_DDO?: string;
  DCHI_KHANG?: string;
  MA_SOGCS?: string;
  DTHOAI?: string;
  HOP_BO?: string;
  CHUOI_GIA?: string;
  khuVuc?: string;
}

export interface TiSheetEntry {
  MA_DVIQLY?: string;
  MA_TBI?: string;
  SO_TBI?: string;
  SO_HUU?: string;
  MA_CLOAI?: string;
  DIEN_AP?: string;
  CAP_CXAC?: string;
  SO_PHA?: string;
  TYSO_DAU?: string;
  NGAY_KDINH?: string;
  HAN_KDINH?: string;
  LUU_KHO?: string;
  MA_DDO?: string;
  MA_KHANG?: string;
  HSN?: string;
  NGAY_TTHAO?: string;
  MA_TCHI?: string;
  MA_KVUC?: string;
  STT?: string;
  TEN_KHANG?: string;
  DCHI_DDO?: string;
  DCHI_KHANG?: string;
  MA_SOGCS?: string;
  DTHOAI?: string;
  HOP_BO?: string;
  CHUOI_GIA?: string;
  khuVuc?: string;
}

const STORAGE_KEY = 'workload_data_v1';
export const DEFAULT_SPREADSHEET_ID = '1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ';
export const DEFAULT_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzpw3SlqJxXYC29qjPRqH8ehfJp764bNvQFUzqIgMW_rMrpitMKvvRvWbbGrP505Sdi/exec';
const SCRIPT_URL_KEY = 'app_script_url_v1';
const SPREADSHEET_ID_KEY = 'SPREADSHEET_ID';
const TEAMS_KEY = 'sheet_teams_v1';
const MEMBERS_KEY = 'sheet_members_v1';
const STATIONS_KEY = 'sheet_stations_v1';
const DINHMUC_KEY = 'sheet_dinhmuc_v1';
const PROGRESS_KEY = 'sheet_progress_v1';
const LOCAL_PROGRESS_UPDATES_KEY = 'local_progress_updates_v1';
const TUTI_KEY = 'sheet_tuti_v1';
const LOCAL_TUTI_UPDATES_KEY = 'local_tuti_updates_v1';
const DVKH_KEY = 'sheet_dvkh_v1';
const LOCAL_DVKH_UPDATES_KEY = 'local_dvkh_updates_v1';
const DELETED_DVKH_KEYS = 'deleted_dvkh_keys_v1';
const QUAHAN_KEY = 'sheet_quahan_v1';
const QUAHAN_NAM_KEY = 'sheet_quahan_nam_v1';
const TU_SHEET_KEY = 'sheet_tu_entries_v1';
const TU_NAM_KEY = 'sheet_tu_nam_v1';
const TI_SHEET_KEY = 'sheet_ti_entries_v1';
const TI_NAM_KEY = 'sheet_ti_nam_v1';
const ALLOW_CUSTOM_NGAY_HOAN_TAT_DVKH_KEY = 'config_allow_custom_ngay_hoan_tat_dvkh_v1';

let memCacheQuaHanList: QuaHanEntry[] | null = null;
let memCacheQuaHanNamList: QuaHanEntry[] | null = null;
let memCacheTuSheetList: TuSheetEntry[] | null = null;
let memCacheTuNamList: TuSheetEntry[] | null = null;
let memCacheTiSheetList: TiSheetEntry[] | null = null;
let memCacheTiNamList: TiSheetEntry[] | null = null;
let memCacheDvkhList: DvkhEntry[] | null = null;
let memCacheDvkhUpdatesMap: Record<string, LocalDvkhUpdate> | null = null;
let memCacheDeletedDvkhKeys: Set<string> | null = null;
let memCacheKhuVucList: any[] | null = null;
let memCacheMatKetNoiList: any[] | null = null;
let memCacheChiTietMKNList: any[] | null = null;
let memCacheSangTaiList: any[] | null = null;
let memCacheKhoList: any[] | null = null;
let memCacheVTTBList: any[] | null = null;
let memCacheKthtddList: KthtddEntry[] | null = null;
let kthtddMaKhIndexMap = new Map<string, number>();
let kthtddMaTramIndexMap = new Map<string, number[]>();
let saveKthtddIDBTimeout: any = null;

export const rebuildKthtddIndexes = (list: KthtddEntry[] | null) => {
  kthtddMaKhIndexMap.clear();
  kthtddMaTramIndexMap.clear();
  if (!list || !Array.isArray(list)) return;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (item.maKh) {
      kthtddMaKhIndexMap.set(item.maKh.trim().toLowerCase(), i);
    }
    if (item.maTram) {
      const tramKey = item.maTram.trim().toLowerCase();
      let arr = kthtddMaTramIndexMap.get(tramKey);
      if (!arr) {
        arr = [];
        kthtddMaTramIndexMap.set(tramKey, arr);
      }
      arr.push(i);
    }
  }
};

const debouncedSaveKthtddToIDB = () => {
  if (saveKthtddIDBTimeout) clearTimeout(saveKthtddIDBTimeout);
  saveKthtddIDBTimeout = setTimeout(async () => {
    if (memCacheKthtddList) {
      try {
        await set('sheet_kthtdd_v1', memCacheKthtddList);
      } catch (e) {
        console.warn('Error debounced save kthtdd to IDB:', e);
      }
    }
  }, 1500);
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (saveKthtddIDBTimeout && memCacheKthtddList) {
      clearTimeout(saveKthtddIDBTimeout);
      set('sheet_kthtdd_v1', memCacheKthtddList).catch(() => {});
    }
  });
}

let memoryCache: Record<string, string | null> = {};

export const initDB = async () => {
    try {
      const kthtddVal = await get('sheet_kthtdd_v1');
      if (kthtddVal && Array.isArray(kthtddVal)) {
        memCacheKthtddList = kthtddVal;
        rebuildKthtddIndexes(memCacheKthtddList);
      }
    } catch (e) {
      console.warn('Could not preload kthtdd from IDB', e);
    }
    try {
      const localUpdatesVal = await get(LOCAL_DVKH_UPDATES_KEY);
      if (localUpdatesVal) {
        const parsedUpdates = typeof localUpdatesVal === 'string' ? JSON.parse(localUpdatesVal) : localUpdatesVal;
        if (parsedUpdates && typeof parsedUpdates === 'object') {
          memCacheDvkhUpdatesMap = parsedUpdates;
        }
      }
    } catch (e) {}
    try {
      const dvkhVal = await get(DVKH_KEY);
      if (dvkhVal) {
        let parsed = typeof dvkhVal === 'string' ? JSON.parse(dvkhVal) : dvkhVal;
        if (Array.isArray(parsed)) {
          parsed = DataStore.applyLocalDvkhUpdates(parsed);
          memCacheDvkhList = parsed;
          safeSetItem(DVKH_KEY, JSON.stringify(parsed));
        }
      }
    } catch (e) {
      console.warn('Could not preload dvkh from IDB', e);
    }
    try {
      const deletedDvkhVal = await get(DELETED_DVKH_KEYS);
      if (deletedDvkhVal) {
        const arr = typeof deletedDvkhVal === 'string' ? JSON.parse(deletedDvkhVal) : deletedDvkhVal;
        if (Array.isArray(arr)) {
          memCacheDeletedDvkhKeys = new Set(arr.map(k => String(k).trim().toLowerCase()));
        }
      }
    } catch (e) {}
    try {
      const qhVal = await get(QUAHAN_KEY);
      if (qhVal) {
        let parsed = typeof qhVal === 'string' ? JSON.parse(qhVal) : qhVal;
        if (Array.isArray(parsed)) {
          memCacheQuaHanList = parsed;
          safeSetItem(QUAHAN_KEY, JSON.stringify(parsed));
        }
      }
    } catch (e) {
      console.warn('Could not preload QuaHan from IDB', e);
    }
    try {
      const tuVal = await get(TU_SHEET_KEY);
      if (tuVal) {
        let parsed = typeof tuVal === 'string' ? JSON.parse(tuVal) : tuVal;
        if (Array.isArray(parsed)) {
          memCacheTuSheetList = parsed;
          safeSetItem(TU_SHEET_KEY, JSON.stringify(parsed));
        }
      }
    } catch (e) {
      console.warn('Could not preload TU from IDB', e);
    }
    try {
      const tiVal = await get(TI_SHEET_KEY);
      if (tiVal) {
        let parsed = typeof tiVal === 'string' ? JSON.parse(tiVal) : tiVal;
        if (Array.isArray(parsed)) {
          memCacheTiSheetList = parsed;
          safeSetItem(TI_SHEET_KEY, JSON.stringify(parsed));
        }
      }
    } catch (e) {
      console.warn('Could not preload TI from IDB', e);
    }
    try {
      const qhnVal = await get(QUAHAN_NAM_KEY);
      if (qhnVal) {
        let parsed = typeof qhnVal === 'string' ? JSON.parse(qhnVal) : qhnVal;
        if (Array.isArray(parsed)) {
          memCacheQuaHanNamList = parsed;
          safeSetItem(QUAHAN_NAM_KEY, JSON.stringify(parsed));
        }
      }
    } catch (e) {}
    try {
      const tunVal = await get(TU_NAM_KEY);
      if (tunVal) {
        let parsed = typeof tunVal === 'string' ? JSON.parse(tunVal) : tunVal;
        if (Array.isArray(parsed)) {
          memCacheTuNamList = parsed;
          safeSetItem(TU_NAM_KEY, JSON.stringify(parsed));
        }
      }
    } catch (e) {}
    try {
      const tinVal = await get(TI_NAM_KEY);
      if (tinVal) {
        let parsed = typeof tinVal === 'string' ? JSON.parse(tinVal) : tinVal;
        if (Array.isArray(parsed)) {
          memCacheTiNamList = parsed;
          safeSetItem(TI_NAM_KEY, JSON.stringify(parsed));
        }
      }
    } catch (e) {}
    try {
      const mknVal = await get('sheet_matketnoi_v1');
      if (mknVal) {
        let parsed = typeof mknVal === 'string' ? JSON.parse(mknVal) : mknVal;
        if (Array.isArray(parsed)) {
          memCacheMatKetNoiList = parsed;
        }
      }
    } catch (e) {}
    try {
      const ctmknVal = await get('sheet_chitietmkn_v1');
      if (ctmknVal) {
        let parsed = typeof ctmknVal === 'string' ? JSON.parse(ctmknVal) : ctmknVal;
        if (Array.isArray(parsed)) {
          memCacheChiTietMKNList = parsed;
        }
      }
    } catch (e) {}
    try {
      const kvVal = await get('sheet_khuvuc_v1');
      if (kvVal) {
        let parsed = typeof kvVal === 'string' ? JSON.parse(kvVal) : kvVal;
        if (Array.isArray(parsed)) {
          memCacheKhuVucList = parsed;
        }
      }
    } catch (e) {}
    const keys = [
      STORAGE_KEY, SCRIPT_URL_KEY, SPREADSHEET_ID_KEY, TEAMS_KEY, MEMBERS_KEY, STATIONS_KEY,
      DINHMUC_KEY, PROGRESS_KEY, LOCAL_PROGRESS_UPDATES_KEY, TUTI_KEY,
      LOCAL_TUTI_UPDATES_KEY, DVKH_KEY, QUAHAN_KEY, QUAHAN_NAM_KEY, TU_SHEET_KEY, TU_NAM_KEY, TI_SHEET_KEY, TI_NAM_KEY, ALLOW_CUSTOM_NGAY_HOAN_TAT_DVKH_KEY, 'sheet_khuvuc_v1', 'sheet_matketnoi_v1',
      'sheet_chitietmkn_v1', 'custom_matketnoi_uploaded_v1', 'custom_chitietmkn_uploaded_v1', 'custom_khuvuc_uploaded_v1', 'sheet_sangtai_v1', 'sheet_kho_v1', 'sheet_vttb_v1', 'config_exclude_saturday', 'config_exclude_sunday', 'config_exclude_nghi',
      'config_exclude_holidays', 'config_holidays_v1',
      'config_external_report_links_v1', 'config_tuyen_duong_exclusions_v1', 'config_cong_doan_leaders'
    ];
    for (const key of keys) {
      let val = await get(key);
      if (val === undefined) {
         const lsVal = localStorage.getItem(key);
         if (lsVal) {
             val = lsVal;
             try { await set(key, val); } catch (e) {} 
         }
      }
      memoryCache[key] = val || null;
    }
};

const safeSetItem = (key: string, value: string) => {
    memoryCache[key] = value;
    try { localStorage.setItem(key, value); } catch (e) {}
    set(key, value).catch(e => console.warn('IDB quota exceeded for key', key));
};

const safeRemoveItem = (key: string) => {
    delete memoryCache[key];
    try { localStorage.removeItem(key); } catch (e) {}
    del(key).catch(() => {});
};

const safeGetItem = (key: string): string | null => {
    // Check if we have it in memCache, if not, try to read from localStorage gracefully just in case
    if (memoryCache[key] !== undefined) return memoryCache[key];
    try {
        return localStorage.getItem(key);
    } catch { return null; }
};


export function getTeamPrefix(teamName: string): string {
    if (!teamName) return "";
    const t = teamName.toUpperCase().trim();
    
    if (t === 'ĐỘI' || t === 'DOI') return "D";
    if (t.includes("PHÚ MỸ") || t.includes("PHU MY")) return "P";
    if (t.includes("BÀ RỊA") || t.includes("BA RIA")) return "B";
    if (t.includes("VŨNG TÀU") || t.includes("VUNG TAU")) return "V";
    if (t.includes("ĐO XA") || t.includes("DO XA")) return "X";
    
    let coreName = teamName.replace(/^(Tổ|Đội|Trạm)\s+/i, '').trim();
    if (!coreName) coreName = teamName.trim();
    
    const words = coreName.split(/\s+/);
    if (words.length === 0) return "";
    
    const getChar = (word: string) => word.charAt(0).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D');
    
    let char = getChar(words[0]);
    const taken = ['D', 'P', 'B', 'V', 'X']; 
    
    if (taken.includes(char) && words.length > 1) {
        let secondChar = getChar(words[1]);
        if (!taken.includes(secondChar)) {
            char = secondChar;
        } else if (words.length > 2) {
            let thirdChar = getChar(words[2]);
            if (!taken.includes(thirdChar)) char = thirdChar;
        }
    }
    
    return char;
}


export const DEFAULT_SAMPLE_DVKH: DvkhEntry[] = [];

export const DataStore = {

  initDB: initDB,
  getAppScriptUrl: () => { 
      const url = safeGetItem(SCRIPT_URL_KEY);
      return url ? url.trim() : DEFAULT_APP_SCRIPT_URL;
  },
  setAppScriptUrl: (url: string) => safeSetItem(SCRIPT_URL_KEY, url),

  getSpreadsheetId: (): string => {
      const id = safeGetItem(SPREADSHEET_ID_KEY);
      return id ? id.trim() : DEFAULT_SPREADSHEET_ID;
  },
  setSpreadsheetId: (idOrUrl: string) => {
      let clean = (idOrUrl || '').trim();
      const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
          clean = match[1];
      }
      safeSetItem(SPREADSHEET_ID_KEY, clean);
  },
  getSpreadsheetUrl: (): string => {
      const id = DataStore.getSpreadsheetId();
      return `https://docs.google.com/spreadsheets/d/${id}/edit`;
  },

  fetchSheetCSV: async (sheetName: string, customSheetId?: string): Promise<string | null> => {
      const sheetId = customSheetId || DataStore.getSpreadsheetId() || DEFAULT_SPREADSHEET_ID;
      
      // Strategy 1: Local server proxy /api/proxy/gviz (runs server-side in Node.js, eliminates browser CORS errors)
      try {
          const proxyUrl = `/api/proxy/gviz?sheet=${encodeURIComponent(sheetName)}&sheetId=${encodeURIComponent(sheetId)}&_t=${Date.now()}`;
          const res = await fetch(proxyUrl);
          if (res.ok) {
              const text = await res.text();
              if (text && !text.includes('<html') && text.trim().length > 0) {
                  return text;
              }
          }
      } catch (proxyErr) {
          // proxy not reachable or static host fallback
      }

      // Strategy 2: Direct Google Sheets export CSV with known GIDs (bypasses active filter views)
      try {
          const KNOWN_GIDS: Record<string, string> = {
            'quahan': '934231421',
            'tu': '790591569',
            'ti': '602741776',
            'tuti': '1705590920'
          };
          const cleanName = sheetName.trim().toLowerCase();
          const gid = KNOWN_GIDS[cleanName];
          if (gid) {
              const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}&_t=${Date.now()}`;
              const exportRes = await fetch(exportUrl);
              if (exportRes.ok) {
                  const text = await exportRes.text();
                  if (text && !text.includes('<html') && text.trim().length > 20) {
                      return text;
                  }
              }
          }
      } catch (e) {}

      // Strategy 3: Direct Google Sheets gviz CSV fetch
      try {
          const directUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&_t=${Date.now()}`;
          const res = await fetch(directUrl);
          if (res.ok) {
              const text = await res.text();
              if (text && !text.includes('<html') && text.trim().length > 0) {
                  return text;
              }
          }
      } catch (directErr) {
          console.warn(`Could not load sheet CSV for "${sheetName}":`, (directErr as any)?.message || directErr);
      }

      return null;
  },

  getExcludeSaturday: () => {
      const val = safeGetItem('config_exclude_saturday');
      return val === 'true'; // Default is false
  },
  setExcludeSaturday: (val: boolean) => safeSetItem('config_exclude_saturday', val ? 'true' : 'false'),
  getExcludeSunday: () => {
      const val = safeGetItem('config_exclude_sunday');
      return val === 'true'; // Default is false
  },
  setExcludeSunday: (val: boolean) => safeSetItem('config_exclude_sunday', val ? 'true' : 'false'),
  getAllowAllLockPlan: () => {
      const val = safeGetItem('config_allow_all_lock_plan');
      return val === 'true'; // Default is false
  },
  setAllowAllLockPlan: (val: boolean) => safeSetItem('config_allow_all_lock_plan', val ? 'true' : 'false'),
  
  getExcludeNghi: () => {
      const val = safeGetItem('config_exclude_nghi');
      return val !== 'false'; // Default is true (không tính)
  },
  setExcludeNghi: (val: boolean) => safeSetItem('config_exclude_nghi', val ? 'true' : 'false'),

  getExcludeHolidays: () => {
      const val = safeGetItem('config_exclude_holidays');
      return val !== 'false'; // Default is true (loại trừ ngày nghỉ lễ)
  },
  setExcludeHolidays: (val: boolean) => safeSetItem('config_exclude_holidays', val ? 'true' : 'false'),

  normalizeDateStr: (dateStr: string): string => {
    if (!dateStr) return '';
    const clean = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(clean)) {
      const parts = clean.split('/');
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
      const parts = clean.split('/');
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(clean)) {
      const parts = clean.split('-');
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return clean;
  },

  getHolidays: (): Holiday[] => {
    try {
      const val = safeGetItem('config_holidays_v1');
      if (val) {
        const list = JSON.parse(val);
        if (Array.isArray(list)) return list;
      }
    } catch(e) {}
    return DEFAULT_HOLIDAYS_2026;
  },

  setHolidays: (holidays: Holiday[]) => {
    safeSetItem('config_holidays_v1', JSON.stringify(holidays));
  },

  addHoliday: (date: string, name: string): boolean => {
    const norm = DataStore.normalizeDateStr(date);
    if (!norm) return false;
    const list = [...DataStore.getHolidays()];
    const existing = list.find(h => h.date === norm);
    if (existing) {
      existing.name = name.trim() || existing.name;
    } else {
      list.push({
        id: `hol-${norm}-${Date.now().toString(36)}`,
        date: norm,
        name: name.trim() || 'Ngày nghỉ lễ'
      });
    }
    list.sort((a, b) => a.date.localeCompare(b.date));
    DataStore.setHolidays(list);
    return true;
  },

  removeHoliday: (idOrDate: string) => {
    const list = DataStore.getHolidays();
    const updated = list.filter(h => h.id !== idOrDate && h.date !== idOrDate);
    DataStore.setHolidays(updated);
  },

  clearHolidaysByMonth: (year: number, month: number) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const list = DataStore.getHolidays();
    const updated = list.filter(h => !h.date.startsWith(prefix));
    DataStore.setHolidays(updated);
  },

  resetDefaultHolidays: () => {
    DataStore.setHolidays(DEFAULT_HOLIDAYS_2026);
  },

  isHoliday: (dateStr: string): boolean => {
    if (!DataStore.getExcludeHolidays()) return false;
    const norm = DataStore.normalizeDateStr(dateStr);
    if (!norm) return false;
    const list = DataStore.getHolidays();
    return list.some(h => h.date === norm);
  },

  getHolidayInfo: (dateStr: string): Holiday | null => {
    const norm = DataStore.normalizeDateStr(dateStr);
    if (!norm) return null;
    const list = DataStore.getHolidays();
    return list.find(h => h.date === norm) || null;
  },

  getCongDoanLeaderNames: (): string[] => {
    try {
      const val = safeGetItem('config_cong_doan_leaders');
      const list: string[] = val ? JSON.parse(val) : [];
      // Always ensure Nguyễn Quỳnh Như Thụy is present in the list
      const defaultLeaders = ['Nguyễn Quỳnh Như Thụy'];
      defaultLeaders.forEach(defName => {
        const normDef = defName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        if (!list.some(n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === normDef)) {
          list.push(defName);
        }
      });
      return list;
    } catch {
      return ['Nguyễn Quỳnh Như Thụy'];
    }
  },
  setCongDoanLeaderNames: (names: string[]) => {
    safeSetItem('config_cong_doan_leaders', JSON.stringify(names));
  },
  getTuyenDuongExclusions: (): TuyenDuongExclusion[] => {
    try {
      const val = safeGetItem('config_tuyen_duong_exclusions_v1');
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  },
  setTuyenDuongExclusions: (list: TuyenDuongExclusion[]) => {
    safeSetItem('config_tuyen_duong_exclusions_v1', JSON.stringify(list));
  },
  addTuyenDuongExclusion: (item: Omit<TuyenDuongExclusion, 'id' | 'createdAt'>): TuyenDuongExclusion => {
    const list = DataStore.getTuyenDuongExclusions();
    const now = new Date();
    const dateStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const newItem: TuyenDuongExclusion = {
      ...item,
      id: 'ex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: dateStr,
    };
    list.unshift(newItem);
    DataStore.setTuyenDuongExclusions(list);
    return newItem;
  },
  removeTuyenDuongExclusion: (id: string) => {
    const list = DataStore.getTuyenDuongExclusions();
    const updated = list.filter(item => item.id !== id);
    DataStore.setTuyenDuongExclusions(updated);
  },
  isMemberExcludedFromTuyenDuong: (memberName: string, year: number, month: number): boolean => {
    if (!memberName) return false;
    const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const targetName = norm(memberName);
    const list = DataStore.getTuyenDuongExclusions();
    return list.some(item => {
      const matchName = norm(item.memberName) === targetName || targetName.includes(norm(item.memberName)) || norm(item.memberName).includes(targetName);
      const matchYear = Number(item.year) === Number(year);
      const matchMonth = Number(item.month) === Number(month) || Number(item.month) === 0;
      return matchName && matchYear && matchMonth;
    });
  },
  getExclusionDetails: (memberName: string, year: number, month: number): TuyenDuongExclusion | undefined => {
    if (!memberName) return undefined;
    const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const targetName = norm(memberName);
    const list = DataStore.getTuyenDuongExclusions();
    return list.find(item => {
      const matchName = norm(item.memberName) === targetName || targetName.includes(norm(item.memberName)) || norm(item.memberName).includes(targetName);
      const matchYear = Number(item.year) === Number(year);
      const matchMonth = Number(item.month) === Number(month) || Number(item.month) === 0;
      return matchName && matchYear && matchMonth;
    });
  },

  getExternalReportLinks: (): ExternalReportLink[] => {
    try {
      const val = safeGetItem('config_external_report_links_v1');
      if (val) {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return DEFAULT_EXTERNAL_REPORT_LINKS;
    } catch {
      return DEFAULT_EXTERNAL_REPORT_LINKS;
    }
  },
  setExternalReportLinks: (links: ExternalReportLink[]) => {
    safeSetItem('config_external_report_links_v1', JSON.stringify(links));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('external_report_links_changed', { detail: links }));
    }
  },
  addExternalReportLink: (link: Omit<ExternalReportLink, 'id'>): ExternalReportLink => {
    const list = [...DataStore.getExternalReportLinks()];
    const newLink: ExternalReportLink = {
      ...link,
      id: 'link_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    };
    list.push(newLink);
    DataStore.setExternalReportLinks(list);
    return newLink;
  },
  updateExternalReportLink: (id: string, updates: Partial<ExternalReportLink>) => {
    const list = DataStore.getExternalReportLinks().map(item => {
      if (item.id === id) {
        return { ...item, ...updates };
      }
      return item;
    });
    DataStore.setExternalReportLinks(list);
  },
  removeExternalReportLink: (id: string) => {
    const list = DataStore.getExternalReportLinks().filter(item => item.id !== id);
    DataStore.setExternalReportLinks(list);
  },
  resetExternalReportLinks: () => {
    DataStore.setExternalReportLinks(DEFAULT_EXTERNAL_REPORT_LINKS);
  },

  // ===== KTHTDD AREA PERMISSION & POLICY =====
  getKthtddAreaPolicy: (): KthtddAreaPolicyConfig => {
    try {
      const val = safeGetItem('config_kthtdd_area_policy_v1');
      if (val) {
        const parsed = JSON.parse(val);
        return {
          defaultEmployeeScope: parsed.defaultEmployeeScope || 'managed',
          memberOverrides: parsed.memberOverrides || {}
        };
      }
    } catch {}
    return { ...DEFAULT_KTHTDD_AREA_POLICY };
  },

  saveKthtddAreaPolicy: (policy: KthtddAreaPolicyConfig) => {
    safeSetItem('config_kthtdd_area_policy_v1', JSON.stringify(policy));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kthtdd_policy_updated', { detail: policy }));
    }
  },

  getKthtddKnownAreas: (): string[] => {
    const areas = new Set<string>(['Phú Mỹ', 'Bà Rịa', 'Vũng Tàu', 'Long Sơn']);
    try {
      const cachedKthtdd = safeGetItem('sheet_kthtdd_v1');
      if (cachedKthtdd) {
        const list = JSON.parse(cachedKthtdd);
        if (Array.isArray(list)) {
          list.forEach((e: any) => {
            if (e.khuVuc && e.khuVuc !== 'Chưa phân khu vực') areas.add(e.khuVuc.trim());
          });
        }
      }
      const teams = DataStore.getTeams();
      teams.forEach(t => {
        const clean = t.trim();
        if (clean && !clean.toLowerCase().includes('đo xa') && !clean.toLowerCase().includes('tổ công tác')) {
          const resolved = DataStore.resolveAreaFromTeam(clean);
          if (resolved) areas.add(resolved);
        }
      });
    } catch {}
    return Array.from(areas).filter(Boolean).sort();
  },

  resolveAreaFromTeam: (teamStr?: string): string => {
    if (!teamStr) return '';
    const norm = normalizeRoleStr(teamStr);
    if (norm.includes('phu my') || norm.includes('tan thanh')) return 'Phú Mỹ';
    if (norm.includes('ba ria') || norm.includes('long huong') || norm.includes('phuoc hung')) return 'Bà Rịa';
    if (norm.includes('vung tau')) return 'Vũng Tàu';
    if (norm.includes('long son')) return 'Long Sơn';
    if (norm.includes('chau duc')) return 'Châu Đức';
    if (norm.includes('xuyen moc')) return 'Xuyên Mộc';
    if (norm.includes('dat do')) return 'Đất Đỏ';
    const cleaned = teamStr.replace(/^(tổ|to|đội|doi|khu vực|khu vuc)\s+/i, '').trim();
    return cleaned || teamStr.trim();
  },

  getMemberKthtddPermission: (
    memberName?: string,
    roleStr?: string,
    teamStr?: string
  ): { canAllAreas: boolean; allowedAreas: string[]; scope: 'all' | 'managed'; source: string } => {
    const normName = normalizeRoleStr(memberName);
    const policy = DataStore.getKthtddAreaPolicy();

    // 1. Kiểm tra cấu hình Override riêng cho nhân viên
    if (normName && policy.memberOverrides && policy.memberOverrides[normName]) {
      const override = policy.memberOverrides[normName];
      if (override.scope === 'all') {
        return { canAllAreas: true, allowedAreas: [], scope: 'all', source: 'member_override' };
      }
      if (override.scope === 'managed') {
        let area = override.managedArea?.trim();
        if (!area) {
          area = DataStore.resolveAreaFromTeam(teamStr) || teamStr || 'Khu vực quản lý';
        }
        return {
          canAllAreas: false,
          allowedAreas: area ? [area] : [],
          scope: 'managed',
          source: 'member_override'
        };
      }
    }

    // 2. Kiểm tra quyền lãnh đạo hoặc vai trò có action 'kthtdd_all_areas'
    // Đội trưởng, Giám đốc, Đội phó, Tổ trưởng, Tổ phó có quyền xem tất cả khu vực
    const hasRoleAllAreas = PermissionStore.hasActionAccess('kthtdd_all_areas', roleStr || '');
    if (hasRoleAllAreas) {
      return { canAllAreas: true, allowedAreas: [], scope: 'all', source: 'role_permission' };
    }

    // 3. Áp dụng chính sách mặc định chung cho Nhân viên
    if (policy.defaultEmployeeScope === 'all') {
      return { canAllAreas: true, allowedAreas: [], scope: 'all', source: 'global_policy' };
    }

    // 4. Mặc định: Chỉ khu vực của mình quản lý
    let resolvedArea = DataStore.resolveAreaFromTeam(teamStr);
    if (!resolvedArea && memberName) {
      try {
        const members = DataStore.getMembers();
        const found = members.find(m => normalizeRoleStr(m.name) === normName);
        if (found && found.team) {
          resolvedArea = DataStore.resolveAreaFromTeam(found.team);
        }
      } catch {}
    }
    if (!resolvedArea && teamStr) {
      resolvedArea = teamStr.trim();
    }

    return {
      canAllAreas: false,
      allowedAreas: resolvedArea ? [resolvedArea] : [],
      scope: 'managed',
      source: 'global_policy'
    };
  },

  isUserDoiTruongOrCongDoanLeader: (user: SheetMember | null | undefined): boolean => {
    let effectiveUser: any = user;
    if (!effectiveUser) {
      try {
        const stored = sessionStorage.getItem('workload_user_session');
        if (stored) effectiveUser = JSON.parse(stored);
      } catch {}
    }
    if (!effectiveUser) return false;

    const normalize = (str: any) => String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    const rawName = String(effectiveUser.name || effectiveUser.fullName || effectiveUser.hoTen || '').trim();
    const normName = normalize(rawName);
    let rawRole = String(effectiveUser.role || effectiveUser.chucDanh || effectiveUser.chucVu || '').trim();

    // If role is missing or incomplete, also look up user in DataStore.getMembers()
    if (normName) {
      try {
        const members = DataStore.getMembers();
        const found = members.find(m => normalize(m.name) === normName);
        if (found && found.role) {
          if (!rawRole) {
            rawRole = found.role;
          } else if (!normalize(rawRole).includes('cong doan') && normalize(found.role).includes('cong doan')) {
            rawRole = `${rawRole}, ${found.role}`;
          }
        }
      } catch {}
    }

    const userRole = normalize(rawRole);
    const userTeam = normalize(effectiveUser.team);
    const userEmail = normalize(effectiveUser.email);

    // 1. Check Đội trưởng / Giám đốc / Đội phó
    if (userRole.includes('doi truong') || userRole.includes('doi pho') || userRole.includes('giam doc')) {
      return true;
    }

    // 2. Check comma-separated titles in column "Chức danh, công việc" (e.g. "Nhân viên, Tổ trưởng công đoàn")
    const roleItems = rawRole.split(/[,;\n\r/]+/).map(p => normalize(p)).filter(Boolean);
    for (const item of roleItems) {
      // Direct match for "tổ trưởng công đoàn", "tổ phó công đoàn", "chủ tịch công đoàn", "bch công đoàn"
      if (
        item.includes('to truong cong doan') ||
        item.includes('to pho cong doan') ||
        item.includes('chu tich cong doan') ||
        item.includes('bch cong doan') ||
        item.includes('truong ban cong doan') ||
        item.includes('to truong cd')
      ) {
        return true;
      }
      const isCd = item.includes('cong doan') || item.includes('cd') || item.endsWith(' cd') || item.endsWith(' cđ');
      const isLead = item.includes('to truong') || item.includes('to pho') || item.includes('chu tich') || item.includes('bch') || item.includes('truong') || item.includes('pho') || item.includes('uy vien');
      if (isCd && isLead) {
        return true;
      }
    }

    // 3. Substring check directly in userRole
    if (
      userRole.includes('to truong cong doan') ||
      userRole.includes('to pho cong doan') ||
      userRole.includes('chu tich cong doan') ||
      userRole.includes('bch cong doan')
    ) {
      return true;
    }

    if (
      (userRole.includes('cong doan') || userRole.includes('cd')) &&
      (userRole.includes('to truong') || userRole.includes('to pho') || userRole.includes('chu tich') || userRole.includes('bch') || userRole.includes('truong'))
    ) {
      return true;
    }

    // 4. Check if team is Công đoàn with a leadership role
    if ((userTeam.includes('cong doan') || userTeam.includes('cd')) && (userRole.includes('to truong') || userRole.includes('to pho') || userRole.includes('truong') || userRole.includes('doi truong') || userRole.includes('pho') || userRole.includes('chu tich'))) {
      return true;
    }

    // 5. Check if ANY property of the user record specifies Công đoàn leadership
    const allValues = Object.entries(effectiveUser)
      .filter(([k]) => typeof k === 'string' && !['id', 'msnv', 'password', 'pass'].includes(k.toLowerCase()))
      .map(([_, v]) => normalize(v));
    const combinedText = allValues.join(' ');

    const hasCongDoan = combinedText.includes('cong doan') || combinedText.includes('công đoàn') || combinedText.includes(' cd ') || combinedText.includes(' cđ ') || combinedText.endsWith(' cd') || combinedText.endsWith(' cđ');
    const hasLeaderRole = combinedText.includes('to truong') || combinedText.includes('to pho') || combinedText.includes('chu tich') || combinedText.includes('bch') || combinedText.includes('truong') || combinedText.includes('pho') || combinedText.includes('uy vien');

    if (hasCongDoan && hasLeaderRole) {
      return true;
    }

    // 6. Check explicitly configured leader names (from SystemTab or default list)
    const designated = DataStore.getCongDoanLeaderNames();
    for (const d of designated) {
      const normD = normalize(d);
      if (normD && (normName === normD || normName.includes(normD) || normD.includes(normName))) {
        return true;
      }
    }

    // 7. Guaranteed fallback for Nguyễn Quỳnh Như Thụy
    if (
      normName.includes('nhu thuy') || 
      normName.includes('quynh nhu thuy') || 
      normName.includes('nguyen quynh nhu thuy') ||
      userEmail.includes('nhuthuy') ||
      userEmail.includes('thuy.nq') ||
      normName.includes('thuy nq')
    ) {
      return true;
    }

    return false;
  },

  isMemberExcludedFromProductivity: (memberOrName: SheetMember | string): boolean => {
    if (!memberOrName) return false;

    const normalize = (str: any) => String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    let memberName = '';
    let memberRole = '';
    let memberTeam = '';

    const allMembers = DataStore.getMembers();

    if (typeof memberOrName === 'string') {
      memberName = memberOrName.trim();
      const normTarget = normalize(memberName);
      const found = allMembers.find(m => normalize(m.name) === normTarget) ||
                    allMembers.find(m => {
                      const nm = normalize(m.name);
                      return nm.length > 2 && normTarget.length > 2 && (nm.includes(normTarget) || normTarget.includes(nm));
                    });
      if (found) {
        memberRole = found.role || (found as any).chucDanh || (found as any).chucVu || (found as any).chuc_vu || (found as any).chuc_danh || '';
        memberTeam = found.team || '';
      }
    } else {
      memberName = (memberOrName.name || '').trim();
      memberRole = memberOrName.role || (memberOrName as any).chucDanh || (memberOrName as any).chucVu || (memberOrName as any).chuc_vu || (memberOrName as any).chuc_danh || '';
      memberTeam = memberOrName.team || '';
      if (!memberRole && memberName) {
        const normTarget = normalize(memberName);
        const found = allMembers.find(m => normalize(m.name) === normTarget);
        if (found) {
          memberRole = found.role || (found as any).chucDanh || (found as any).chucVu || '';
          if (!memberTeam) memberTeam = found.team || '';
        }
      }
    }

    const normName = normalize(memberName);
    const normTeam = normalize(memberTeam);

    // 0. Kiểm tra Đội ngũ Lãnh đạo / Ban Giám đốc qua Team
    if (
      normTeam.includes('ban giam doc') ||
      normTeam.includes('ban lanh dao') ||
      normTeam.includes('ban dieu hanh') ||
      normTeam === 'lanh dao'
    ) {
      return true;
    }

    const norm = normalize(memberRole || memberName);

    // 1. Không tính năng suất đối với các vị trí Lãnh đạo / Quản lý:
    // Đội phó (Đội phố), Đội trưởng, Phó Giám đốc, Giám đốc, Trưởng phòng, Phó phòng
    if (
      norm.includes('doi pho') ||
      norm.includes('pho doi') ||
      norm.includes('doi truong') ||
      norm.includes('truong doi') ||
      norm.includes('giam doc') ||
      norm.includes('pgd') ||
      norm.includes('pho gd') ||
      norm.includes('truong phong') ||
      norm.includes('pho phong') ||
      norm.includes('quan doc') ||
      norm.includes('pho quan doc') ||
      norm.includes('ban lanh dao')
    ) {
      return true;
    }

    // Tiền tố chức danh trong tên (ĐT., ĐP., GĐ., PGĐ., TT.)
    if (
      normName.startsWith('dt ') || normName.startsWith('dt. ') || normName.startsWith('doi truong ') ||
      normName.startsWith('dp ') || normName.startsWith('dp. ') || normName.startsWith('doi pho ') ||
      normName.startsWith('gd ') || normName.startsWith('gd. ') || normName.startsWith('giam doc ') ||
      normName.startsWith('pgd ') || normName.startsWith('pgd. ') || normName.startsWith('pho giam doc ')
    ) {
      return true;
    }

    // 2. Không tính năng suất đối với: Tổ trưởng (Tổ trưởng chuyên môn)
    // Phân biệt rõ với Tổ phó (Tổ phó CÓ tính năng suất):
    if (norm.includes('to truong') || norm.includes('truong to') || normName.startsWith('tt ') || normName.startsWith('tt. ')) {
      // Ngoại lệ: Nếu chức danh chuyên môn là nhân viên / công nhân / tổ phó và kiêm nhiệm Tổ trưởng Công đoàn
      const isOnlyCd = (norm.includes('cong doan') || norm.includes('cd')) &&
                       (norm.includes('nhan vien') || norm.includes('cong nhan') || norm.includes('to pho')) &&
                       !norm.includes('to truong to') &&
                       !norm.includes('to truong chuyen mon');
      if (isOnlyCd) {
        return false; // Tính năng suất vì chuyên môn là nhân viên/công nhân/tổ phó
      }
      return true; // Tổ trưởng chuyên môn: Loại trừ, không tính năng suất
    }

    // 3. Chỉ tính năng suất: Nhân viên, Công nhân, Tổ phó
    if (
      norm.includes('to pho') ||
      norm.includes('pho to') ||
      norm.includes('nhan vien') ||
      norm.includes('cong nhan') ||
      norm.includes('ky thuat') ||
      norm.includes('tho') ||
      norm.includes('lai xe')
    ) {
      return false; // CÓ tính năng suất (không bị loại trừ)
    }

    return false;
  },

  isCongDoanPublished: (subTab: 'sinh_nhat' | 'tuyen_duong', year: number, month: number): boolean => {
    try {
      const key = `congdoan_pub_${subTab}_${year}_${month}`;
      const val = safeGetItem(key);
      return val === 'true';
    } catch {
      return false;
    }
  },
  setCongDoanPublished: (subTab: 'sinh_nhat' | 'tuyen_duong', year: number, month: number, published: boolean) => {
    const key = `congdoan_pub_${subTab}_${year}_${month}`;
    safeSetItem(key, published ? 'true' : 'false');
  },

  getEntries: (): WorkloadEntry[] => {
    try {
      const data = safeGetItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed) {
          const arr = Array.isArray(parsed) ? parsed : Object.values(parsed);
          return arr.map((item: any) => {
            if (!item) return item;
            let members = item.members || item.workGroup || [];
            if (typeof members === 'string') {
               members = members.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
            return {
              ...item,
              members: Array.isArray(members) ? members : []
            };
          }).filter(Boolean);
        }
      }
      return [];
    } catch (e) {
      console.error("DEBUG DataStore getEntries Error:", e);
      return [];
    }
  },
  

    deleteWorkloadGroup: async (data: { date: string, members: string[] }) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'delete_workload_group', data }),
      });
      
      const rawText = await response.text();
      try {
          return JSON.parse(rawText);
      } catch (parseError) {
          console.error("Non-JSON response from GS:", rawText);
          return { status: 'error', reason: 'html_response', text: rawText };
      }
    } catch (error: any) {
      console.warn('Error deleting workload group:', error);
      return { status: 'error', reason: 'network_error', text: error.message };
    }
  },
  updateEntry: (id: string, updates: Partial<WorkloadEntry>) => {
    const entries = DataStore.getEntries();
    const index = entries.findIndex((e) => e.id === id);
    if (index !== -1) {
      entries[index] = { ...entries[index], ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch(e) {}
    }
  },

  deleteEntry: (id: string) => {
    const entries = DataStore.getEntries();
    const filtered = entries.filter((e) => e.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch(e) {}
  },

  getUniqueContents: (): string[] => {
    const entries = DataStore.getEntries();
    const contents = new Set(entries.map((e) => e.content));
    return Array.from(contents).filter(Boolean);
  },

  addEntry: (entry: Omit<WorkloadEntry, 'id' | 'timestamp'>) => {
    const entries = DataStore.getEntries();
    const newEntry: WorkloadEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now()
    };
    entries.push(newEntry);
    safeSetItem(STORAGE_KEY, JSON.stringify(entries));
    return newEntry;
  },

  
  getDcu: async () => {
     try {
         const sheetId = DataStore.getSpreadsheetId();
         const text = await DataStore.fetchSheetCSV("DCU", sheetId);
         if (!text) return [];
         
         const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });
         return data.map((r: any) => {
             // Hàm hỗ trợ tìm key linh hoạt (bỏ qua hoa thường, khoảng trắng)
             const findKey = (possibleNames: string[]) => {
                 const keys = Object.keys(r);
                 for (let k of keys) {
                     const lowerK = k.toLowerCase().trim();
                     if (possibleNames.some(p => lowerK === p.toLowerCase().trim())) {
                         return r[k];
                     }
                 }
                 return '';
             };
             
             return {
                 stt: findKey(['STT', 'TT', 'Số TT', 'SOTT']),
                 id: findKey(['ID']),
                 ten: findKey(['Tên', 'Ten', 'Tên DCU']),
                 diaChi: findKey(['Địa chỉ', 'Dia chi', 'Địa Chỉ']),
                 toadoX: findKey(['Tọa độ X', 'toadoX', 'Vĩ độ']),
                 toadoY: findKey(['Tọa độ Y', 'toadoY', 'Kinh độ']),
                 hinhAnh: findKey(['Hình ảnh', 'hinhAnh', 'Ảnh']),
                 ghiChu: findKey(['Ghi chú', 'ghiChu']),
                 user: findKey(['User', 'Người cập nhật', 'user', 'Người thực hiện', 'Nhân viên', 'Người được giao', 'Người XL'])
             };
         });
     } catch (e) {
         console.error('Lỗi khi tải DCU:', e);
         return [];
     }
  },
  
  
  importDcu: async (dataList: any[]) => {
      try {
          const url = DataStore.getAppScriptUrl();
          if (!url) return false;
          const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                  action: 'import_dcu',
                  data: dataList
              })
          });
          const json = await res.json();
          return json.status === 'success';
      } catch(e) {
          console.error(e);
          return false;
      }
  },
  
  updateDcu: async (data: any) => {
      try {
          const url = DataStore.getAppScriptUrl();
          if (!url) return false;
          const userObj = JSON.parse(localStorage.getItem('sessionUser') || '{}');
          const finalData = { ...data, user: userObj.name || userObj.email || '' };
          
          const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                  action: 'update_dcu',
                  data: finalData
              })
          });
          const json = await res.json();
          return json.status === 'success';
      } catch(e) {
          console.error(e);
          return false;
      }
  },

  addDcu: async (data: any) => {
     try {
         const url = DataStore.getAppScriptUrl();
         const res = await fetch(url, {
             method: 'POST',
             headers: { 'Content-Type': 'text/plain;charset=utf-8' },
             body: JSON.stringify({
                 action: 'add_dcu', data: data
             })
         });
         const json = await res.json();
         if (json.status !== 'success') {
             throw new Error(json.message || 'Lưu thất bại');
         }
         return true;
     } catch(e) {
         console.error('Lỗi lưu DCU:', e);
         return false;
     }
  },
  
  uploadImageToDrive: async (
    base64: string,
    fileName: string,
    mimeType: string = 'image/jpeg',
    folderId: string = '1eze4kVWtdUr0gjKSEAB_BKSfm5CNg3fv',
    extra?: { maKh?: string; oldFileId?: string }
  ): Promise<string> => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) {
        throw new Error('Chưa cấu hình URL Google Apps Script');
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'upload_image',
          base64,
          fileName,
          mimeType,
          folderId,
          maKh: extra?.maKh,
          oldFileId: extra?.oldFileId
        })
      });
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error('Phản hồi từ Google Apps Script không hợp lệ: ' + text);
      }
      if (json.status === 'success' && (json.url || json.thumbnailUrl)) {
        return json.url || json.thumbnailUrl;
      }
      throw new Error(json.message || 'Upload ảnh lên Google Drive thất bại');
    } catch (e: any) {
      console.error('Lỗi upload ảnh:', e);
      throw e;
    }
  },

  getXuLyDoXa: async () => {
     try {
         const sheetId = DataStore.getSpreadsheetId();
         const text = await DataStore.fetchSheetCSV("XuLyDoXa", sheetId);
         if (!text) return [];
         const data = Papa.parse(text, { header: true }).data;
         const filtered = data.filter((row: any) => row && Object.keys(row).length > 0);
         return filtered.map((row: any) => {
            const getVal = (possibleKeys) => {
                const rowKey = Object.keys(row).find(k => possibleKeys.includes(k.trim().toLowerCase().replace(/[\s_]+/g, '')));
                return rowKey ? row[rowKey] : undefined;
            };
            return {
                stt: getVal(['stt']),
                loaiXl: getVal(['loaixl', 'loạixl']),
                nguoiXl: getVal(['nguoixl', 'ngườixl']),
                thoiGianXl: getVal(['thoigianxl', 'thờigianxl']),
                maDd: getVal(['madd', 'mãdd', 'mãđđ']),
                tenKh: getVal(['tenkh', 'tênkh', 'tênkháchhàng']),
                cachXl: getVal(['cachxl', 'cáchxl']),
                ketQua: getVal(['ketqua', 'kếtquả']),
                ghiChu: getVal(['ghichu', 'ghichú'])
            };
         }).filter(item => item.stt || item.maDd || item.nguoiXl);
     } catch (e) {
         console.error('Error fetching XuLyDoXa', e);
         return [];
     }
  },
  
  syncXuLyDoXaToSheet: async (entry: XuLyDoXaEntry) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'add_xulydoxa', data: entry }),
      });
      const rawText = await response.text();
      try {
         const result = JSON.parse(rawText);
         return { ok: result.status === 'success', message: result.message || JSON.stringify(result) };
      } catch(parseErr) {
         return { ok: false, message: 'html_response' };
      }
    } catch (e: any) {
      console.error('Failed to sync XuLyDoXa to sheet', e);
      return { ok: false, message: e.message || String(e) };
    }
  },


  syncXuLyDoXaBulkToSheet: async (entries: XuLyDoXaEntry[]) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'add_xulydoxa_bulk', data: entries }),
      });
      const rawText = await response.text();
      try {
         const result = JSON.parse(rawText);
         return { ok: result.status === 'success', message: result.message || JSON.stringify(result) };
      } catch(parseErr) {
         return { ok: false, message: 'html_response' };
      }
    } catch (e: any) {
      console.error('Failed to sync bulk XuLyDoXa to sheet', e);
      return { ok: false, message: e.message || String(e) };
    }
  },

    deleteXuLyDoXaBulk: async (items: any[]) => {
      try {
          const url = DataStore.getAppScriptUrl();
          if (!url) throw new Error('Chưa cấu hình URL Google Apps Script');
          const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'delete_xulydoxa_bulk', data: items })
          });
          const text = await res.text();
          try {
              const json = JSON.parse(text);
              if (json && json.status === 'error') {
                  throw new Error(json.message || 'Lỗi khi xóa từ Google Sheet');
              }
          } catch(err) {
              if (text && text.includes('error')) {
                  throw new Error(text);
              }
          }
          return true;
      } catch (e: any) {
          console.error('Lỗi deleteXuLyDoXaBulk:', e);
          alert('Lỗi xóa xử lý đo xa: ' + (e.message || String(e)));
          return false;
      }
  },

  deleteDcuBulk: async (items: any[]) => {
      try {
          const url = DataStore.getAppScriptUrl();
          if (!url) throw new Error('Chưa cấu hình URL Google Apps Script');
          const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'delete_dcu_bulk', data: items })
          });
          const text = await res.text();
          try {
              const json = JSON.parse(text);
              if (json && json.status === 'error') {
                  throw new Error(json.message || 'Lỗi khi xóa từ Google Sheet');
              }
          } catch(err) {
              if (text && text.includes('error')) {
                  throw new Error(text);
              }
          }
          return true;
      } catch (e: any) {
          console.error('Lỗi deleteDcuBulk:', e);
          alert('Lỗi xóa DCU: ' + (e.message || String(e)));
          return false;
      }
  },

  updateXuLyDoXaToSheet: async (entry: XuLyDoXaEntry) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update_xulydoxa', data: entry }),
      });
      const rawText = await response.text();
      try {
         const result = JSON.parse(rawText);
         return { ok: result.status === 'success', message: result.message || JSON.stringify(result) };
      } catch(parseErr) {
         console.error('Non-JSON response from GS:', rawText);
         return { ok: false, message: 'html_response' };
      }
    } catch (e: any) {
      console.error('Failed to update XuLyDoXa to sheet', e);
      return { ok: false, message: e.message || String(e) };
    }
  },

  syncToSheet: async (entry: Omit<WorkloadEntry, 'id' | 'timestamp'>) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'add_workload', data: entry }),
      });
      const result = await response.json();
      return result.status === 'success';
    } catch (error: any) {
      console.warn('Error syncing to sheet:', error.message || error);
      return false;
    }
  },

  syncProgressToSheet: async (task: TaskProgress) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'update_progress', data: task }),
      });
      const result = await response.json();
      return result.status === 'success';
    } catch (error: any) {
      console.warn('Error syncing progress to sheet:', error.message || error);
      return false;
    }
  },

  
  syncPlanToSheet: async (monthYear: string, items: {name: string, quantity: number}[]) => {
     try {
         const url = DataStore.getAppScriptUrl();
         if (!url) return false;
         
         const payload = {
            action: 'update_plan_month',
            monthYear,
            items
         };
         
         const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
         });
         const resData = await response.json();
         if (resData && resData.status === 'success') {
             try {
                let dmList = DataStore.getDinhMuc();
                let updated = false;
                for (const item of items) {
                    const dm = dmList.find(d => d.name === item.name);
                    if (dm) {
                        if (!dm.history) dm.history = {};
                        dm.history[monthYear] = item.quantity;
                        updated = true;
                    }
                }
                if (updated) {
                    safeSetItem(DINHMUC_KEY, JSON.stringify(dmList));
                }
             } catch(err) {
                 console.error('Error updating local cache for plan:', err);
             }
             return true;
         }
         return false;
     } catch (e) {
         console.error('syncPlanToSheet error:', e);
         return false;
     }
  },

  // Tải siêu tốc danh sách nhân viên & mật khẩu MSNV để phục vụ đăng nhập tức thì (chỉ mất ~0.5s thay vì tải toàn bộ 10 sheet)
  syncLoginMembers: async (): Promise<SheetMember[]> => {
    try {
      const sheetId = DataStore.getSpreadsheetId() || DEFAULT_SPREADSHEET_ID;
      
      const fetchWithTimeout = async (sheetName: string) => {
        try {
          return await DataStore.fetchSheetCSV(sheetName, sheetId);
        } catch {
          return '';
        }
      };

      // Tải song song CBCNV (MSNV/Mật khẩu) và CongTac (Tổ công tác/Chức danh)
      const [cbcnvText, ctText] = await Promise.all([
        fetchWithTimeout('CBCNV'),
        fetchWithTimeout('CongTac')
      ]);

      let cbcnvMap = new Map<string, { msnv: string; role: string }>();
      if (cbcnvText && !cbcnvText.includes('<html')) {
        const { data } = Papa.parse(cbcnvText, { header: false });
        let headRow = -1;
        let msnvCol = -1, nameCol = -1, roleCol = -1;
        for (let r = 0; r < Math.min(5, data.length); r++) {
          const rowData = data[r] as string[];
          if (!rowData) continue;
          for (let c = 0; c < rowData.length; c++) {
            const val = String(rowData[c] || '').toLowerCase().trim();
            if (val.includes('mã nhân viên') || val.includes('msnv')) {
              msnvCol = c;
              headRow = r;
            }
            if (val.includes('họ và tên') || val === 'họ tên') nameCol = c;
            if (val.includes('chức danh') || val.includes('công việc') || val.includes('chức vụ')) roleCol = c;
          }
          if (headRow !== -1) break;
        }

        if (headRow !== -1 && msnvCol !== -1 && nameCol !== -1) {
          for (let i = headRow + 1; i < data.length; i++) {
            const row = data[i] as string[];
            if (row && row.length > Math.max(msnvCol, nameCol)) {
              const msnv = String(row[msnvCol] || '').trim();
              const rawName = String(row[nameCol] || '').trim();
              const role = roleCol !== -1 ? String(row[roleCol] || '').trim() : '';
              if (rawName && msnv) {
                const key = rawName.toLowerCase().replace(/\s+/g, '');
                cbcnvMap.set(key, { msnv, role });
              }
            }
          }
        }
      }

      let newMembers: SheetMember[] = [];
      let newTeams = new Set<string>();
      if (ctText && !ctText.includes('<html')) {
        const ctData = Papa.parse(ctText, { header: false }).data;
        let headerRowIdx = -1, nameColIdx = -1, msnvColIdx = -1, roleColIdx = -1, teamColIdx = 5, boPhanColIdx = -1;
        for (let r = 0; r < Math.min(5, ctData.length); r++) {
          const rowData = ctData[r] as string[];
          if (!rowData) continue;
          for (let c = 0; c < rowData.length; c++) {
            const val = String(rowData[c] || '').toLowerCase().trim();
            const cleanVal = val.replace(/\s+/g, '');
            if (val.includes('họ và tên') || val === 'họ tên' || cleanVal === 'họvàtên' || cleanVal === 'họtên') {
              headerRowIdx = r;
              nameColIdx = c;
            }
            if (cleanVal === 'msnv' || cleanVal === 'manv' || val.includes('mã nhân viên') || val.includes('msnv') || val.includes('mật khẩu') || val.includes('password')) {
              msnvColIdx = c;
            }
            if (val.includes('tổ công tác') || cleanVal.includes('tổcôngtác') || val.includes('khu vực')) {
              teamColIdx = c;
            }
            if (cleanVal.includes('chứcdanh') || cleanVal.includes('chucdanh') || val.includes('chức vụ') || cleanVal.includes('chứcdanh,côngviệc')) {
              roleColIdx = c;
            }
            if (val.includes('bộ phận') || val.includes('bo phan')) {
              boPhanColIdx = c;
            }
          }
          if (headerRowIdx !== -1) break;
        }

        if (headerRowIdx !== -1 && nameColIdx !== -1) {
          let currentTeam = '';
          for (let i = headerRowIdx + 1; i < ctData.length; i++) {
            const row = ctData[i] as string[];
            if (!row || !row[nameColIdx]) continue;
            const rawName = row[nameColIdx].trim();
            if (!rawName) continue;

            let teamStr = row[teamColIdx] ? row[teamColIdx].trim().replace(/\s+/g, ' ') : '';
            if (teamStr && teamStr.toLowerCase() !== 'khu vực' && teamStr.toLowerCase() !== 'tổ công tác') {
              currentTeam = teamStr;
            }
            let finalTeam = currentTeam || 'Không xác định';
            if (finalTeam && finalTeam.toLowerCase() !== 'khu vực' && finalTeam.toLowerCase() !== 'tổ công tác') {
              newTeams.add(finalTeam);
            }

            const key = rawName.toLowerCase().replace(/\s+/g, '');
            const cbcnvInfo = cbcnvMap.get(key) || { msnv: '', role: '' };
            let memberMsnv = cbcnvInfo.msnv;
            if (msnvColIdx !== -1 && row[msnvColIdx]) {
              memberMsnv = String(row[msnvColIdx]).trim();
            }

            let memberRole = roleColIdx !== -1 && row[roleColIdx] ? String(row[roleColIdx]).trim() : cbcnvInfo.role;
            const normRawName = rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().trim();
            if (normRawName.includes('nguyen thanh phong') || normRawName.includes('thanh phong')) {
              memberRole = memberRole ? `Đội trưởng, ${memberRole}` : 'Đội trưởng';
            }

            let memberBoPhan = boPhanColIdx !== -1 && row[boPhanColIdx] ? String(row[boPhanColIdx]).trim() : '';
            const isTienOrDvkh = normRawName.includes('pham minh tien') || normRawName.includes('minh tien') || finalTeam.toLowerCase().includes('dvkh') || memberRole.toLowerCase().includes('dvkh');
            if (!memberBoPhan && isTienOrDvkh) {
              memberBoPhan = 'DVKH';
            }
            if (isTienOrDvkh && (!finalTeam || finalTeam === 'Không xác định')) {
              finalTeam = 'DVKH';
            }

            newMembers.push({
              name: rawName,
              team: finalTeam,
              msnv: memberMsnv,
              role: memberRole,
              sinhNhat: '',
              boPhanCongTac: memberBoPhan,
              boPhan: memberBoPhan
            });
          }
        }
      }

      if (newMembers.length > 0) {
        safeSetItem(MEMBERS_KEY, JSON.stringify(newMembers));
        if (newTeams.size > 0) {
          safeSetItem(TEAMS_KEY, JSON.stringify(Array.from(newTeams)));
        }
        return newMembers;
      }
    } catch (e) {
      console.warn('syncLoginMembers error:', e);
    }
    return DataStore.getMembers();
  },

  syncMasterData: async () => {
    try {
      let json: any = { status: 'success', members: [], teams: [] };
      try {
        const url = DataStore.getAppScriptUrl();
        if (url) {
          const res = await fetch(`${url}?action=getData&_t=${new Date().getTime()}`);
          const fetchedJson = await res.json();
          if (fetchedJson && fetchedJson.status === 'success') {
            json = fetchedJson;
          }
        }
      } catch(e) {
        console.warn("Could not fetch from App Script. Proceeding with CSV fallback.", e);
      }

      if (json.status === 'success') {
         const sheetId = DataStore.getSpreadsheetId() || json.spreadsheetId || DEFAULT_SPREADSHEET_ID;
         // Lấy MSNV và Nhóm từ CSV
         try {
            let cbcnvMap = new Map<string, {msnv: string, role: string}>();
            try {
               const csvText = await DataStore.fetchSheetCSV('CBCNV', sheetId);
               if (csvText && !csvText.includes('<html')) {
                   const { data } = Papa.parse(csvText, { header: false });
                   let headRow = -1;
                   let msnvCol = -1, nameCol = -1, roleCol = -1;

                   for (let r = 0; r < 5; r++) {
                       if (!data[r]) continue;
                       const rowData = data[r] as string[];
                       for (let c = 0; c < rowData.length; c++) {
                           const val = String(rowData[c] || '').toLowerCase().trim();
                           if (val.includes('mã nhân viên') || val.includes('msnv')) {
                               msnvCol = c;
                               headRow = r;
                           }
                           if (val.includes('họ và tên') || val === 'họ tên') nameCol = c;
                           if (val.includes('chức danh') || val.includes('công việc') || val.includes('chức vụ')) roleCol = c;
                       }
                       if (headRow !== -1) break;
                   }

                   if (headRow !== -1 && msnvCol !== -1 && nameCol !== -1) {
                       for (let i = headRow + 1; i < data.length; i++) {
                          const row = data[i] as string[];
                          if (row && row.length > Math.max(msnvCol, nameCol)) {
                             const msnv = String(row[msnvCol] || '').trim();
                             const rawName = String(row[nameCol] || '').trim();
                             const role = roleCol !== -1 ? String(row[roleCol] || '').trim() : '';
                             if (rawName && msnv) {
                                const key = rawName.toLowerCase().replace(/\s+/g, '');
                                cbcnvMap.set(key, { msnv, role });
                             }
                          }
                       }
                   }
               }
            } catch (e) {
               console.warn("Could not read CBCNV sheet for MSNV", e);
            }

            let ctText = '';
            let newMembers: any[] = [];
            let newTeams = new Set<string>();

            // Bắt buộc lấy danh sách tên, nhóm từ sheet CongTac
            try {
               const ctSheets = ['CongTac', 'Cong Tac', 'Công tác', 'Công Tác', 'Con Tác'];
               for (const sheetName of ctSheets) {
                   const tempText = await DataStore.fetchSheetCSV(sheetName, sheetId);
                   if (tempText && !tempText.includes('<html') && tempText.trim() && tempText.length > 50) {
                      ctText = tempText;
                      break;
                   }
               }
               
               if (ctText) {
                   const ctData = Papa.parse(ctText, { header: false }).data;
                   let headerRowIdx = -1;
                   let nameColIdx = -1;
                   let msnvColIdx = -1;
                   let roleColIdx = -1;
                   let roleColScore = 0;
                   let teamColIdx = -1;
                   let teamColScore = 0;
                   let sinhNhatColIdx = -1;
                   let boPhanColIdx = -1;
                   let boPhanColScore = 0;
                   
                   for(let r=0; r<5; r++) {
                       if(ctData[r]) {
                           const rowData = ctData[r] as string[];
                           for(let c=0; c<rowData.length; c++) {
                               const val = String(rowData[c] || '').toLowerCase().trim();
                               const cleanVal = val.replace(/\s+/g, '');
                               
                               if (val.includes('họ và tên') || val === 'họ tên' || cleanVal === 'họvàtên' || cleanVal === 'họtên') {
                                   headerRowIdx = r;
                                   nameColIdx = c;
                               }
                               if (cleanVal === 'msnv' || cleanVal === 'manv' || val.includes('mã nhân viên') || val.includes('msnv') || val.includes('mật khẩu') || val.includes('password')) {
                                   msnvColIdx = c;
                               }
                               if(val.includes('sinh') || val.includes('ngàysinh') || cleanVal.includes('ngàysinh')) {
                                   sinhNhatColIdx = c;
                               }
                               
                               // Prioritize Chức danh, công việc
                               const isIgnoredJobDesc = val.includes('nội dung') || val.includes('nhiệm vụ') || val.includes('mô tả') || val.includes('địa bàn') || val.includes('kế hoạch') || val.includes('thực hiện');
                               if (!isIgnoredJobDesc) {
                                   if (cleanVal.includes('chứcdanh,côngviệc') || cleanVal.includes('chucdanh,congviec') || (val.includes('chức danh') && val.includes('công việc'))) {
                                       if (roleColScore < 100) {
                                           roleColIdx = c;
                                           roleColScore = 100;
                                       }
                                   } else if (cleanVal.includes('chứcdanh') || cleanVal.includes('chucdanh') || cleanVal.includes('chứcvụ') || cleanVal.includes('chucvu')) {
                                       if (roleColScore < 80) {
                                           roleColIdx = c;
                                           roleColScore = 80;
                                       }
                                   } else if (cleanVal === 'côngviệc' || cleanVal === 'congviec' || val === 'công việc') {
                                       if (roleColScore < 50) {
                                           roleColIdx = c;
                                           roleColScore = 50;
                                       }
                                   }
                               }

                               // Prioritize Tổ công tác / Khu vực
                               if (!val.includes('bộ phận') && !val.includes('chức danh')) {
                                   if (val.includes('tổ công tác') || cleanVal.includes('tổcôngtác')) {
                                       if (teamColScore < 100) {
                                           teamColIdx = c;
                                           teamColScore = 100;
                                       }
                                   } else if (val.includes('khu vực') || val.includes('khu vuc')) {
                                       if (teamColScore < 80) {
                                           teamColIdx = c;
                                           teamColScore = 80;
                                       }
                                   }
                               }

                               // Prioritize Bộ phận công tác
                               if (val.includes('bộ phận') || val.includes('bo phan') || val.includes('phòng ban') || val.includes('đơn vị') || val.includes('don vi')) {
                                   if (val.includes('bộ phận công tác') || cleanVal.includes('bộphậncôngtác')) {
                                       if (boPhanColScore < 100) {
                                           boPhanColIdx = c;
                                           boPhanColScore = 100;
                                       }
                                   } else if (boPhanColScore < 80) {
                                       boPhanColIdx = c;
                                       boPhanColScore = 80;
                                   }
                               }
                           }
                       }
                       if(headerRowIdx !== -1) break;
                   }
                   if (teamColIdx === -1) teamColIdx = 5;

                   if(headerRowIdx !== -1) {
                       let currentTeam = '';
                       for (let i = headerRowIdx + 1; i < ctData.length; i++) {
                          const row = ctData[i] as string[];
                          
                          let teamStr = row[teamColIdx] ? row[teamColIdx].trim().replace(/\s+/g, ' ') : '';
                          if (teamStr && teamStr.toLowerCase() !== 'khu vực' && teamStr.toLowerCase() !== 'tổ công tác') {
                              currentTeam = teamStr;
                          }
                          
                          if (!row || !row[nameColIdx]) continue;
                          const rawName = row[nameColIdx].trim();
                          if (!rawName) continue;
                          
                          let finalTeam = currentTeam || 'Không xác định';

                          if (finalTeam && finalTeam.toLowerCase() !== 'khu vực' && finalTeam.toLowerCase() !== 'tổ công tác') {
                              newTeams.add(finalTeam);
                          } else {
                              finalTeam = 'Không xác định';
                          }

                          const key = rawName.toLowerCase().replace(/\s+/g, '');
                          const cbcnvInfo = cbcnvMap.get(key) || { msnv: '', role: '' };
                          
                          let memberMsnv = cbcnvInfo.msnv;
                          if (msnvColIdx !== -1 && row[msnvColIdx]) {
                              memberMsnv = String(row[msnvColIdx]).trim();
                          }

                          let sinhNhat = '';
                          const existingMember = (json.members || []).find((m: any) => m.name === rawName);
                          if (existingMember && existingMember.sinhNhat) {
                              sinhNhat = existingMember.sinhNhat;
                          } else if (sinhNhatColIdx !== -1 && row[sinhNhatColIdx]) {
                              sinhNhat = String(row[sinhNhatColIdx]).trim().replace(/[\-\.]/g, '/');
                              var p = sinhNhat.split('/');
                              if (p.length >= 2) {
                                  var day = p[0].length === 1 ? '0' + p[0] : p[0];
                                  var month = p[1].length === 1 ? '0' + p[1] : p[1];
                                  sinhNhat = day + '/' + month + (p.length === 3 ? '/' + p[2] : '');
                              }
                          }

                          // Read role from column 'Chức danh, công việc' in sheet CongTac
                          let memberRole = '';
                          if (roleColIdx !== -1 && row[roleColIdx]) {
                              memberRole = String(row[roleColIdx]).trim();
                          }
                          if (!memberRole && cbcnvInfo.role) {
                              memberRole = cbcnvInfo.role;
                          } else if (memberRole && cbcnvInfo.role && !memberRole.toLowerCase().includes(cbcnvInfo.role.toLowerCase())) {
                              const isLeaderRole = ['đội trưởng', 'đội phó', 'giám đốc', 'tổ trưởng', 'tổ phó'].some(k => memberRole.toLowerCase().includes(k));
                              if (!isLeaderRole) {
                                  memberRole = memberRole + ', ' + cbcnvInfo.role;
                              }
                          }

                          // Ensure Nguyễn Thành Phong is explicitly recognized as Đội trưởng
                          const normRawName = rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();
                          if (normRawName.includes('nguyen thanh phong') || normRawName.includes('thanh phong')) {
                              if (!memberRole.toLowerCase().includes('đội trưởng') && !memberRole.toLowerCase().includes('doi truong')) {
                                  memberRole = memberRole ? `Đội trưởng, ${memberRole}` : 'Đội trưởng';
                              }
                          }

                          let memberBoPhan = '';
                          if (boPhanColIdx !== -1 && row[boPhanColIdx]) {
                              memberBoPhan = String(row[boPhanColIdx]).trim();
                          }
                          const isTienOrDvkh = normRawName.includes('pham minh tien') || normRawName.includes('minh tien') || finalTeam.toLowerCase().includes('dvkh') || memberRole.toLowerCase().includes('dvkh');
                          if (!memberBoPhan && isTienOrDvkh) {
                              memberBoPhan = 'DVKH';
                          }
                          if (isTienOrDvkh && (!finalTeam || finalTeam === 'Không xác định')) {
                              finalTeam = 'DVKH';
                          }

                          newMembers.push({
                              name: rawName,
                              team: finalTeam,
                              msnv: memberMsnv,
                              role: memberRole,
                              sinhNhat: sinhNhat,
                              boPhanCongTac: memberBoPhan,
                              boPhan: memberBoPhan
                          });
                       }
                   }
               }
            } catch (e) {
               console.error('Error fetching CongTac config', e);
            }

            if (newMembers.length > 0) {
                json.members = newMembers;
            }
            if (newTeams.size > 0) {
                json.teams = Array.from(newTeams).filter(t => t && t !== 'Không xác định' && t !== 'Tổ công tác' && t !== 'Khu vực');
            }

            // Fetch "Nhật ký/CongTac" for workloads directly!
            try {
               // We already fetched ctText and ctData above
               const ctDataForWorkloads = Papa.parse(ctText, { header: false }).data;
               const newWorkloads: WorkloadEntry[] = [];
               
               let headerRowIdx = -1;
               let nameColIdx = -1;
               let teamColIdx = 5; // default fallback
               for(let r = 0; r < 5; r++) {
                   if (!ctDataForWorkloads[r]) continue;
                   const rData = ctDataForWorkloads[r] as string[];
                   for(let c = 0; c < rData.length; c++) {
                       const val = String(rData[c] || '').toLowerCase().trim();
                       if (val.includes('họ và tên') || val === 'họ tên') {
                           headerRowIdx = r;
                           nameColIdx = c;
                       }
                       if (val.includes('khu vực') || val.includes('khu vuc') || val.includes('tổ công tác') || val.includes('đội')) {
                           teamColIdx = c;
                       }
                   }
                   if(headerRowIdx !== -1) break;
               }

               if(headerRowIdx !== -1) {
                   const headers = ctDataForWorkloads[headerRowIdx] as string[];
                   let currentTeamWkt = '';
                   
                   for(let r = headerRowIdx + 1; r < ctDataForWorkloads.length; r++) {
                       const row = ctDataForWorkloads[r] as string[];
                       
                       let teamStr = row[teamColIdx] ? String(row[teamColIdx]).trim() : '';
                       if (teamStr && teamStr.toLowerCase() !== 'khu vực' && teamStr.toLowerCase() !== 'tổ công tác') {
                           currentTeamWkt = teamStr;
                       }
                       
                       if (!row || !row[nameColIdx]) continue;
                       const memberName = row[nameColIdx].trim();
                       if (!memberName) continue;
                       
                       const mLower = memberName.toLowerCase();
                       if (mLower.includes('tổng') || mLower.includes('cộng') || mLower.includes('kế') || mLower === 'tc') continue;
                       
                       let finalTeam = currentTeamWkt || 'Không xác định';
                       
                       for(let c = 0; c < headers.length; c++) { // dates start wherever a date-like header is found
                           if (!headers[c]) continue;
                           const dateStr = headers[c].trim();
                           // Ensure header looks like a date/has numbers
                           if (!dateStr.match(/\d+\/\d+/)) continue;

                           const cellValue = row[c] ? String(row[c]).trim() : '';
                           if (cellValue) {
                               const parts = dateStr.split('/');
                               let formattedDate = dateStr;
                               if (parts.length >= 2) {
                                   let day = parts[0];
                                   let month = parts[1];
                                   let year = parts[2] || new Date().getFullYear().toString();
                                   formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                               }

                               // Normalize group IDs based on content
                               let normalizedContent = cellValue;
                               const lines = cellValue.split('\n');
                               const lastLine = lines[lines.length - 1].trim();
                               if (/^\d+$/.test(lastLine)) {
                                   const gId = parseInt(lastLine, 10);
                                   if (gId > 0) {
                                       const coreContent = lines.slice(0, lines.length - 1).join('\n').trim();
                                       normalizedContent = coreContent + '\n' + gId;
                                   }
                               }

                               // Combine duplicate entries using normalized content
                               let existing = null;
                               const linesNorm = normalizedContent.split('\n');
                               const lastLineNorm = linesNorm[linesNorm.length - 1].trim();
                               const gIdNorm = /^\d+$/.test(lastLineNorm) ? parseInt(lastLineNorm, 10) : 0;
                               
                               // new behavior: merge by gId AND EXACT CONTENT across different teams
                               // NEVER merge ID 0
                               if (gIdNorm > 0) {
                                   existing = newWorkloads.find(w => {
                                       if (w.date !== formattedDate) return false;
                                       if (w.content !== normalizedContent) return false;
                                       const wLines = w.content.split('\n');
                                       const wLast = wLines[wLines.length - 1].trim();
                                       const wId = /^\d+$/.test(wLast) ? parseInt(wLast, 10) : 0;
                                       return wId === gIdNorm;
                                   });
                               }

                               if (existing) {
                                   if (!existing.members.includes(memberName)) {
                                       existing.members.push(memberName);
                                   }
                                   const existingTeams = existing.team.split(',').map(t => t.trim());
                                   if (!existingTeams.includes(finalTeam)) {
                                       existing.team = existing.team + ', ' + finalTeam;
                                   }
                               } else {
                                   newWorkloads.push({
                                       id: Math.random().toString(36).substring(2, 9),
                                       content: normalizedContent,
                                       team: finalTeam,
                                       members: [memberName],
                                       timestamp: Date.now(),
                                       date: formattedDate
                                   });
                               }
                           }

                       }
                   }
               }
               
               // Post-processing: Ensure any report with only 1 member has ID 0
               newWorkloads.forEach(w => {
                   if (w.members.length === 1) {
                       const lines = w.content.split('\n');
                       const lastLine = lines[lines.length - 1].trim();
                       if (/^\d+$/.test(lastLine)) {
                           const gId = parseInt(lastLine, 10);
                           if (gId !== 0) {
                               lines[lines.length - 1] = '0';
                               w.content = lines.join('\n');
                           }
                       }
                   }
               });

               json.workloads = newWorkloads;
            } catch (e) {
               console.error('Error parsing CongTac for Workloads', e);
            }

            // Fetch "Tiến độ" sheet
            try {
               const progText = await DataStore.fetchSheetCSV("Tiến độ", sheetId);
               if (progText && !progText.includes('<html')) {
                   const { data: progData } = Papa.parse(progText, { header: true });
                   const progressList: TaskProgress[] = [];
                   for (const row of progData as any[]) {
                      const getVal = (opts: string[]) => {
                          for (const k of Object.keys(row)) {
                              const normalizedK = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
                              if (opts.some(opt => {
                                  const normalizedOpt = opt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
                                  return normalizedK === normalizedOpt;
                              })) {
                                  return row[k];
                              }
                          }
                          for (const k of Object.keys(row)) {
                              const normalizedK = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
                              if (opts.some(opt => {
                                  const normalizedOpt = opt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
                                  return normalizedK.includes(normalizedOpt);
                              })) {
                                  return row[k];
                              }
                          }
                          return '';
                      };
                      const content = getVal(['nội dung']);
                      const tt = getVal(['tt', 'stt']);
                      if (content || tt) {
                         const fallbackId = (String(content) + '-' + String(getVal(['phân công'])) + '-' + String(getVal(['ngày hoàn tất']))).replace(/\s/g, '').toLowerCase();
                         
                         const existingTaskIndex = progressList.findIndex(t => {
                             const existingFallbackId = (String(t.content) + '-' + String(t.assignee) + '-' + String(t.deadline)).replace(/\s/g, '').toLowerCase();
                             return existingFallbackId === fallbackId;
                         });

                         if (existingTaskIndex >= 0) {
                             // Merge with existing
                             const existingTask = progressList[existingTaskIndex];
                             const newExplanation = String(getVal(['giải trình']));
                             if (newExplanation.length > (existingTask.explanation || '').length) {
                                 existingTask.explanation = newExplanation;
                             }
                             const newStatus = String(getVal(['hoàn tất', 'trạng thái', 'kết quả']));
                             if (newStatus.toLowerCase() === 'xong') {
                                 existingTask.status = newStatus;
                             }
                             if (tt) {
                                 existingTask.id = String(tt);
                             }
                         } else {
                             progressList.push({
                                 id: String(tt || fallbackId),
                                 content: String(content || ''),
                                 reference: String(getVal(['căn cứ'])),
                                 deadline: String(getVal(['ngày hoàn tất'])),
                                 assignee: String(getVal(['phân công'])),
                                 status: String(getVal(['hoàn tất', 'trạng thái', 'kết quả'])),
                                 explanation: String(getVal(['giải trình']))
                             });
                         }
                      }
                   }
                   safeSetItem(PROGRESS_KEY, JSON.stringify(progressList));
               }
            } catch (e) {
               console.warn('Could not fetch Progress sheet', e);
            }

            // Fetch DinhMuc via CSV (Columns: A=STT, B=Nội dung, C=Định mức ngày, D=Chung nhóm, E=Quan hệ)
            try {
               const dmSheets = ['Định mức', 'Định Mức', 'Dinh muc', 'DinhMuc'];
               for (const sheetName of dmSheets) {
                  const dmText = await DataStore.fetchSheetCSV(sheetName, sheetId);
                  if (dmText && !dmText.includes('<html') && dmText.trim() && dmText.length > 50) {
                     const { data } = Papa.parse(dmText, { header: false });
                     if (data && data.length > 0) {
                         let headRow = -1;
                         let sttCol = -1, nameCol = -1, quotaCol = -1, groupCol = -1, relationCol = -1;
                         const historyCols: Record<string, number> = {};
                         
                         for (let r = 0; r < Math.min(data.length, 5); r++) {
                             if (!data[r]) continue;
                             const rowData = data[r] as string[];
                             for (let c = 0; c < rowData.length; c++) {
                                 const val = String(rowData[c] || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
                                 if (val.includes('stt') || (r === 0 && c === 0 && val.includes('stt'))) sttCol = c;
                                 if (val.includes('noi dung') || val.includes('ten') || val.includes('danh muc')) nameCol = c;
                                 if (val.includes('dinh muc') || val.includes('quota') || val.includes('diem') || val.includes('khoi luong') || val.includes('chi tieu')) quotaCol = c;
                                 if (val.includes('chung nhom')) {
                                     groupCol = c;
                                 } else if (groupCol === -1 && (val === 'nhom' || val.includes('chung'))) {
                                     groupCol = c;
                                 }
                                 if (val.includes('quan he')) relationCol = c;
                                 if (val.includes('thang') || /\d+\/\d{4}/.test(val)) historyCols[String(rowData[c]).trim()] = c;
                             }
                             if (nameCol !== -1) {
                                 headRow = r;
                                 break;
                             }
                         }
            
                         if (headRow !== -1 && nameCol !== -1) {
                             const newDinhMuc: DinhMucItem[] = [];
                             for (let i = headRow + 1; i < data.length; i++) {
                                 const row = data[i] as string[];
                                 if (!row || row.length <= nameCol) continue;
                                 
                                 const val1 = String(row[nameCol] || '').trim();
                                 if (!val1 || val1.toLowerCase() === 'stt' || val1.toLowerCase() === 'tong' || val1.toLowerCase() === 'tổng') continue;
                                 
                                 const stt = sttCol !== -1 && row[sttCol] ? String(row[sttCol]).trim() : String(newDinhMuc.length + 1);
                                 let quotaStr = quotaCol !== -1 ? String(row[quotaCol] || '0').replace(/,/g, '.') : '0';
                                 let val2 = parseFloat(quotaStr);
                                 if (isNaN(val2)) val2 = 0;
                                 
                                 let isGroupStr = groupCol !== -1 ? String(row[groupCol] || '').toLowerCase().trim() : '';
                                 let isGroup = isGroupStr === 'x';
                                 
                                 let relation = relationCol !== -1 ? String(row[relationCol] || '').trim() : '';
                                 
                                 let history: Record<string, number> = {};
                                 Object.keys(historyCols).forEach(k => {
                                     let colIdx = historyCols[k];
                                     if (colIdx !== undefined && row.length > colIdx) {
                                         let hVal = parseFloat(String(row[colIdx] || '0').replace(/,/g, '.'));
                                         if (!isNaN(hVal)) history[k] = hVal;
                                     }
                                 });
                                 
                                 newDinhMuc.push({ 
                                     id: `dm-${stt}-${newDinhMuc.length + 1}`,
                                     stt,
                                     name: val1, 
                                     quota: val2, 
                                     isGroup, 
                                     history, 
                                     relation 
                                 });
                             }
                             
                             if (newDinhMuc.length > 0) {
                                 json.dinhMuc = newDinhMuc;
                                 break;
                             }
                         }
                     }
                  }
               }
            } catch (e) {
               console.warn('Could not fetch DinhMuc', e);
            }

            // Fetch TUTI via CSV
            if (!json.tuti || json.tuti.length === 0) {
               try {
                  const tutiText = await DataStore.fetchSheetCSV("TUTI", sheetId);
                  if (tutiText && !tutiText.includes('<html') && tutiText.trim()) {
                      const { data: tutiData } = Papa.parse(tutiText, { header: true });
                      const tutiList: TutiEntry[] = [];
                      let index = 0;
                      for (const row of tutiData as any[]) {
                          index++;
                          if (!row || Object.keys(row).length === 0) continue;
                          const getVal = (opts: string[]) => {
                              const cleanVal = (v: string) => {
                                  if (!v) return v;
                                  if (v.includes('GMT+') || v.includes('Indochina Time') || v.match(/^[a-zA-Z]{3} [a-zA-Z]{3} \d{1,2} \d{4}/)) {
                                      const d = new Date(v);
                                      if (!isNaN(d.getTime())) {
                                          return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                                      }
                                  }
                                  return v;
                              };
                              for (const k of Object.keys(row)) {
                                  let normalizedK = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
                                  if (opts.some(opt => {
                                      let normalizedOpt = opt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
                                      return normalizedK === normalizedOpt;
                                  })) {
                                      let v = row[k] ? String(row[k]) : '';
                                      if (v.startsWith("'")) v = v.substring(1);
                                      return cleanVal(v);
                                  }
                              }
                              for (const k of Object.keys(row)) {
                                  let normalizedK = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
                                  if (opts.some(opt => {
                                      let normalizedOpt = opt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
                                      return normalizedOpt.length > 3 && normalizedK.includes(normalizedOpt) && !normalizedK.includes('kiemtra');
                                  })) {
                                      let v = row[k] ? String(row[k]) : '';
                                      if (v.startsWith("'")) v = v.substring(1);
                                      return cleanVal(v);
                                  }
                              }
                              return '';
                          };
                          
                          const formatIfDateCSV = (dStr: string) => {
                              if (!dStr) return '';
                              const slashParts = dStr.split('/');
                              if (slashParts.length === 3) {
                                   const day = slashParts[0].padStart(2, '0');
                                   const month = slashParts[1].padStart(2, '0');
                                   let year = slashParts[2];
                                   if (year.length === 2) year = '20' + year;
                                   return `${day}/${month}/${year}`;
                              }
                              const d = new Date(dStr);
                              if (!isNaN(d.getTime()) && (dStr.includes('T') || dStr.includes('GMT') || dStr.includes('Z') || dStr.match(/^[a-zA-Z]{3,}/))) {
                                  return [
                                      d.getDate().toString().padStart(2, '0'),
                                      (d.getMonth() + 1).toString().padStart(2, '0'),
                                      d.getFullYear()
                                  ].join('/');
                              }
                              return dStr;
                          };
  
                          const normalizeKetLuanCSV = (k: string) => {
                              if (!k) return '';
                              const clean = k.trim().toLowerCase();
                              if (clean === 'đúng') return 'Đúng';
                              if (clean === 'sai') return 'Sai';
                              return clean ? k.trim() : '';
                          };
  
                          const maTram = getVal(['mã trạm']);
                          const tenDiemDo = getVal(['tên điểm đo']);
                          if (maTram || tenDiemDo) {
                             tutiList.push({
                                 id: `${maTram.trim()}-${tenDiemDo.trim()}-${index}`.replace(/\s+/g, '-').toLowerCase(),
                                 maTram: maTram,
                                 tenDiemDo: tenDiemDo,
                                 thongSoTU: getVal(['thông số tu', 'tu', 't.u', 'thong_so_tu', 'thong so tu', 'tỷ số tu', 'thông số tu/ti', 'thong so tu/ti', 'tu/ti', 'tu / ti']),
                                 thongSoTI: getVal(['thông số ti', 'ti', 't.i', 'thong_so_ti', 'thong so ti', 'tỷ số ti', 'thông số tu/ti', 'thong so tu/ti', 'tu/ti', 'tu / ti']),
                                 kiemTraTU: getVal(['kiểm tra tu']),
                                 kiemTraTI: getVal(['kiểm tra ti']),
                                 khac: getVal(['khác']),
                                 ketLuan: normalizeKetLuanCSV(getVal(['kết luận'])),
                                 ngayCapNhat: formatIfDateCSV(getVal(['ngày cập nhật'])),
                                 ngayDuaLen: formatIfDateCSV(getVal(['ngày đưa lên'])),
                                 nguoiDuaLen: getVal(['người đưa lên']),
                                 nguoiKiemTra: getVal(['người kiểm tra']),
                             });
                          }
                      }
                      console.log('TUTI CSV Fetched successfully, rows:', tutiList.length);
                      safeSetItem(TUTI_KEY, JSON.stringify(tutiList));
                  }
               } catch (e) {
                  console.warn('Could not fetch TUTI', e);
               }
            }

            // Fetch MatKetNoi, ChiTietMKN, KhuVuc in parallel
            try {
               await Promise.all([
                 DataStore.fetchMatKetNoiFromSheet(sheetId),
                 DataStore.fetchChiTietMKNFromSheet(sheetId),
                 DataStore.fetchKhuVucFromSheet(sheetId)
               ]);
            } catch (e) {
               console.warn('Could not fetch doxa sheets in parallel:', e);
            }

            // Fetch SangTai
            try {
               const stText = await DataStore.fetchSheetCSV("SangTai", sheetId);
               if (stText && !stText.includes('<html')) {
                   const { data } = Papa.parse(stText, { header: true, skipEmptyLines: true });
                   if (data && data.length > 0) {
                       memCacheSangTaiList = data;
                       try {
                           safeSetItem('sheet_sangtai_v1', JSON.stringify(data));
                       } catch(e) {
                           console.warn("localStorage quota exceeded for SangTai");
                       }
                   }
               }
            } catch(e) {
               console.warn('Could not fetch SangTai:', e);
            }

            // Fetch Kho
            try {
               const khoText = await DataStore.fetchSheetCSV("Kho", sheetId);
               if (khoText && !khoText.includes('<html')) {
                   const { data } = Papa.parse(khoText, { header: true, skipEmptyLines: true });
                   if (data && data.length > 0) {
                       memCacheKhoList = data;
                       try {
                           safeSetItem('sheet_kho_v1', JSON.stringify(data));
                       } catch(e) {
                           console.warn("localStorage quota exceeded for Kho");
                       }
                   }
               }
            } catch(e) {
               console.warn('Could not fetch Kho:', e);
            }

            // Fetch VTTB
            try {
               const vttbText = await DataStore.fetchSheetCSV("VTTB", sheetId);
               if (vttbText && !vttbText.includes('<html')) {
                   const { data } = Papa.parse(vttbText, { header: true, skipEmptyLines: true });
                   if (data && data.length > 0) {
                       memCacheVTTBList = data;
                       try {
                           safeSetItem('sheet_vttb_v1', JSON.stringify(data));
                       } catch(e) {
                           console.warn("localStorage quota exceeded for VTTB");
                       }
                   }
               }
            } catch(e) {
               console.warn('Could not fetch VTTB:', e);
            }

            // Fetch DVKH
            try {
               const dvkhSheetNames = ['DVKH', 'dvkh', 'Dịch vụ khách hàng', 'DV_KH'];
               let dvkhText = '';
               for (const sName of dvkhSheetNames) {
                   const tempText = await DataStore.fetchSheetCSV(sName, sheetId);
                   if (tempText && !tempText.includes('<html') && tempText.trim().length > 20) {
                       dvkhText = tempText;
                       break;
                   }
               }
               if (dvkhText) {
                   const parsed = DataStore.parseDvkhCSVData(dvkhText);
                   if (parsed && parsed.length > 0) {
                       const localEntries = DataStore.getDvkhEntries();
                       const merged = DataStore.mergeDvkhList(parsed, localEntries);
                       memCacheDvkhList = merged;
                       safeSetItem(DVKH_KEY, JSON.stringify(merged));
                       try { await set(DVKH_KEY, merged); } catch(err) {}
                       window.dispatchEvent(new CustomEvent('dvkh_updated'));
                       DataStore.syncPendingDvkhUpdates().catch(() => {});
                   }
               }
            } catch(e) {
               console.warn('Could not fetch DVKH sheet:', e);
            }

            // Fetch QuaHan
            try {
               const qhSheetNames = ['QuaHan', 'quahan', 'Quá hạn', 'Qua Han', 'Qua_Han'];
               let qhText = '';
               for (const sName of qhSheetNames) {
                   const tempText = await DataStore.fetchSheetCSV(sName, sheetId);
                   if (tempText && !tempText.includes('<html') && tempText.trim().length > 20) {
                       qhText = tempText;
                       break;
                   }
               }
               if (qhText) {
                   const parsedQh = DataStore.parseQuaHanCSVData(qhText);
                   if (parsedQh && parsedQh.length > 0) {
                       memCacheQuaHanList = parsedQh;
                       safeSetItem(QUAHAN_KEY, JSON.stringify(parsedQh));
                       try { await set(QUAHAN_KEY, parsedQh); } catch(err) {}
                   }
               }
            } catch(e) {
               console.warn('Could not fetch QuaHan sheet:', e);
            }

            // Fetch TU sheet
            try {
               const tuText = await DataStore.fetchSheetCSV("TU", sheetId);
               if (tuText && !tuText.includes('<html') && tuText.trim().length > 20) {
                   const parsedTu = DataStore.parseTuCSVData(tuText);
                   if (parsedTu && parsedTu.length > 0) {
                       memCacheTuSheetList = parsedTu;
                       safeSetItem(TU_SHEET_KEY, JSON.stringify(parsedTu));
                       try { await set(TU_SHEET_KEY, parsedTu); } catch(err) {}
                   }
               }
            } catch(e) {
               console.warn('Could not fetch TU sheet:', e);
            }

            // Fetch TI sheet
            try {
               const tiText = await DataStore.fetchSheetCSV("TI", sheetId);
               if (tiText && !tiText.includes('<html') && tiText.trim().length > 20) {
                   const parsedTi = DataStore.parseTiCSVData(tiText);
                   if (parsedTi && parsedTi.length > 0) {
                       memCacheTiSheetList = parsedTi;
                       safeSetItem(TI_SHEET_KEY, JSON.stringify(parsedTi));
                       try { await set(TI_SHEET_KEY, parsedTi); } catch(err) {}
                   }
               }
            } catch(e) {
               console.warn('Could not fetch TI sheet:', e);
            }

            // Fetch QuaHan_Nam sheet
            try {
               const qhnNames = ['QuaHan_Nam', 'quahan_nam', 'QuaHanNam', 'Quá hạn năm', 'Qua_Han_Nam'];
               let qhnText = '';
               for (const sName of qhnNames) {
                   const tempText = await DataStore.fetchSheetCSV(sName, sheetId);
                   if (tempText && !tempText.includes('<html') && tempText.trim().length > 20) {
                       qhnText = tempText;
                       break;
                   }
               }
               if (qhnText) {
                   const parsedQhn = DataStore.parseQuaHanCSVData(qhnText);
                   if (parsedQhn && parsedQhn.length > 0) {
                       memCacheQuaHanNamList = parsedQhn;
                       safeSetItem(QUAHAN_NAM_KEY, JSON.stringify(parsedQhn));
                       try { await set(QUAHAN_NAM_KEY, parsedQhn); } catch(err) {}
                   }
               }
            } catch(e) {
               console.warn('Could not fetch QuaHan_Nam sheet:', e);
            }

            // Fetch TU_Nam sheet
            try {
               const tuNamNames = ['TU_Nam', 'tu_nam', 'TUNam', 'TU Nam', 'TU_nam'];
               let tunText = '';
               for (const sName of tuNamNames) {
                   const tempText = await DataStore.fetchSheetCSV(sName, sheetId);
                   if (tempText && !tempText.includes('<html') && tempText.trim().length > 20) {
                       tunText = tempText;
                       break;
                   }
               }
               if (tunText) {
                   const parsedTun = DataStore.parseTuCSVData(tunText);
                   if (parsedTun && parsedTun.length > 0) {
                       memCacheTuNamList = parsedTun;
                       safeSetItem(TU_NAM_KEY, JSON.stringify(parsedTun));
                       try { await set(TU_NAM_KEY, parsedTun); } catch(err) {}
                   }
               }
            } catch(e) {
               console.warn('Could not fetch TU_Nam sheet:', e);
            }

            // Fetch TI_Nam sheet
            try {
               const tiNamNames = ['TI_Nam', 'ti_nam', 'TINam', 'TI Nam', 'TI_nam'];
               let tinText = '';
               for (const sName of tiNamNames) {
                   const tempText = await DataStore.fetchSheetCSV(sName, sheetId);
                   if (tempText && !tempText.includes('<html') && tempText.trim().length > 20) {
                       tinText = tempText;
                       break;
                   }
               }
               if (tinText) {
                   const parsedTin = DataStore.parseTiCSVData(tinText);
                   if (parsedTin && parsedTin.length > 0) {
                       memCacheTiNamList = parsedTin;
                       safeSetItem(TI_NAM_KEY, JSON.stringify(parsedTin));
                       try { await set(TI_NAM_KEY, parsedTin); } catch(err) {}
                   }
               }
            } catch(e) {
               console.warn('Could not fetch TI_Nam sheet:', e);
            }

         } catch (e) {
            console.error('Error parsing CBCNV from CSV', e);
         }

         if (json.teams && json.teams.length > 0) {
           safeSetItem(TEAMS_KEY, JSON.stringify(json.teams));
         }
         if (json.members && json.members.length > 0) {
           safeSetItem(MEMBERS_KEY, JSON.stringify(json.members));
         }
         if (json.stations && json.stations.length > 0) {
           safeSetItem(STATIONS_KEY, JSON.stringify(json.stations));
         }
         if (json.headerDebug) {
           safeSetItem('HEADER_DEBUG', JSON.stringify(json.headerDebug));
         }
         if (json.idxDebug) {
           safeSetItem('IDX_DEBUG', JSON.stringify(json.idxDebug));
         }
         if (json.workloads) {
           safeSetItem(STORAGE_KEY, JSON.stringify(json.workloads));
         }
         if (json.dinhMuc) {
           safeSetItem(DINHMUC_KEY, JSON.stringify(json.dinhMuc));
         }
         if (json.tuti && json.tuti.length > 0) {
            const getTutiVal = (obj: any, keys: string[]) => {
                const cleanVal = (v: string) => {
                    if (!v) return v;
                    if (v.includes('GMT+') || v.includes('Indochina Time') || v.match(/^[a-zA-Z]{3} [a-zA-Z]{3} \d{1,2} \d{4}/)) {
                        const d = new Date(v);
                        if (!isNaN(d.getTime())) {
                            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                        }
                    }
                    return v;
                };
                for (const k of keys) {
                    if (obj[k] !== undefined) {
                        let v = String(obj[k]);
                        if (v.startsWith("'")) v = v.substring(1);
                        return cleanVal(v);
                    }
                }
                const allKeys = Object.keys(obj);
                for (const k of allKeys) {
                    const normK = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '').replace(/đ/g, 'd');
                    for (const pk of keys) {
                        const normPk = pk.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '').replace(/đ/g, 'd');
                        if (normK === normPk) {
                            let v = String(obj[k] || '');
                            if (v.startsWith("'")) v = v.substring(1);
                            return cleanVal(v);
                        }
                    }
                }
                for (const k of allKeys) {
                    const normK = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '').replace(/đ/g, 'd');
                    for (const pk of keys) {
                        const normPk = pk.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '').replace(/đ/g, 'd');
                        if (normPk.length > 3 && normK.includes(normPk) && !normK.includes('kiemtra')) {
                            let v = String(obj[k] || '');
                            if (v.startsWith("'")) v = v.substring(1);
                            return cleanVal(v);
                        }
                    }
                }
                return '';
            };

            const formatIfDate = (dStr: string) => {
                if (!dStr) return '';
                // Check if it's already in d/m/yyyy, dd/mm/yyyy or d/m/yy format
                const slashParts = dStr.split('/');
                if (slashParts.length === 3) {
                     const day = slashParts[0].padStart(2, '0');
                     const month = slashParts[1].padStart(2, '0');
                     let year = slashParts[2];
                     if (year.length === 2) year = '20' + year;
                     return `${day}/${month}/${year}`;
                }
                const d = new Date(dStr);
                if (!isNaN(d.getTime()) && (dStr.includes('T') || dStr.includes('GMT') || dStr.includes('Z') || dStr.match(/^[a-zA-Z]{3,}/))) {
                    return [
                        d.getDate().toString().padStart(2, '0'),
                        (d.getMonth() + 1).toString().padStart(2, '0'),
                        d.getFullYear()
                    ].join('/');
                }
                return dStr;
            };

            const normalizeKetLuan = (k: string) => {
                if (!k) return '';
                const clean = k.trim().toLowerCase();
                if (clean === 'đúng') return 'Đúng';
                if (clean === 'sai') return 'Sai';
                return clean ? k.trim() : '';
            };

            const formattedTuti = json.tuti.map((item: any, index: number) => ({
                id: `${getTutiVal(item, ['maTram', 'mã trạm']).trim()}-${getTutiVal(item, ['tenDiemDo', 'tên điểm đo']).trim()}-${index}`.replace(/\s+/g, '-').toLowerCase(),
                maTram: getTutiVal(item, ['maTram', 'mã trạm']),
                tenDiemDo: getTutiVal(item, ['tenDiemDo', 'tên điểm đo']),
                thongSoTU: getTutiVal(item, ['thongSoTU', 'thông số tu', 'tu', 't.u', 'thong_so_tu', 'thong so tu', 'tỷ số tu', 'tỷ số biến tu', 'ty so tu', 'Thông số TU', 'Thông số Tu', 'Thong so Tu', 'Thông số TU/TI', 'Thông số Tu/TI', 'tu/ti', 'TU/TI']),
                thongSoTI: getTutiVal(item, ['thongSoTI', 'thông số ti', 'ti', 't.i', 'thong_so_ti', 'thong so ti', 'tỷ số ti', 'tỷ số biến ti', 'ty so ti', 'Thông số TI', 'Thông số Ti', 'Thong so Ti', 'Thông số TU/TI', 'Thông số Tu/TI', 'tu/ti', 'TU/TI']),
                kiemTraTU: getTutiVal(item, ['kiemTraTU', 'kiểm tra tu']),
                kiemTraTI: getTutiVal(item, ['kiemTraTI', 'kiểm tra ti']),
                khac: getTutiVal(item, ['khac', 'khác']),
                ketLuan: normalizeKetLuan(getTutiVal(item, ['ketLuan', 'kết luận'])),
                ngayCapNhat: formatIfDate(getTutiVal(item, ['ngayCapNhat', 'ngày cập nhật'])),
                ngayDuaLen: formatIfDate(getTutiVal(item, ['ngayDuaLen', 'ngày đưa lên'])),
                nguoiDuaLen: getTutiVal(item, ['nguoiDuaLen', 'người đưa lên']),
                nguoiKiemTra: getTutiVal(item, ['nguoiKiemTra', 'người kiểm tra'])
            }));
            safeSetItem(TUTI_KEY, JSON.stringify(formattedTuti));
            // Keep local un-synced up to 1 hr
            const localCached = safeGetItem(LOCAL_TUTI_UPDATES_KEY);
            if (localCached) {
                try {
                    const localTasks = JSON.parse(localCached);
                    const now = Date.now();
                    const validLocal = localTasks.filter((t: any) => t.localTimestamp && (now - t.localTimestamp) < 60 * 60 * 1000);
                    if (validLocal.length > 0) {
                        safeSetItem(LOCAL_TUTI_UPDATES_KEY, JSON.stringify(validLocal));
                    } else {
                        safeSetItem(LOCAL_TUTI_UPDATES_KEY, "");
                    }
                } catch(e) { safeSetItem(LOCAL_TUTI_UPDATES_KEY, ""); }
            }
         }
         if (json.matKetNoi) {
            safeSetItem('sheet_matketnoi_v1', JSON.stringify(json.matKetNoi));
         }
         
         const localCached = safeGetItem(LOCAL_PROGRESS_UPDATES_KEY);
         if (localCached) {
             const localTasks: TaskProgress[] = JSON.parse(localCached);
             const now = Date.now();
             const validLocal = localTasks.filter(t => t.timestamp && (now - t.timestamp) < 30 * 24 * 60 * 60 * 1000);
             if (validLocal.length > 0) {
                 safeSetItem(LOCAL_PROGRESS_UPDATES_KEY, JSON.stringify(validLocal));
             } else {
                 safeSetItem(LOCAL_PROGRESS_UPDATES_KEY, "");
             }
         }
         return true;
      }
    } catch (error) {
      console.error('Master data sync error:', error);
    }
    return false;
  },

  getTeams: (): string[] => {
    try {
       const cached = safeGetItem(TEAMS_KEY);
       let teams = cached ? JSON.parse(cached) : [];
       if (!teams || teams.length === 0) {
           const membersCached = safeGetItem(MEMBERS_KEY);
           if (membersCached) {
               const members = JSON.parse(membersCached);
               const teamSet = new Set<string>();
               members.forEach((m: any) => m && m.team && teamSet.add(m.team));
               teams = Array.from(teamSet);
           }
       }
       return teams.filter((t: string) => t && t !== 'Không xác định' && t !== 'Tổ công tác' && t !== 'Khu vực');
    } catch { return []; }
  },

  getMembers: (): SheetMember[] => {
     try {
       const cached = safeGetItem(MEMBERS_KEY);
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
  },

  getStations: (): Station[] => {
     try {
       const cached = safeGetItem(STATIONS_KEY);
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
  },

  getMatKetNoi: (): any[] => {
     if (memCacheMatKetNoiList !== null) return memCacheMatKetNoiList;
     try {
       const cached = safeGetItem('sheet_matketnoi_v1');
       if (cached) {
         memCacheMatKetNoiList = JSON.parse(cached);
         return memCacheMatKetNoiList || [];
       }
       return [];
     } catch { return []; }
  },

  setMatKetNoi: async (list: any[]): Promise<void> => {
     // 1. XÓA SẠCH DỮ LIỆU CŨ HOÀN TOÀN
     memCacheMatKetNoiList = [];
     safeRemoveItem('sheet_matketnoi_v1');
     try { await del('sheet_matketnoi_v1'); } catch(e) {}

     // 2. ĐƯA DỮ LIỆU MỚI VÀO
     memCacheMatKetNoiList = Array.isArray(list) ? [...list] : [];
     safeSetItem('custom_matketnoi_uploaded_v1', 'true');
     try {
       safeSetItem('sheet_matketnoi_v1', JSON.stringify(memCacheMatKetNoiList));
     } catch(e) {
       console.warn('localStorage full for MatKetNoi', e);
     }
     try {
       await set('sheet_matketnoi_v1', memCacheMatKetNoiList);
     } catch(e) {
       console.warn('IDB save error for MatKetNoi', e);
     }

     if (typeof window !== 'undefined') {
       window.dispatchEvent(new CustomEvent('doxa_data_updated', { detail: { type: 'matketnoi', count: memCacheMatKetNoiList.length } }));
       window.dispatchEvent(new CustomEvent('workload_updated'));
     }
  },

  resetMatKetNoiToSheet: async (): Promise<void> => {
     safeRemoveItem('custom_matketnoi_uploaded_v1');
     safeRemoveItem('sheet_matketnoi_v1');
     memCacheMatKetNoiList = null;
     try { await del('sheet_matketnoi_v1'); } catch(e) {}
     if (typeof window !== 'undefined') {
       window.dispatchEvent(new CustomEvent('doxa_data_updated', { detail: { type: 'matketnoi', reset: true } }));
       window.dispatchEvent(new CustomEvent('workload_updated'));
     }
  },

  getChiTietMKN: (): any[] => {
     if (memCacheChiTietMKNList !== null) return memCacheChiTietMKNList;
     try {
       const cached = safeGetItem('sheet_chitietmkn_v1');
       if (cached) {
         memCacheChiTietMKNList = JSON.parse(cached);
         return memCacheChiTietMKNList || [];
       }
       return [];
     } catch { return []; }
  },

  setChiTietMKN: async (list: any[]): Promise<void> => {
     // 1. XÓA SẠCH DỮ LIỆU CŨ HOÀN TOÀN
     memCacheChiTietMKNList = [];
     safeRemoveItem('sheet_chitietmkn_v1');
     try { await del('sheet_chitietmkn_v1'); } catch(e) {}

     // 2. ĐƯA DỮ LIỆU MỚI VÀO
     memCacheChiTietMKNList = Array.isArray(list) ? [...list] : [];
     safeSetItem('custom_chitietmkn_uploaded_v1', 'true');
     try {
       safeSetItem('sheet_chitietmkn_v1', JSON.stringify(memCacheChiTietMKNList));
     } catch(e) {
       console.warn('localStorage full for ChiTietMKN', e);
     }
     try {
       await set('sheet_chitietmkn_v1', memCacheChiTietMKNList);
     } catch(e) {
       console.warn('IDB save error for ChiTietMKN', e);
     }

     if (typeof window !== 'undefined') {
       window.dispatchEvent(new CustomEvent('doxa_data_updated', { detail: { type: 'chitietmkn', count: memCacheChiTietMKNList.length } }));
       window.dispatchEvent(new CustomEvent('workload_updated'));
     }
  },

  resetChiTietMKNToSheet: async (): Promise<void> => {
     safeRemoveItem('custom_chitietmkn_uploaded_v1');
     safeRemoveItem('sheet_chitietmkn_v1');
     memCacheChiTietMKNList = null;
     try { await del('sheet_chitietmkn_v1'); } catch(e) {}
     if (typeof window !== 'undefined') {
       window.dispatchEvent(new CustomEvent('doxa_data_updated', { detail: { type: 'chitietmkn', reset: true } }));
       window.dispatchEvent(new CustomEvent('workload_updated'));
     }
  },

  getKhuVuc: (): any[] => {
     if (memCacheKhuVucList !== null) return memCacheKhuVucList;
     try {
       const cached = safeGetItem('sheet_khuvuc_v1');
       if (cached) {
         memCacheKhuVucList = JSON.parse(cached);
         return memCacheKhuVucList || [];
       }
       return [];
     } catch { return []; }
  },

  setKhuVuc: async (list: any[]): Promise<void> => {
     // 1. XÓA SẠCH DỮ LIỆU CŨ HOÀN TOÀN
     memCacheKhuVucList = [];
     safeRemoveItem('sheet_khuvuc_v1');
     try { await del('sheet_khuvuc_v1'); } catch(e) {}

     // 2. ĐƯA DỮ LIỆU MỚI VÀO
     memCacheKhuVucList = Array.isArray(list) ? [...list] : [];
     safeSetItem('custom_khuvuc_uploaded_v1', 'true');
     try {
       safeSetItem('sheet_khuvuc_v1', JSON.stringify(memCacheKhuVucList));
     } catch(e) {
       console.warn('localStorage full for KhuVuc', e);
     }
     try {
       await set('sheet_khuvuc_v1', memCacheKhuVucList);
     } catch(e) {
       console.warn('IDB save error for KhuVuc', e);
     }

     if (typeof window !== 'undefined') {
       window.dispatchEvent(new CustomEvent('doxa_data_updated', { detail: { type: 'khuvuc', count: memCacheKhuVucList.length } }));
       window.dispatchEvent(new CustomEvent('workload_updated'));
     }
  },

  resetKhuVucToSheet: async (): Promise<void> => {
     safeRemoveItem('custom_khuvuc_uploaded_v1');
     safeRemoveItem('sheet_khuvuc_v1');
     memCacheKhuVucList = null;
     try { await del('sheet_khuvuc_v1'); } catch(e) {}
     if (typeof window !== 'undefined') {
       window.dispatchEvent(new CustomEvent('doxa_data_updated', { detail: { type: 'khuvuc', reset: true } }));
       window.dispatchEvent(new CustomEvent('workload_updated'));
     }
  },

  fetchMatKetNoiFromSheet: async (sheetId?: string, force?: boolean): Promise<any[]> => {
    const isCustomMdis = safeGetItem('custom_matketnoi_uploaded_v1') === 'true';
    if (!force && isCustomMdis && memCacheMatKetNoiList && memCacheMatKetNoiList.length > 0) {
      return memCacheMatKetNoiList;
    }
    const sId = sheetId || DataStore.getSpreadsheetId() || DEFAULT_SPREADSHEET_ID;
    try {
      const mknText = await DataStore.fetchSheetCSV("MatKetNoi", sId);
      if (mknText && !mknText.includes('<html') && mknText.length > 50) {
        const { data, meta } = Papa.parse(mknText, { header: true, skipEmptyLines: true });
        const keys = meta.fields || [];
        const normalizeCol = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[\s_]+/g, '');
        const docKey = keys.find(k => normalizeCol(k).includes('madiemdo') || normalizeCol(k).includes('maddo'));
        const actualKey = docKey || keys[0];
        if (actualKey) {
          const matKetNoiList = (data as any[]).map((row: any) => {
            const newRow: any = { maDiemDo: String(row[actualKey] || '').trim() };
            for (const k of keys) {
              const normK = normalizeCol(k);
              if (!normK.includes('diachidiemdo') && !normK.includes('soserialcmis') && !normK.includes('tinhtrangketnoi')) {
                newRow[k] = row[k];
              }
            }
            return newRow;
          }).filter((r: any) => r.maDiemDo);
          memCacheMatKetNoiList = matKetNoiList;
          try { safeSetItem('sheet_matketnoi_v1', JSON.stringify(matKetNoiList)); } catch(e) {}
          try { await set('sheet_matketnoi_v1', matKetNoiList); } catch(e) {}
          return matKetNoiList;
        }
      }
    } catch (e) {
      console.warn('Could not fetch MatKetNoi:', e);
    }
    return DataStore.getMatKetNoi();
  },

  fetchChiTietMKNFromSheet: async (sheetId?: string, force?: boolean): Promise<any[]> => {
    const isCustomHes = safeGetItem('custom_chitietmkn_uploaded_v1') === 'true';
    if (!force && isCustomHes && memCacheChiTietMKNList && memCacheChiTietMKNList.length > 0) {
      return memCacheChiTietMKNList;
    }
    const sId = sheetId || DataStore.getSpreadsheetId() || DEFAULT_SPREADSHEET_ID;
    try {
      const chiTietText = await DataStore.fetchSheetCSV("ChiTietMKN", sId);
      if (chiTietText && !chiTietText.includes('<html') && chiTietText.length > 50) {
        const { data } = Papa.parse(chiTietText, { header: true, skipEmptyLines: true });
        if (data && data.length > 0) {
          memCacheChiTietMKNList = data as any[];
          try { safeSetItem('sheet_chitietmkn_v1', JSON.stringify(data)); } catch(e) {}
          try { await set('sheet_chitietmkn_v1', data); } catch(e) {}
          return data as any[];
        }
      }
    } catch (e) {
      console.warn('Could not fetch ChiTietMKN:', e);
    }
    return DataStore.getChiTietMKN();
  },

  fetchKhuVucFromSheet: async (sheetId?: string, force?: boolean): Promise<any[]> => {
    const isCustomKhuVuc = safeGetItem('custom_khuvuc_uploaded_v1') === 'true';
    if (!force && isCustomKhuVuc && memCacheKhuVucList && memCacheKhuVucList.length > 0) {
      return memCacheKhuVucList;
    }
    const sId = sheetId || DataStore.getSpreadsheetId() || DEFAULT_SPREADSHEET_ID;
    try {
      const kvText = await DataStore.fetchSheetCSV("KhuVuc", sId);
      if (kvText && !kvText.includes('<html') && kvText.length > 50) {
        const { data, meta } = Papa.parse(kvText, { header: true, skipEmptyLines: true });
        const keys = meta.fields || [];
        const normalizeCol = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[\s_]+/g, '');
        const kMaDdo = keys.find(k => {
          const nk = normalizeCol(k);
          return nk.includes('maddo') || nk.includes('madiemdo');
        });
        const kTql = keys.find(k => {
          const nk = normalizeCol(k);
          return nk.includes('khuvuc') || nk.includes('toql') || nk.includes('to') || nk.includes('to');
        });
        const actualMaDdo = kMaDdo || keys[0];
        const actualTql = kTql || keys[1];
        if (actualMaDdo) {
          const khuVucList = (data as any[]).map((row: any) => ({
            ...row,
            MA_DDO: String(row[actualMaDdo] || '').trim(),
            TO_QL: String(row[actualTql] || '').trim() || 'Khác',
          })).filter(r => r.MA_DDO);
          memCacheKhuVucList = khuVucList;
          try { safeSetItem('sheet_khuvuc_v1', JSON.stringify(khuVucList)); } catch(e) {}
          try { await set('sheet_khuvuc_v1', khuVucList); } catch(e) {}
          return khuVucList;
        }
      }
    } catch(e) {
      console.warn('Could not fetch KhuVuc:', e);
    }
    return DataStore.getKhuVuc();
  },

  syncDoxaData: async (force?: boolean): Promise<{ success: boolean; fromCache: boolean }> => {
    // 1. Kiểm tra cache nếu không ép buộc tải lại
    if (!force) {
      const kv = DataStore.getKhuVuc();
      const mkn = DataStore.getMatKetNoi();
      const ctmkn = DataStore.getChiTietMKN();
      if (kv.length > 0 && (mkn.length > 0 || ctmkn.length > 0)) {
        return { success: true, fromCache: true };
      }
    }

    // 2. Tải SONG SONG 3 sheet chỉ phục vụ cho Đo xa (thay vì tải tuần tự toàn bộ 17 sheet)
    const sId = DataStore.getSpreadsheetId() || DEFAULT_SPREADSHEET_ID;
    try {
      await Promise.all([
        DataStore.fetchMatKetNoiFromSheet(sId, force),
        DataStore.fetchChiTietMKNFromSheet(sId, force),
        DataStore.fetchKhuVucFromSheet(sId, force)
      ]);
      return { success: true, fromCache: false };
    } catch (e) {
      console.warn('Error in syncDoxaData:', e);
      return { success: false, fromCache: false };
    }
  },

  getSangTai: (): any[] => {
     if (memCacheSangTaiList) return memCacheSangTaiList;
     try {
       const cached = safeGetItem('sheet_sangtai_v1');
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
  },

  getKho: (): any[] => {
     if (memCacheKhoList) return memCacheKhoList;
     try {
       const cached = safeGetItem('sheet_kho_v1');
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
  },

  getVTTB: (): any[] => {
     if (memCacheVTTBList) return memCacheVTTBList;
     try {
       const cached = safeGetItem('sheet_vttb_v1');
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
  },

  getDinhMuc: (): DinhMucItem[] => {
     try {
       const cached = safeGetItem(DINHMUC_KEY);
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
  },

  setDinhMuc: (list: DinhMucItem[]): void => {
     safeSetItem(DINHMUC_KEY, JSON.stringify(list));
     try {
       window.dispatchEvent(new CustomEvent('workload_updated'));
     } catch {}
  },

  addDinhMuc: (item: Partial<DinhMucItem>): boolean => {
     if (!item.name || !item.name.trim()) return false;
     const current = DataStore.getDinhMuc();
     const stt = item.stt !== undefined && String(item.stt).trim() !== '' ? String(item.stt).trim() : String(current.length + 1);
     const newItem: DinhMucItem = {
       id: item.id || `dm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
       stt,
       name: item.name.trim(),
       quota: typeof item.quota === 'number' && !isNaN(item.quota) ? Math.max(0, item.quota) : 0,
       isGroup: !!item.isGroup,
       relation: (item.relation || '').trim(),
       history: item.history || {},
       custom: true
     };
     current.push(newItem);
     DataStore.setDinhMuc(current);
     return true;
  },

  updateDinhMuc: (targetKey: string, updated: Partial<DinhMucItem>): boolean => {
     const current = DataStore.getDinhMuc();
     const idx = current.findIndex(d => (d.id && d.id === targetKey) || d.name === targetKey);
     if (idx === -1) return false;
     
     const existing = current[idx];
     current[idx] = {
       ...existing,
       ...updated,
       name: updated.name !== undefined ? updated.name.trim() : existing.name,
       quota: updated.quota !== undefined ? (typeof updated.quota === 'number' && !isNaN(updated.quota) ? Math.max(0, updated.quota) : 0) : existing.quota,
       isGroup: updated.isGroup !== undefined ? !!updated.isGroup : existing.isGroup,
       relation: updated.relation !== undefined ? updated.relation.trim() : existing.relation,
       stt: updated.stt !== undefined ? updated.stt : existing.stt,
       custom: true
     };
     DataStore.setDinhMuc(current);
     return true;
  },

  deleteDinhMuc: (targetKey: string): boolean => {
     const current = DataStore.getDinhMuc();
     const filtered = current.filter(d => (d.id && d.id !== targetKey) && d.name !== targetKey);
     if (filtered.length === current.length) return false;
     DataStore.setDinhMuc(filtered);
     return true;
  },

  reloadDinhMucFromSheet: async (customSheetId?: string): Promise<{ success: boolean; count: number; error?: string }> => {
     try {
       const sheetId = customSheetId || DataStore.getSpreadsheetId() || "1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ";
       const dmSheets = ['Định mức', 'Định Mức', 'Dinh muc', 'DinhMuc'];
       let foundData: DinhMucItem[] = [];
       
       for (const sheetName of dmSheets) {
         const dmText = await DataStore.fetchSheetCSV(sheetName, sheetId);
         if (dmText && !dmText.includes('<html') && dmText.trim() && dmText.length > 50) {
           const { data } = Papa.parse(dmText, { header: false });
           if (data && data.length > 0) {
             let headRow = -1;
             let sttCol = -1, nameCol = -1, quotaCol = -1, groupCol = -1, relationCol = -1;
             const historyCols: Record<string, number> = {};
             
             for (let r = 0; r < Math.min(data.length, 5); r++) {
               if (!data[r]) continue;
               const rowData = data[r] as string[];
               for (let c = 0; c < rowData.length; c++) {
                 const val = String(rowData[c] || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
                 if (val.includes('stt') || (r === 0 && c === 0 && val.includes('stt'))) sttCol = c;
                 if (val.includes('noi dung') || val.includes('ten') || val.includes('danh muc')) nameCol = c;
                 if (val.includes('dinh muc') || val.includes('quota') || val.includes('diem') || val.includes('khoi luong') || val.includes('chi tieu')) quotaCol = c;
                 if (val.includes('chung nhom')) {
                     groupCol = c;
                 } else if (groupCol === -1 && (val === 'nhom' || val.includes('chung'))) {
                     groupCol = c;
                 }
                 if (val.includes('quan he')) relationCol = c;
                 if (val.includes('thang') || /\d+\/\d{4}/.test(val)) historyCols[String(rowData[c]).trim()] = c;
               }
               if (nameCol !== -1) {
                 headRow = r;
                 break;
               }
             }
             
             if (headRow !== -1 && nameCol !== -1) {
               const newDinhMuc: DinhMucItem[] = [];
               for (let i = headRow + 1; i < data.length; i++) {
                 const row = data[i] as string[];
                 if (!row || row.length <= nameCol) continue;
                 
                 const val1 = String(row[nameCol] || '').trim();
                 if (!val1 || val1.toLowerCase() === 'stt' || val1.toLowerCase() === 'tong' || val1.toLowerCase() === 'tổng') continue;
                 
                 const stt = sttCol !== -1 && row[sttCol] ? String(row[sttCol]).trim() : String(newDinhMuc.length + 1);
                 let quotaStr = quotaCol !== -1 ? String(row[quotaCol] || '0').replace(/,/g, '.') : '0';
                 let val2 = parseFloat(quotaStr);
                 if (isNaN(val2)) val2 = 0;
                 
                 let isGroupStr = groupCol !== -1 ? String(row[groupCol] || '').toLowerCase().trim() : '';
                 let isGroup = isGroupStr === 'x';
                 let relation = relationCol !== -1 ? String(row[relationCol] || '').trim() : '';
                 
                 let history: Record<string, number> = {};
                 Object.keys(historyCols).forEach(k => {
                   let colIdx = historyCols[k];
                   if (colIdx !== undefined && row.length > colIdx) {
                     let hVal = parseFloat(String(row[colIdx] || '0').replace(/,/g, '.'));
                     if (!isNaN(hVal)) history[k] = hVal;
                   }
                 });
                 
                 newDinhMuc.push({
                   id: `dm-${stt}-${newDinhMuc.length + 1}`,
                   stt,
                   name: val1,
                   quota: val2,
                   isGroup,
                   relation,
                   history
                 });
               }
               
               if (newDinhMuc.length > 0) {
                 foundData = newDinhMuc;
                 break;
               }
             }
           }
         }
       }
       
       if (foundData.length > 0) {
         DataStore.setDinhMuc(foundData);
         return { success: true, count: foundData.length };
       } else {
         return { success: false, count: 0, error: 'Không tìm thấy sheet "Định mức" hoặc dữ liệu rỗng.' };
       }
     } catch (e: any) {
       return { success: false, count: 0, error: e?.message || 'Lỗi khi tải dữ liệu Định mức' };
     }
  },

  getTasks: (): TaskProgress[] => {
     try {
       const cached = safeGetItem(PROGRESS_KEY);
       const remoteTasks: TaskProgress[] = cached ? JSON.parse(cached) : [];
       
       const localCached = safeGetItem(LOCAL_PROGRESS_UPDATES_KEY);
       let localTasks: TaskProgress[] = localCached ? JSON.parse(localCached) : [];
       
       const remoteMap = new Map();
       const hashToId = new Map();
       
       remoteTasks.forEach(t => {
           remoteMap.set(t.id, t);
           const hash = `${t.content}-${t.assignee}-${t.deadline}`.replace(/\s/g, '').toLowerCase();
           hashToId.set(hash, t.id);
       });
       
       // Filter out local-only tasks that already exist in remote data
       localTasks = localTasks.filter(lt => {
           if (!lt.id.startsWith('local-')) return true;
           const hash = `${lt.content}-${lt.assignee}-${lt.deadline}`.replace(/\s/g, '').toLowerCase();
           return !hashToId.has(hash);
       });
       
       // Merge remaining local tasks (updates to existing tasks, or truly new local tasks)
       localTasks.forEach(lt => {
           const hash = `${lt.content}-${lt.assignee}-${lt.deadline}`.replace(/\s/g, '').toLowerCase();
           
           let matchedId = null;
           if (remoteMap.has(lt.id)) {
               matchedId = lt.id;
           } else if (hashToId.has(hash)) {
               matchedId = hashToId.get(hash);
           } else {
               // Fallback: try to match by content alone if it's unique
               const sameContentTasks = Array.from(remoteMap.values()).filter(rt => rt.content === lt.content);
               if (sameContentTasks.length === 1) {
                   matchedId = sameContentTasks[0].id;
               }
           }
           
           if (matchedId) {
               // Merge only updatable fields into the existing remote task
               const remoteTask = remoteMap.get(matchedId);
               if (remoteTask) {
                  remoteMap.set(matchedId, { 
                      ...remoteTask,
                      status: lt.status !== undefined ? lt.status : remoteTask.status,
                      explanation: lt.explanation !== undefined ? lt.explanation : remoteTask.explanation,
                      isLocal: true,
                      timestamp: lt.timestamp || remoteTask.timestamp
                  });
               }
           } else {
               if (lt.id.startsWith('local-')) {
                   remoteMap.set(lt.id, lt);
               }
               // Otherwise discard updates to unknown/deleted remote tasks
           }
       });
       
       return Array.from(remoteMap.values());
     } catch { return []; }
  },

  addTask: (task: Omit<TaskProgress, 'id'>) => {
     const localCached = safeGetItem(LOCAL_PROGRESS_UPDATES_KEY);
     const localTasks: TaskProgress[] = localCached ? JSON.parse(localCached) : [];
     const newTask: TaskProgress = {
        ...task,
        id: 'local-' + Date.now() + Math.random().toString(36).substring(7),
        isLocal: true,
        timestamp: Date.now()
     };
     localTasks.push(newTask);
     safeSetItem(LOCAL_PROGRESS_UPDATES_KEY, JSON.stringify(localTasks));
     DataStore.syncProgressToSheet({...newTask, id: ''});
     return newTask;
  },

  updateTaskStatus: (id: string, status: string) => {
     const allTasks = DataStore.getTasks();
     const task = allTasks.find(t => t.id === id);
     if (!task) return null;
     
     const updatedTask = { ...task, status, isLocal: true, timestamp: Date.now() };
     
     const localCached = safeGetItem(LOCAL_PROGRESS_UPDATES_KEY);
     const localTasks: TaskProgress[] = localCached ? JSON.parse(localCached) : [];
     
     const existingIndex = localTasks.findIndex(t => t.id === id);
     if (existingIndex >= 0) {
        localTasks[existingIndex] = updatedTask;
     } else {
        localTasks.push(updatedTask);
     }
     safeSetItem(LOCAL_PROGRESS_UPDATES_KEY, JSON.stringify(localTasks));
     DataStore.syncProgressToSheet(updatedTask);
     return updatedTask;
  },

  updateTaskExplanation: (id: string, newExplanation: string, updaterName: string) => {
     const allTasks = DataStore.getTasks();
     const task = allTasks.find(t => t.id === id);
     if (!task) return null;
     
     const today = new Date();
     const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth()+1).toString().padStart(2, '0')}/${today.getFullYear()}`;
     
     // Build the string: "(stt)(nội dung giải trình)(tên người cập nhật)(ngày)"
     // First, determine STT by counting existing rows
     let currentExplanations = task.explanation ? task.explanation.trim() : '';
     let lines = currentExplanations ? currentExplanations.split('\n') : [];
     let stt = lines.length + 1;
     let lineText = `(${stt})(${newExplanation})(${updaterName || 'Unknown'})(${dateStr})`;
     
     let updatedExplanation = currentExplanations ? currentExplanations + '\n' + lineText : lineText;
     
     const updatedTask = { ...task, explanation: updatedExplanation, isLocal: true, timestamp: Date.now() };
     
     const localCached = safeGetItem(LOCAL_PROGRESS_UPDATES_KEY);
     const localTasks: TaskProgress[] = localCached ? JSON.parse(localCached) : [];
     
     const existingIndex = localTasks.findIndex(t => t.id === id);
     if (existingIndex >= 0) {
        localTasks[existingIndex] = updatedTask;
     } else {
        localTasks.push(updatedTask);
     }
     safeSetItem(LOCAL_PROGRESS_UPDATES_KEY, JSON.stringify(localTasks));
     DataStore.syncProgressToSheet(updatedTask);
     return updatedTask;
  },

  changePasswordToSheet: async (name: string, newPass: string) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'change_password', sheetName: 'CongTac', data: { name, newPass } }),
      });
      
      const rawText = await response.text();
      let result;
      try {
        result = JSON.parse(rawText);
      } catch (parseError) {
        console.error("Non-JSON response from GS:", rawText);
        return false;
      }
      
      if (result && result.status === 'success') {
         // Cập nhật lại MSNV trong local storage
         try {
           const cached = safeGetItem('sheet_members_v1');
           if (cached) {
             const members = JSON.parse(cached);
             const updated = members.map((m: any) => {
               if (m.name === name) {
                 return { ...m, msnv: newPass };
               }
               return m;
             });
             safeSetItem('sheet_members_v1', JSON.stringify(updated));
           }
         } catch (e) {
           console.error('Update local member failed', e);
         }
         return true;
      }
      return false;
    } catch (error) {
      console.error('Lỗi cập nhật mật khẩu:', error);
      return false;
    }
  },

  syncTutiToSheet: async (entry: TutiEntry) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) return false;
      
      const prepareString = (str: string) => {
          if (!str) return '';
          // Nếu có dạng x/y (như 10/5) Google Sheets tự convert thành Ngày. Nên thêm dấu nháy đơn.
          if (/^\d+\s*\/\s*\d+/.test(str)) {
              return `'${str}`;
          }
          return str;
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ 
           action: 'update_tuti', 
           data: {
             maTram: entry.maTram,
             tenDiemDo: entry.tenDiemDo,
             thongSoTU: prepareString(entry.thongSoTU || ''),
             thongSoTI: prepareString(entry.thongSoTI || ''),
             kiemTraTU: prepareString(entry.kiemTraTU || ''),
             kiemTraTI: prepareString(entry.kiemTraTI || ''),
             khac: prepareString(entry.khac || ''),
             ketLuan: entry.ketLuan || '',
             ngayCapNhat: prepareString(entry.ngayCapNhat || ''),
             ngayDuaLen: prepareString(entry.ngayDuaLen || ''),
             nguoiDuaLen: entry.nguoiDuaLen || '',
             nguoiKiemTra: entry.nguoiKiemTra || ''
           } 
        }),
      });
      const result = await response.json();
      return result.status === 'success';
    } catch (error: any) {
      console.warn('Error syncing TUTI to sheet:', error.message || error);
      return false;
    }
  },

  syncSangTaiToSheet: async (maDiemDo: string, maMoi: string) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
           action: 'update_sangtai', 
           data: {
             maDiemDo,
             maMoi
           }
        }),
      });
      const result = await response.json();
      return result.status === 'success';
    } catch (error: any) {
      console.warn('Error syncing SangTai to sheet:', error.message || error);
      return false;
    }
  },

  syncSangTaiBulkToSheet: async (updates: {maDiemDo: string, maMoi: string}[]) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
           action: 'update_sangtai_bulk', 
           data: updates
        }),
      });
      const result = await response.json();
      return result.status === 'success';
    } catch (error: any) {
      console.warn('Error syncing SangTai bulk to sheet:', error.message || error);
      return false;
    }
  },


  addTutiEntry: async (entry: TutiEntry) => {
     const entries = DataStore.getTutiEntries();
     entries.unshift(entry);
     safeSetItem(TUTI_KEY, JSON.stringify(entries));
     await DataStore.syncTutiToSheet(entry);
     return entry;
  },

  deleteTutiEntry: async (id: string) => {
     const entries = DataStore.getTutiEntries();
     const entry = entries.find(e => e.id === id);
     if (entry) {
         const newEntries = entries.filter(e => e.id !== id);
         safeSetItem(TUTI_KEY, JSON.stringify(newEntries));
         
         try {
             const url = DataStore.getAppScriptUrl();
             if (url) {
                 await fetch(url, {
                     method: 'POST',
                     headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                     body: JSON.stringify({ action: 'delete_tuti', data: { maTram: entry.maTram, tenDiemDo: entry.tenDiemDo } })
                 });
             }
         } catch(e) {}
     }
  },

  updateTutiEntry: async (id: string, updates: Partial<TutiEntry>) => {
     const entries = DataStore.getTutiEntries();
     let index = entries.findIndex(e => e.id === id);
     if (index === -1 && updates.maTram && updates.tenDiemDo) {
         index = entries.findIndex(e => 
             String(e.maTram).trim().toLowerCase() === String(updates.maTram).trim().toLowerCase() &&
             String(e.tenDiemDo).trim().toLowerCase() === String(updates.tenDiemDo).trim().toLowerCase()
         );
     }
     if (index !== -1) {
         entries[index] = { ...entries[index], ...updates };
         safeSetItem(TUTI_KEY, JSON.stringify(entries));
         await DataStore.syncTutiToSheet(entries[index]);
         return entries[index];
     }
     return null;
  },

  getTutiEntries: (): TutiEntry[] => {
     try {
       const cached = safeGetItem(TUTI_KEY);
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
  },

  getLocalTutiUpdates: (): LocalTutiUpdate[] => {
     try {
       const cached = safeGetItem(LOCAL_TUTI_UPDATES_KEY);
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
  },

  getQuaHanEntries: (): QuaHanEntry[] => {
     if (memCacheQuaHanList && memCacheQuaHanList.length > 0) return memCacheQuaHanList;
     try {
       const cached = safeGetItem(QUAHAN_KEY);
       if (cached) {
         memCacheQuaHanList = JSON.parse(cached);
         return memCacheQuaHanList || [];
       }
     } catch (e) {}
     return [];
  },

  fetchQuaHanData: async (force?: boolean): Promise<QuaHanEntry[]> => {
     if (!force && memCacheQuaHanList && memCacheQuaHanList.length > 0) {
       return memCacheQuaHanList;
     }
     const sheetId = DataStore.getSpreadsheetId() || DEFAULT_SPREADSHEET_ID;
     try {
       const qhSheetNames = ['QuaHan', 'quahan', 'Quá hạn', 'Qua Han', 'Qua_Han'];
       let qhText = '';
       for (const sName of qhSheetNames) {
           const tempText = await DataStore.fetchSheetCSV(sName, sheetId);
           if (tempText && !tempText.includes('<html') && tempText.trim().length > 20) {
               qhText = tempText;
               break;
           }
       }
       if (qhText) {
           const parsedQh = DataStore.parseQuaHanCSVData(qhText);
           if (parsedQh && parsedQh.length > 0) {
               memCacheQuaHanList = parsedQh;
               safeSetItem(QUAHAN_KEY, JSON.stringify(parsedQh));
               try { await set(QUAHAN_KEY, parsedQh); } catch(err) {}
               return parsedQh;
           }
       }
     } catch (e) {
       console.warn('Could not fetch QuaHan sheet', e);
     }
     return DataStore.getQuaHanEntries();
  },

  parseQuaHanCSVData: (input: string | any[]): QuaHanEntry[] => {
    if (!input) return [];
    let rawRows: any[] = [];
    if (typeof input === 'string') {
      const { data } = Papa.parse(input, { header: true, skipEmptyLines: true });
      rawRows = data || [];
    } else if (Array.isArray(input)) {
      rawRows = input;
    }

    const getRegion = (sogcs?: string): string => {
      if (!sogcs || sogcs.length < 3) return "Khác";
      const char3 = sogcs[2].toUpperCase();
      if (char3 === "A") return "Vũng Tàu";
      if (char3 === "B") return "Bà Rịa";
      if (char3 === "D") return "Phú Mỹ";
      if (char3 === "N") return "Côn Đảo";
      return "Khác";
    };

    return rawRows.map((r: any) => {
      const maSogcs = String(r.MA_SOGCS || r.ma_sogcs || r['Mã sổ GCS'] || r['MA SOGCS'] || '').trim();
      return {
        MA_DVIQLY: String(r.MA_DVIQLY || r.ma_dviqly || '').trim(),
        MA_TBI: String(r.MA_TBI || r.ma_tbi || '').trim(),
        SO_TBI: String(r.SO_TBI || r.so_tbi || r['Số TBI'] || r['18083539'] || '').trim(),
        SO_HUU: String(r.SO_HUU || r.so_huu || '').trim(),
        MA_CLOAI: String(r.MA_CLOAI || r.ma_cloai || '').trim(),
        DONG_DIEN: String(r.DONG_DIEN || r.dong_dien || '').trim(),
        DIEN_AP: String(r.DIEN_AP || r.dien_ap || '').trim(),
        SO_PHA: String(r.SO_PHA || r.so_pha || '').trim(),
        NGAY_KDINH: String(r.NGAY_KDINH || r.ngay_kdinh || '').trim(),
        HAN_KDINH: String(r.HAN_KDINH || r.han_kdinh || '').trim(),
        LUU_KHO: String(r.LUU_KHO || r.luu_kho || '').trim(),
        MA_DDO: String(r.MA_DDO || r.ma_ddo || '').trim(),
        MA_KHANG: String(r.MA_KHANG || r.ma_khang || '').trim(),
        VH_CONG: String(r.VH_CONG || r.vh_cong || '').trim(),
        HSN: String(r.HSN || r.hsn || '').trim(),
        NGAY_TTHAO: String(r.NGAY_TTHAO || r.ngay_tthao || '').trim(),
        TEN_TCHI: String(r.TEN_TCHI || r.ten_tchi || '').trim(),
        MA_TCHI: String(r.MA_TCHI || r.ma_tchi || '').trim(),
        MA_KVUC: String(r.MA_KVUC || r.ma_kvuc || '').trim(),
        STT: String(r.STT || r.stt || '').trim(),
        TEN_KHANG: String(r.TEN_KHANG || r.ten_khang || '').trim(),
        DCHI_DDO: String(r.DCHI_DDO || r.dchi_ddo || '').trim(),
        DCHI_KHANG: String(r.DCHI_KHANG || r.dchi_khang || '').trim(),
        SO_COT: String(r.SO_COT || r.so_cot || '').trim(),
        SO_HOP: String(r.SO_HOP || r.so_hop || '').trim(),
        MA_SOGCS: maSogcs,
        MA_TRAM: String(r.MA_TRAM || r.ma_tram || '').trim(),
        DTHOAI: String(r.DTHOAI || r.dthoai || '').trim(),
        HOP_BO: String(r.HOP_BO || r.hop_bo || '').trim(),
        CHUOI_GIA: String(r.CHUOI_GIA || r.chuoi_gia || '').trim(),
        LOAI_TT_GT: String(r.LOAI_TT_GT || r.loai_tt_gt || '').trim(),
        TSO_TI: String(r.TSO_TI || r.tso_ti || '').trim(),
        TSO_TU: String(r.TSO_TU || r.tso_tu || '').trim(),
        DIEN_AP_TI: String(r.DIEN_AP_TI || r.dien_ap_ti || '').trim(),
        khuVuc: getRegion(maSogcs)
      };
    });
  },

  getTuSheetEntries: (): TuSheetEntry[] => {
     if (memCacheTuSheetList && memCacheTuSheetList.length > 0) return memCacheTuSheetList;
     try {
       const cached = safeGetItem(TU_SHEET_KEY);
       if (cached) {
         memCacheTuSheetList = JSON.parse(cached);
         return memCacheTuSheetList || [];
       }
     } catch (e) {}
     return [];
  },

  fetchTuSheetData: async (force?: boolean): Promise<TuSheetEntry[]> => {
     if (!force && memCacheTuSheetList && memCacheTuSheetList.length > 0) {
       return memCacheTuSheetList;
     }
     const sheetId = DataStore.getSpreadsheetId() || DEFAULT_SPREADSHEET_ID;
     try {
       const tuSheetNames = ['TU', 'tu', 'Sheet_TU', 'SheetTU'];
       let tuText = '';
       for (const sName of tuSheetNames) {
           const tempText = await DataStore.fetchSheetCSV(sName, sheetId);
           if (tempText && !tempText.includes('<html') && tempText.trim().length > 20) {
               tuText = tempText;
               break;
           }
       }
       if (tuText) {
           const parsedTu = DataStore.parseTuCSVData(tuText);
           if (parsedTu && parsedTu.length > 0) {
               memCacheTuSheetList = parsedTu;
               safeSetItem(TU_SHEET_KEY, JSON.stringify(parsedTu));
               try { await set(TU_SHEET_KEY, parsedTu); } catch(err) {}
               return parsedTu;
           }
       }
     } catch (e) {
       console.warn('Could not fetch TU sheet', e);
     }
     return DataStore.getTuSheetEntries();
  },

  parseTuCSVData: (input: string | any[]): TuSheetEntry[] => {
    if (!input) return [];
    let rawRows: any[] = [];
    if (typeof input === 'string') {
      const { data } = Papa.parse(input, { header: true, skipEmptyLines: true });
      rawRows = data || [];
    } else if (Array.isArray(input)) {
      rawRows = input;
    }

    const getRegion = (sogcs?: string): string => {
      if (!sogcs || sogcs.length < 3) return "Khác";
      const char3 = sogcs[2].toUpperCase();
      if (char3 === "A") return "Vũng Tàu";
      if (char3 === "B") return "Bà Rịa";
      if (char3 === "D") return "Phú Mỹ";
      if (char3 === "N") return "Côn Đảo";
      return "Khác";
    };

    return rawRows.map((r: any) => {
      const maSogcs = String(r.MA_SOGCS || r.ma_sogcs || '').trim();
      return {
        MA_DVIQLY: String(r.MA_DVIQLY || r.ma_dviqly || '').trim(),
        MA_TBI: String(r.MA_TBI || r.ma_tbi || '').trim(),
        SO_TBI: String(r.SO_TBI || r.so_tbi || '').trim(),
        SO_HUU: String(r.SO_HUU || r.so_huu || '').trim(),
        MA_CLOAI: String(r.MA_CLOAI || r.ma_cloai || '').trim(),
        DIEN_AP: String(r.DIEN_AP || r.dien_ap || '').trim(),
        CAP_CXAC: String(r.CAP_CXAC || r.cap_cxac || '').trim(),
        SO_PHA: String(r.SO_PHA || r.so_pha || '').trim(),
        TYSO_DAU: String(r.TYSO_DAU || r.tyso_dau || '').trim(),
        NGAY_KDINH: String(r.NGAY_KDINH || r.ngay_kdinh || '').trim(),
        HAN_KDINH: String(r.HAN_KDINH || r.han_kdinh || '').trim(),
        LUU_KHO: String(r.LUU_KHO || r.luu_kho || '').trim(),
        MA_DDO: String(r.MA_DDO || r.ma_ddo || '').trim(),
        MA_KHANG: String(r.MA_KHANG || r.ma_khang || '').trim(),
        HSN: String(r.HSN || r.hsn || '').trim(),
        NGAY_TTHAO: String(r.NGAY_TTHAO || r.ngay_tthao || '').trim(),
        MA_TCHI: String(r.MA_TCHI || r.ma_tchi || '').trim(),
        MA_KVUC: String(r.MA_KVUC || r.ma_kvuc || '').trim(),
        STT: String(r.STT || r.stt || '').trim(),
        TEN_KHANG: String(r.TEN_KHANG || r.ten_khang || '').trim(),
        DCHI_DDO: String(r.DCHI_DDO || r.dchi_ddo || '').trim(),
        DCHI_KHANG: String(r.DCHI_KHANG || r.dchi_khang || '').trim(),
        MA_SOGCS: maSogcs,
        DTHOAI: String(r.DTHOAI || r.dthoai || '').trim(),
        HOP_BO: String(r.HOP_BO || r.hop_bo || '').trim(),
        CHUOI_GIA: String(r.CHUOI_GIA || r.chuoi_gia || '').trim(),
        khuVuc: getRegion(maSogcs)
      };
    });
  },

  getTiSheetEntries: (): TiSheetEntry[] => {
     if (memCacheTiSheetList && memCacheTiSheetList.length > 0) return memCacheTiSheetList;
     try {
       const cached = safeGetItem(TI_SHEET_KEY);
       if (cached) {
         memCacheTiSheetList = JSON.parse(cached);
         return memCacheTiSheetList || [];
       }
     } catch (e) {}
     return [];
  },

  fetchTiSheetData: async (force?: boolean): Promise<TiSheetEntry[]> => {
     if (!force && memCacheTiSheetList && memCacheTiSheetList.length > 0) {
       return memCacheTiSheetList;
     }
     const sheetId = DataStore.getSpreadsheetId() || DEFAULT_SPREADSHEET_ID;
     try {
       const tiSheetNames = ['TI', 'ti', 'Sheet_TI', 'SheetTI'];
       let tiText = '';
       for (const sName of tiSheetNames) {
           const tempText = await DataStore.fetchSheetCSV(sName, sheetId);
           if (tempText && !tempText.includes('<html') && tempText.trim().length > 20) {
               tiText = tempText;
               break;
           }
       }
       if (tiText) {
           const parsedTi = DataStore.parseTiCSVData(tiText);
           if (parsedTi && parsedTi.length > 0) {
               memCacheTiSheetList = parsedTi;
               safeSetItem(TI_SHEET_KEY, JSON.stringify(parsedTi));
               try { await set(TI_SHEET_KEY, parsedTi); } catch(err) {}
               return parsedTi;
           }
       }
     } catch (e) {
       console.warn('Could not fetch TI sheet', e);
     }
     return DataStore.getTiSheetEntries();
  },

  parseTiCSVData: (input: string | any[]): TiSheetEntry[] => {
    if (!input) return [];
    let rawRows: any[] = [];
    if (typeof input === 'string') {
      const { data } = Papa.parse(input, { header: true, skipEmptyLines: true });
      rawRows = data || [];
    } else if (Array.isArray(input)) {
      rawRows = input;
    }

    const getRegion = (sogcs?: string): string => {
      if (!sogcs || sogcs.length < 3) return "Khác";
      const char3 = sogcs[2].toUpperCase();
      if (char3 === "A") return "Vũng Tàu";
      if (char3 === "B") return "Bà Rịa";
      if (char3 === "D") return "Phú Mỹ";
      if (char3 === "N") return "Côn Đảo";
      return "Khác";
    };

    return rawRows.map((r: any) => {
      const maSogcs = String(r.MA_SOGCS || r.ma_sogcs || '').trim();
      return {
        MA_DVIQLY: String(r.MA_DVIQLY || r.ma_dviqly || '').trim(),
        MA_TBI: String(r.MA_TBI || r.ma_tbi || '').trim(),
        SO_TBI: String(r.SO_TBI || r.so_tbi || '').trim(),
        SO_HUU: String(r.SO_HUU || r.so_huu || '').trim(),
        MA_CLOAI: String(r.MA_CLOAI || r.ma_cloai || '').trim(),
        DIEN_AP: String(r.DIEN_AP || r.dien_ap || '').trim(),
        CAP_CXAC: String(r.CAP_CXAC || r.cap_cxac || '').trim(),
        SO_PHA: String(r.SO_PHA || r.so_pha || '').trim(),
        TYSO_DAU: String(r.TYSO_DAU || r.tyso_dau || '').trim(),
        NGAY_KDINH: String(r.NGAY_KDINH || r.ngay_kdinh || '').trim(),
        HAN_KDINH: String(r.HAN_KDINH || r.han_kdinh || '').trim(),
        LUU_KHO: String(r.LUU_KHO || r.luu_kho || '').trim(),
        MA_DDO: String(r.MA_DDO || r.ma_ddo || '').trim(),
        MA_KHANG: String(r.MA_KHANG || r.ma_khang || '').trim(),
        HSN: String(r.HSN || r.hsn || '').trim(),
        NGAY_TTHAO: String(r.NGAY_TTHAO || r.ngay_tthao || '').trim(),
        MA_TCHI: String(r.MA_TCHI || r.ma_tchi || '').trim(),
        MA_KVUC: String(r.MA_KVUC || r.ma_kvuc || '').trim(),
        STT: String(r.STT || r.stt || '').trim(),
        TEN_KHANG: String(r.TEN_KHANG || r.ten_khang || '').trim(),
        DCHI_DDO: String(r.DCHI_DDO || r.dchi_ddo || '').trim(),
        DCHI_KHANG: String(r.DCHI_KHANG || r.dchi_khang || '').trim(),
        MA_SOGCS: maSogcs,
        DTHOAI: String(r.DTHOAI || r.dthoai || '').trim(),
        HOP_BO: String(r.HOP_BO || r.hop_bo || '').trim(),
        CHUOI_GIA: String(r.CHUOI_GIA || r.chuoi_gia || '').trim(),
        khuVuc: getRegion(maSogcs)
      };
    });
  },

  setQuaHanEntries: async (entries: QuaHanEntry[]): Promise<void> => {
     // 1. XÓA SẠCH DỮ LIỆU CŨ HOÀN TOÀN
     memCacheQuaHanList = [];
     safeRemoveItem(QUAHAN_KEY);
     try { await del(QUAHAN_KEY); } catch(e) {}

     // 2. ĐƯA DỮ LIỆU MỚI VÀO
     memCacheQuaHanList = [...entries];
     try {
       safeSetItem(QUAHAN_KEY, JSON.stringify(entries));
     } catch(e) {
       console.warn('localStorage full for QuaHan', e);
     }
     try {
       await set(QUAHAN_KEY, entries);
     } catch(e) {}
     window.dispatchEvent(new Event('workload_updated'));
     window.dispatchEvent(new Event('htdd_data_updated'));
  },

  getQuaHanNamEntries: (): QuaHanEntry[] => {
     if (memCacheQuaHanNamList && memCacheQuaHanNamList.length > 0) return memCacheQuaHanNamList;
     try {
       const cached = safeGetItem(QUAHAN_NAM_KEY);
       if (cached) {
         memCacheQuaHanNamList = JSON.parse(cached);
         return memCacheQuaHanNamList || [];
       }
     } catch (e) {}
     return [];
  },

  fetchQuaHanNamData: async (force?: boolean): Promise<QuaHanEntry[]> => {
     if (!force && memCacheQuaHanNamList && memCacheQuaHanNamList.length > 0) {
       return memCacheQuaHanNamList;
     }
     const sheetId = DataStore.getSpreadsheetId() || DEFAULT_SPREADSHEET_ID;
     try {
       const qhnNames = ['QuaHan_Nam', 'quahan_nam', 'QuaHanNam', 'Quá hạn năm', 'Qua_Han_Nam'];
       let qhnText = '';
       for (const sName of qhnNames) {
           const tempText = await DataStore.fetchSheetCSV(sName, sheetId);
           if (tempText && !tempText.includes('<html') && tempText.trim().length > 20) {
               qhnText = tempText;
               break;
           }
       }
       if (qhnText) {
           const parsedQhn = DataStore.parseQuaHanCSVData(qhnText);
           if (parsedQhn && parsedQhn.length > 0) {
               memCacheQuaHanNamList = parsedQhn;
               safeSetItem(QUAHAN_NAM_KEY, JSON.stringify(parsedQhn));
               try { await set(QUAHAN_NAM_KEY, parsedQhn); } catch(err) {}
               return parsedQhn;
           }
       }
     } catch (e) {
       console.warn('Could not fetch QuaHan_Nam sheet', e);
     }
     return DataStore.getQuaHanNamEntries();
  },

  setQuaHanNamEntries: async (entries: QuaHanEntry[]): Promise<void> => {
     // 1. XÓA SẠCH DỮ LIỆU CŨ HOÀN TOÀN
     memCacheQuaHanNamList = [];
     safeRemoveItem(QUAHAN_NAM_KEY);
     try { await del(QUAHAN_NAM_KEY); } catch(e) {}

     // 2. ĐƯA DỮ LIỆU MỚI VÀO
     memCacheQuaHanNamList = [...entries];
     try {
       safeSetItem(QUAHAN_NAM_KEY, JSON.stringify(entries));
     } catch(e) {
       console.warn('localStorage full for QuaHan_Nam', e);
     }
     try {
       await set(QUAHAN_NAM_KEY, entries);
     } catch(e) {}
     window.dispatchEvent(new Event('workload_updated'));
     window.dispatchEvent(new Event('htdd_data_updated'));
  },

  setTuSheetEntries: async (entries: TuSheetEntry[]): Promise<void> => {
     // 1. XÓA SẠCH DỮ LIỆU CŨ HOÀN TOÀN
     memCacheTuSheetList = [];
     safeRemoveItem(TU_SHEET_KEY);
     try { await del(TU_SHEET_KEY); } catch(e) {}

     // 2. ĐƯA DỮ LIỆU MỚI VÀO
     memCacheTuSheetList = [...entries];
     try {
       safeSetItem(TU_SHEET_KEY, JSON.stringify(entries));
     } catch(e) {}
     try {
       await set(TU_SHEET_KEY, entries);
     } catch(e) {}
     window.dispatchEvent(new Event('workload_updated'));
     window.dispatchEvent(new Event('htdd_data_updated'));
  },

  getTuNamEntries: (): TuSheetEntry[] => {
     if (memCacheTuNamList && memCacheTuNamList.length > 0) return memCacheTuNamList;
     try {
       const cached = safeGetItem(TU_NAM_KEY);
       if (cached) {
         memCacheTuNamList = JSON.parse(cached);
         return memCacheTuNamList || [];
       }
     } catch (e) {}
     return [];
  },

  fetchTuNamData: async (force?: boolean): Promise<TuSheetEntry[]> => {
     if (!force && memCacheTuNamList && memCacheTuNamList.length > 0) {
       return memCacheTuNamList;
     }
     const sheetId = DataStore.getSpreadsheetId() || DEFAULT_SPREADSHEET_ID;
     try {
       const tuNamNames = ['TU_Nam', 'tu_nam', 'TUNam', 'TU Nam', 'TU_nam'];
       let tunText = '';
       for (const sName of tuNamNames) {
           const tempText = await DataStore.fetchSheetCSV(sName, sheetId);
           if (tempText && !tempText.includes('<html') && tempText.trim().length > 20) {
               tunText = tempText;
               break;
           }
       }
       if (tunText) {
           const parsedTun = DataStore.parseTuCSVData(tunText);
           if (parsedTun && parsedTun.length > 0) {
               memCacheTuNamList = parsedTun;
               safeSetItem(TU_NAM_KEY, JSON.stringify(parsedTun));
               try { await set(TU_NAM_KEY, parsedTun); } catch(err) {}
               return parsedTun;
           }
       }
     } catch (e) {
       console.warn('Could not fetch TU_Nam sheet', e);
     }
     return DataStore.getTuNamEntries();
  },

  setTuNamEntries: async (entries: TuSheetEntry[]): Promise<void> => {
     // 1. XÓA SẠCH DỮ LIỆU CŨ HOÀN TOÀN
     memCacheTuNamList = [];
     safeRemoveItem(TU_NAM_KEY);
     try { await del(TU_NAM_KEY); } catch(e) {}

     // 2. ĐƯA DỮ LIỆU MỚI VÀO
     memCacheTuNamList = [...entries];
     try {
       safeSetItem(TU_NAM_KEY, JSON.stringify(entries));
     } catch(e) {}
     try {
       await set(TU_NAM_KEY, entries);
     } catch(e) {}
     window.dispatchEvent(new Event('workload_updated'));
     window.dispatchEvent(new Event('htdd_data_updated'));
  },

  setTiSheetEntries: async (entries: TiSheetEntry[]): Promise<void> => {
     // 1. XÓA SẠCH DỮ LIỆU CŨ HOÀN TOÀN
     memCacheTiSheetList = [];
     safeRemoveItem(TI_SHEET_KEY);
     try { await del(TI_SHEET_KEY); } catch(e) {}

     // 2. ĐƯA DỮ LIỆU MỚI VÀO
     memCacheTiSheetList = [...entries];
     try {
       safeSetItem(TI_SHEET_KEY, JSON.stringify(entries));
     } catch(e) {}
     try {
       await set(TI_SHEET_KEY, entries);
     } catch(e) {}
     window.dispatchEvent(new Event('workload_updated'));
     window.dispatchEvent(new Event('htdd_data_updated'));
  },

  getTiNamEntries: (): TiSheetEntry[] => {
     if (memCacheTiNamList && memCacheTiNamList.length > 0) return memCacheTiNamList;
     try {
       const cached = safeGetItem(TI_NAM_KEY);
       if (cached) {
         memCacheTiNamList = JSON.parse(cached);
         return memCacheTiNamList || [];
       }
     } catch (e) {}
     return [];
  },

  fetchTiNamData: async (force?: boolean): Promise<TiSheetEntry[]> => {
     if (!force && memCacheTiNamList && memCacheTiNamList.length > 0) {
       return memCacheTiNamList;
     }
     const sheetId = DataStore.getSpreadsheetId() || DEFAULT_SPREADSHEET_ID;
     try {
       const tiNamNames = ['TI_Nam', 'ti_nam', 'TINam', 'TI Nam', 'TI_nam'];
       let tinText = '';
       for (const sName of tiNamNames) {
           const tempText = await DataStore.fetchSheetCSV(sName, sheetId);
           if (tempText && !tempText.includes('<html') && tempText.trim().length > 20) {
               tinText = tempText;
               break;
           }
       }
       if (tinText) {
           const parsedTin = DataStore.parseTiCSVData(tinText);
           if (parsedTin && parsedTin.length > 0) {
               memCacheTiNamList = parsedTin;
               safeSetItem(TI_NAM_KEY, JSON.stringify(parsedTin));
               try { await set(TI_NAM_KEY, parsedTin); } catch(err) {}
               return parsedTin;
           }
       }
     } catch (e) {
       console.warn('Could not fetch TI_Nam sheet', e);
     }
     return DataStore.getTiNamEntries();
  },

  setTiNamEntries: async (entries: TiSheetEntry[]): Promise<void> => {
     // 1. XÓA SẠCH DỮ LIỆU CŨ HOÀN TOÀN
     memCacheTiNamList = [];
     safeRemoveItem(TI_NAM_KEY);
     try { await del(TI_NAM_KEY); } catch(e) {}

     // 2. ĐƯA DỮ LIỆU MỚI VÀO
     memCacheTiNamList = [...entries];
     try {
       safeSetItem(TI_NAM_KEY, JSON.stringify(entries));
     } catch(e) {}
     try {
       await set(TI_NAM_KEY, entries);
     } catch(e) {}
     window.dispatchEvent(new Event('workload_updated'));
     window.dispatchEvent(new Event('htdd_data_updated'));
  },

  syncHtddSheetToGoogleSheet: async (sheetName: string, headers: string[], rows: any[]): Promise<boolean> => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) return false;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'overwrite_htdd_sheet',
          sheetName,
          headers,
          rows
        })
      });
      return res.ok;
    } catch (e) {
      console.warn('Could not sync HTDD sheet to Google Sheet:', e);
      return false;
    }
  },

  syncSheetToGoogleSheet: async (
    sheetName: string, 
    headers: string[], 
    data: any[],
    onProgress?: (current: number, total: number, percent?: number) => void
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) {
        return { success: false, error: 'Chưa cấu hình URL Google Apps Script trong Cài đặt / Hệ thống.' };
      }

      // Format data rows matching headers
      const rows2D = data.map(item => 
        headers.map(h => (item[h] !== undefined && item[h] !== null) ? String(item[h]) : '')
      );

      // Tối ưu kích thước gói 2.500 dòng/gói để giảm số lượt gọi mạng tới 70% mà vẫn an toàn
      const CHUNK_SIZE = 2500;
      const totalChunks = Math.max(1, Math.ceil(rows2D.length / CHUNK_SIZE));

      for (let i = 0; i < totalChunks; i++) {
        const chunkRows = rows2D.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const percent = Math.round(((i + 1) / totalChunks) * 100);
        if (onProgress) {
          onProgress(i + 1, totalChunks, percent);
        }

        const payload = {
          action: 'overwrite_sheet',
          sheetName,
          chunkIndex: i,
          totalChunks,
          headers,
          rows: chunkRows
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(`Lỗi kết nối máy chủ Google (${res.status} ${res.statusText})`);
        }

        const rawText = await res.text();
        let resJson: any = null;
        try {
          resJson = JSON.parse(rawText);
        } catch {
          if (rawText.includes('Unknown action')) {
            return { 
              success: false, 
              error: 'Apps Script chưa có lệnh overwrite_sheet. Vui lòng sao chép lại mã Apps Script mới nhất từ tab Hệ thống.' 
            };
          }
        }

        if (resJson && resJson.status === 'error') {
          return { success: false, error: resJson.message || 'Lỗi xử lý từ Apps Script' };
        }
      }

      return { success: true, message: `Đã ghi đè thành công ${data.length} dòng vào sheet ${sheetName}` };
    } catch (e: any) {
      console.warn(`Error syncing sheet ${sheetName} to Google Sheet:`, e);
      return { success: false, error: e.message || 'Lỗi mạng hoặc kết nối tới Google Apps Script' };
    }
  },

  syncKhuVucToGoogleSheet: async (
    headers: string[], 
    data: any[],
    onProgress?: (current: number, total: number) => void
  ) => {
    return DataStore.syncSheetToGoogleSheet('KhuVuc', headers, data, onProgress);
  },

  updateTutiProgress: (id: string, updates: Partial<TutiEntry>, user: SheetMember | null) => {
     const allEntries = DataStore.getTutiEntries();
     const entry = allEntries.find(t => t.id === id);
     if (!entry) return null;

     const now = new Date();
     const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()}`;
     const isUpdate = (
         updates.thongSoTU !== undefined || 
         updates.thongSoTI !== undefined || 
         updates.kiemTraTU !== undefined || 
         updates.kiemTraTI !== undefined || 
         updates.khac !== undefined || 
         updates.ketLuan !== undefined
     );

     const updatedEntry = { 
         ...entry, 
         ...updates,
     };

     if (isUpdate && user) {
         updatedEntry.ngayCapNhat = dateStr;
         updatedEntry.nguoiKiemTra = user.name;
         
         const localUpdates = DataStore.getLocalTutiUpdates();
         localUpdates.push({
             entryId: id,
             updates,
             timestamp: Date.now(),
             synced: false
         });
         safeSetItem(LOCAL_TUTI_UPDATES_KEY, JSON.stringify(localUpdates));
     }

     const newEntries = allEntries.map(t => t.id === id ? updatedEntry : t);
     safeSetItem(TUTI_KEY, JSON.stringify(newEntries));
     
     DataStore.syncTutiToSheet(updatedEntry);
     return updatedEntry;
  },

  syncKhoToSheet: async (khoData: any[]) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update_kho', data: khoData }),
      });
      return response.ok;
    } catch (e) {
      console.warn('Error syncing Kho:', e);
      return false;
    }
  },

  syncVttbToSheet: async (vttbData: any[]) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update_vttb', data: vttbData }),
      });
      return response.ok;
    } catch (e) {
      console.warn('Error syncing VTTB:', e);
      return false;
    }
  },

  recordLocalOnlineUser: (username: string) => {
      if (!username || username === 'unknown') return;
      try {
          const KEY = 'app_online_users_registry';
          const stored = safeGetItem(KEY);
          const map: Record<string, number> = stored ? JSON.parse(stored) : {};
          map[username.trim()] = Date.now();
          const now = Date.now();
          for (const k in map) {
              if (now - map[k] > 15 * 60 * 1000) {
                  delete map[k];
              }
          }
          safeSetItem(KEY, JSON.stringify(map));
      } catch (e) {
          // ignore
      }
  },

  getLocalOnlineUsers: (): string[] => {
      try {
          const KEY = 'app_online_users_registry';
          const stored = safeGetItem(KEY);
          if (!stored) return [];
          const map: Record<string, number> = JSON.parse(stored);
          const now = Date.now();
          const list: string[] = [];
          for (const k in map) {
              if (now - map[k] <= 15 * 60 * 1000 && k && k !== 'unknown') {
                  list.push(k);
              }
          }
          return list;
      } catch (e) {
          return [];
      }
  },

  logInAction: async (username: string): Promise<OnlineStats | null> => {
      if (username) DataStore.recordLocalOnlineUser(username);
      try {
          const url = DataStore.getAppScriptUrl();
          if (!url) return null;
          const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'log_in', username })
          });
          const json = await response.json();
          if (json && json.status === 'success') {
              if (Array.isArray(json.onlineUsers) && json.onlineUsers.length > 0) {
                  json.onlineUsers.forEach((u: string) => DataStore.recordLocalOnlineUser(u));
              } else {
                  json.onlineUsers = DataStore.getLocalOnlineUsers();
              }
              return json;
          }
          return null;
      } catch (e) {
          console.warn('Error logInAction:', e);
          return null;
      }
  },

  pingOnline: async (username: string): Promise<OnlineStats | null> => {
      if (username) DataStore.recordLocalOnlineUser(username);
      try {
          const url = DataStore.getAppScriptUrl();
          if (!url) return null;
          const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'ping_online', username })
          });
          const json = await response.json();
          if (json && json.status === 'success') {
              if (Array.isArray(json.onlineUsers) && json.onlineUsers.length > 0) {
                  json.onlineUsers.forEach((u: string) => DataStore.recordLocalOnlineUser(u));
              } else {
                  json.onlineUsers = DataStore.getLocalOnlineUsers();
              }
              return json;
          }
          return null;
      } catch (e) {
          console.warn('Error pingOnline:', e);
          return null;
      }
  },

  getKthtddEntries: (): KthtddEntry[] => {
    return memCacheKthtddList || [];
  },

  getKthtddEntriesAsync: async (): Promise<KthtddEntry[]> => {
    if (memCacheKthtddList && memCacheKthtddList.length > 0) return memCacheKthtddList;
    try {
      const val = await get('sheet_kthtdd_v1');
      if (val && Array.isArray(val) && val.length > 0) {
        memCacheKthtddList = val;
        rebuildKthtddIndexes(memCacheKthtddList);
        return val;
      }
    } catch (e) {
      console.warn('Error reading kthtdd from IDB:', e);
    }
    return [];
  },

  setKthtddEntriesAsync: async (list: KthtddEntry[]): Promise<void> => {
    memCacheKthtddList = list;
    rebuildKthtddIndexes(memCacheKthtddList);
    try {
      await set('sheet_kthtdd_v1', list);
    } catch (e) {
      console.warn('Error saving kthtdd to IDB:', e);
    }
    window.dispatchEvent(new CustomEvent('kthtdd_updated'));
  },

  fetchKthtddFromSheet: async (sheetId?: string, onProgress?: (msg: string) => void, onlyAssigned?: boolean): Promise<KthtddEntry[]> => {
    onProgress?.(onlyAssigned ? 'Đang tải dữ liệu đã phân công từ Google Sheets...' : 'Đang tải dữ liệu từ Google Sheets...');
    const sId = sheetId || DataStore.getSpreadsheetId() || DEFAULT_SPREADSHEET_ID;
    const possibleSheets = ['KTHTDD', 'KT_HTDD', 'Kiện toàn HTDD', 'KienToanHTDD'];
    let csvText = '';
    for (const name of possibleSheets) {
      try {
        const text = await DataStore.fetchSheetCSV(name, sId);
        if (text && !text.includes('<html') && text.length > 100) {
          csvText = text;
          break;
        }
      } catch (err) {
        // try next
      }
    }
    if (!csvText) {
      throw new Error('Không thể tải sheet KTHTDD từ Google Sheets');
    }

    onProgress?.('Đang lọc và xử lý dữ liệu kiểm tra hệ thống đo đếm...');
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const rawRows = (parsed.data || []) as Record<string, any>[];

    // Đọc đồng thời dạng ma trận hàng (raw array) để xác định chính xác CỘT O (vị trí thứ 15, index 14)
    // và CỘT K (vị trí thứ 11, index 10) bất kể tiêu đề có bị biến đổi hay không
    const parsedArr = Papa.parse(csvText, { header: false, skipEmptyLines: true });
    const rawRowsArr = (parsedArr.data || []) as string[][];

    // Xác định dòng tiêu đề trong mảng rawRowsArr
    let headerRowIdxArr = 0;
    for (let r = 0; r < Math.min(10, rawRowsArr.length); r++) {
      const row = rawRowsArr[r];
      let matches = 0;
      for (const cell of row) {
        const norm = String(cell || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/đ/g, 'd')
          .replace(/[^a-z0-9]/g, '');
        if (norm.includes('makh') || norm.includes('matram') || norm.includes('danhso') || norm.includes('sono') || norm.includes('tentram')) {
          matches++;
        }
      }
      if (matches >= 2) {
        headerRowIdxArr = r;
        break;
      }
    }

    const entries: KthtddEntry[] = [];
    for (let i = 0; i < rawRows.length; i++) {
      const r = rawRows[i];
      // Lấy dòng tương ứng từ mảng ma trận rawRowsArr
      const rArr = rawRowsArr[headerRowIdxArr + 1 + i];

      let maKh = String(r['Mã KH'] || r['Ma KH'] || r['makh'] || '').trim();
      if (!maKh && rArr && rArr.length > 1) {
        maKh = String(rArr[1] || '').trim(); // Fallback Cột B (index 1)
      }
      if (!maKh) continue;

      // ƯU TIÊN SỐ 1: CỘT O TRONG SHEET KTHTDD (VỊ TRÍ CỘT 15, INDEX 14)
      const colOVal = rArr && rArr.length > 14 ? String(rArr[14] || '').trim() : '';

      // Nhận diện cột Người thực hiện linh hoạt (chống mất dữ liệu nếu sheet dùng tiêu đề Người TH, Phân công, NVTH,...)
      let nguoiThucHien = colOVal;
      if (!nguoiThucHien) {
        nguoiThucHien = String(
          r['Người thực hiện'] ||
          r['Nguoi thuc hien'] ||
          r['Người TH'] ||
          r['Nguoi TH'] ||
          r['Người th'] ||
          r['Nguoi th'] ||
          r['Nhân viên thực hiện'] ||
          r['NV thực hiện'] ||
          r['NVTH'] ||
          r['Người kiểm tra'] ||
          r['Nguoi kiem tra'] ||
          r['Phân công'] ||
          r['Phan cong'] ||
          ''
        ).trim();
      }

      // Nếu vẫn rỗng, quét các trường của row để tìm cột tương ứng
      if (!nguoiThucHien) {
        for (const k of Object.keys(r)) {
          const normK = k
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]/g, '');
          if (
            normK.includes('nguoithuchien') ||
            normK === 'nguoith' ||
            normK.includes('nhanvienthuchien') ||
            normK.includes('nvth') ||
            normK.includes('nguoikt') ||
            normK.includes('nguoikiemtra') ||
            normK.includes('phancong')
          ) {
            const v = String(r[k] || '').trim();
            if (v) {
              nguoiThucHien = v;
              break;
            }
          }
        }
      }

      // Tối ưu hóa siêu tốc cho nhân viên đi kiện toàn: chỉ nạp các dòng đã được phân công
      if (onlyAssigned && !nguoiThucHien) {
        continue;
      }

      const stt = r['Stt'] || r['STT'] || (i + 1);
      const tenKh = String(r['Tên KH'] || r['Ten KH'] || '').trim();
      const diaChi = String(r['Địa chỉ điểm đo'] || r['Địa chỉ'] || r['Dia chi'] || '').trim();
      const maTram = String(r['Mã trạm'] || r['Ma tram'] || '').trim();
      const tenTram = String(r['Tên trạm'] || r['Ten tram'] || '').trim();
      const danhSo = String(r['Danh số'] || r['Danh so'] || '').trim();
      const rawPhone = String(r['Số điện thoại'] || r['SDT'] || r['Số ĐT'] || r['So DT'] || r['Điện thoại'] || r['Dien thoai'] || r['Phone'] || '').trim();
      let cleanPhone = rawPhone.replace(/[\s\.\-_]/g, '');
      if (cleanPhone.startsWith('+84')) {
        cleanPhone = '0' + cleanPhone.slice(3);
      } else if (cleanPhone.startsWith('84') && cleanPhone.length >= 11) {
        cleanPhone = '0' + cleanPhone.slice(2);
      }
      if (cleanPhone && /^\d+$/.test(cleanPhone)) {
        if (!cleanPhone.startsWith('0')) {
          cleanPhone = '0' + cleanPhone;
        }
      }
      const soDienThoai = cleanPhone || rawPhone;
      const soNo = String(r['Số No'] || r['So No'] || r['Số công tơ'] || '').trim();
      let khuVuc = String(r['Khu vực'] || r['Khu vuc'] || '').trim();
      if (!khuVuc) {
        const lowerAddr = (diaChi + ' ' + tenTram).toLowerCase();
        if (lowerAddr.includes('phú mỹ') || lowerAddr.includes('phu my') || lowerAddr.includes('tân thành')) {
          khuVuc = 'Phú Mỹ';
        } else if (lowerAddr.includes('bà rịa') || lowerAddr.includes('ba ria') || lowerAddr.includes('long hương') || lowerAddr.includes('phước hưng')) {
          khuVuc = 'Bà Rịa';
        } else if (lowerAddr.includes('vũng tàu') || lowerAddr.includes('vung tau')) {
          khuVuc = 'Vũng Tàu';
        } else if (lowerAddr.includes('long sơn') || lowerAddr.includes('long son')) {
          khuVuc = 'Long Sơn';
        } else {
          khuVuc = 'Chưa phân khu vực';
        }
      }

      let ngay = String(r['Ngày'] || r['Ngay'] || r['Ngày KT'] || r['Ngay KT'] || r['Ngày kiểm tra'] || '').trim();
      if (!ngay && rArr && rArr.length > 10) {
        const colKVal = String(rArr[10] || '').trim(); // Cột K (vị trí thứ 11, index 10)
        if (colKVal) ngay = colKVal;
      }
      if (!ngay) {
        for (const k of Object.keys(r)) {
          const normK = k
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]/g, '');
          if (normK === 'ngay' || normK.includes('ngaykt') || normK.includes('ngaykiemtra')) {
            const v = String(r[k] || '').trim();
            if (v) {
              ngay = v;
              break;
            }
          }
        }
      }
      // Nhận diện cột Kết quả (ưu tiên Cột L index 11 và tiêu đề linh hoạt)
      let ketQua = String(r['Kết quả'] || r['Ket qua'] || r['KetQua'] || '').trim();
      if (!ketQua && rArr && rArr.length > 11) {
        ketQua = String(rArr[11] || '').trim();
      }
      if (!ketQua) {
        for (const k of Object.keys(r)) {
          const normK = k
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]/g, '');
          if (normK === 'ketqua' || normK.includes('ketquakt') || normK.includes('danhgia')) {
            const v = String(r[k] || '').trim();
            if (v) {
              ketQua = v;
              break;
            }
          }
        }
      }

      // Nhận diện cột Chì? / Bấm chì / Niêm chì linh hoạt và toàn diện
      let chi = String(
        r['Bấm chì'] ||
        r['Bấm chì?'] ||
        r['Bấm Chì'] ||
        r['Bam chi'] ||
        r['Bam chi?'] ||
        r['Chì?'] ||
        r['Chì ?'] ||
        r['Chì'] ||
        r['Chi?'] ||
        r['Chi ?'] ||
        r['Chi'] ||
        r['Niêm chì'] ||
        r['Niem chi'] ||
        r['Bấm niêm chì'] ||
        r['Tình trạng niêm chì'] ||
        r['Tình hình niêm chì'] ||
        r['Tình trạng bấm chì'] ||
        r['Tình hình bấm chì'] ||
        r['Tình trạng chì'] ||
        r['Kẹp chì'] ||
        r['Chì niêm'] ||
        r['Kiểm tra chì'] ||
        ''
      ).trim();

      if (!chi) {
        for (const k of Object.keys(r)) {
          const rawLowerK = k.toLowerCase();
          const normK = k
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]/g, '');

          // Loại trừ triệt để Địa chỉ, Chỉ số, Chi nhánh, Chi tiết, Tiêu chí, Chỉ đạo,...
          if (
            normK.includes('diachi') || normK.includes('chiso') || normK.includes('chinhanh') ||
            normK.includes('chidao') || normK.includes('chitiet') || normK.includes('tieuchi') ||
            rawLowerK.includes('địa chỉ') || rawLowerK.includes('chỉ số') || rawLowerK.includes('chi nhánh') ||
            rawLowerK.includes('chi tiết') || rawLowerK.includes('tiêu chí')
          ) {
            continue;
          }

          if (
            normK === 'chi' || normK === 'bamchi' || normK === 'niemchi' || normK === 'kepchi' ||
            normK.includes('bamchi') || normK.includes('niemchi') || normK.includes('tinhtrangchi') ||
            normK.includes('tinhhinhchi') || normK.includes('tinhtrangbamchi') || normK.includes('tinhtrangniemchi') ||
            rawLowerK.includes('bấm chì') || rawLowerK.includes('niêm chì') || rawLowerK.includes('kẹp chì') ||
            rawLowerK === 'chì' || rawLowerK === 'chì?' || rawLowerK === 'chi' || rawLowerK === 'chi?'
          ) {
            const v = String(r[k] || '').trim();
            if (v) {
              chi = v;
              break;
            }
          }
        }
      }

      if (!chi && rArr && rArr.length > 12) {
        const candidate = String(rArr[12] || '').trim();
        const candNorm = candidate.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        if (candNorm.includes('khong') || candNorm.includes('co') || candNorm === '1' || candNorm === '0' || candNorm === 'x' || candNorm === 'v') {
          chi = candidate;
        }
      }

      // Chuẩn hóa giá trị Chì?: BẮT BUỘC là 'Có' hoặc 'Không', TUYỆT ĐỐI KHÔNG ĐỂ RỖNG NẾU ĐÃ KIỂM TRA
      if (chi) {
        const normChi = chi.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        if (
          normChi.includes('khong') || normChi.includes('mat') || normChi.includes('dut') || normChi.includes('hong') ||
          normChi === '0' || normChi === 'ko' || normChi === 'k' || normChi === 'false'
        ) {
          chi = 'Không';
        } else {
          chi = 'Có';
        }
      } else if (ketQua && ketQua.trim().length > 0) {
        // Nếu đã có kết quả kiểm tra nhưng trường Chì / Bấm chì trên sheet bị rỗng:
        const normKq = ketQua.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        if (normKq.includes('khong') || normKq.includes('bat thuong') || normKq.includes('hong') || normKq.includes('mat')) {
          chi = 'Không';
        } else {
          chi = 'Có';
        }
      }

      // Nhận diện cột Đề xuất (ưu tiên Cột N index 13 và tiêu đề linh hoạt)
      let deXuat = String(r['Đề xuất'] || r['De xuat'] || r['Ghi chú'] || r['Ghi chu'] || r['Kiến nghị'] || '').trim();
      if (!deXuat && rArr && rArr.length > 13) {
        deXuat = String(rArr[13] || '').trim();
      }
      if (!deXuat) {
        for (const k of Object.keys(r)) {
          const normK = k
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]/g, '');
          if (normK.includes('dexuat') || normK.includes('ghichu') || normK.includes('kiennghi')) {
            const v = String(r[k] || '').trim();
            if (v) {
              deXuat = v;
              break;
            }
          }
        }
      }

      const x = String(r['X'] || r['x'] || r['Tọa độ X'] || r['Toa do X'] || r['Toạ độ X'] || r['Vĩ độ'] || r['Vi do'] || r['Latitude'] || r['Lat'] || '').trim();
      const y = String(r['Y'] || r['y'] || r['Tọa độ Y'] || r['Toa do Y'] || r['Toạ độ Y'] || r['Kinh độ'] || r['Kinh do'] || r['Longitude'] || r['Lng'] || r['Long'] || '').trim();
      const pic = String(r['Pic'] || r['pic'] || r['PIC'] || r['Ảnh'] || r['Anh'] || r['Hinh anh'] || r['Hình ảnh'] || '').trim();

      entries.push({
        stt,
        maKh,
        tenKh,
        diaChi,
        maTram,
        tenTram,
        danhSo,
        soDienThoai,
        soNo,
        khuVuc,
        ngay,
        ketQua,
        chi,
        deXuat,
        nguoiThucHien,
        x,
        y,
        pic
      });
    }

    await DataStore.setKthtddEntriesAsync(entries);
    return entries;
  },

  updateKthtdd: async (data: {
    maKh: string;
    ngay?: string;
    ketQua?: string;
    chi?: string;
    deXuat?: string;
    x?: string;
    y?: string;
    nguoiThucHien?: string;
    soDienThoai?: string;
    pic?: string;
  }): Promise<{ ok: boolean; message: string }> => {
    // 1. Tối ưu O(1) qua Index Map cho danh sách 200k dòng: cập nhật RAM ngay lập tức
    const cleanMaKh = (data.maKh || '').trim().toLowerCase();
    let idx = kthtddMaKhIndexMap.get(cleanMaKh);
    if (idx === undefined && memCacheKthtddList) {
      idx = memCacheKthtddList.findIndex(e => e.maKh.toLowerCase().trim() === cleanMaKh);
      if (idx !== -1) kthtddMaKhIndexMap.set(cleanMaKh, idx);
    }

    // Chuẩn hóa tuyệt đối giá trị Chì? / Bấm chì: bắt buộc là 'Có' hoặc 'Không', tuyệt đối không để rỗng
    let cleanChi: string | undefined = undefined;
    if (data.chi !== undefined || data.ketQua !== undefined) {
      if (data.chi !== undefined && String(data.chi).trim()) {
        const s = String(data.chi).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        if (s.includes('khong') || s.includes('mat') || s.includes('dut') || s.includes('hong') || s === '0' || s === 'ko' || s === 'k' || s === 'false') {
          cleanChi = 'Không';
        } else {
          cleanChi = 'Có';
        }
      } else if (data.ketQua && String(data.ketQua).trim()) {
        const s = String(data.ketQua).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        cleanChi = (s.includes('khong') || s.includes('bat thuong') || s.includes('hong') || s.includes('mat')) ? 'Không' : 'Có';
      } else {
        cleanChi = 'Có';
      }
    }

    if (idx !== undefined && idx !== -1 && memCacheKthtddList) {
      memCacheKthtddList[idx] = {
        ...memCacheKthtddList[idx],
        ...(data.ngay !== undefined ? { ngay: data.ngay } : {}),
        ...(data.ketQua !== undefined ? { ketQua: data.ketQua } : {}),
        ...(cleanChi !== undefined ? { chi: cleanChi } : {}),
        ...(data.deXuat !== undefined ? { deXuat: data.deXuat } : {}),
        ...(data.x !== undefined && data.x !== '' ? { x: data.x } : {}),
        ...(data.y !== undefined && data.y !== '' ? { y: data.y } : {}),
        ...(data.nguoiThucHien !== undefined ? { nguoiThucHien: data.nguoiThucHien } : {}),
        ...(data.soDienThoai !== undefined ? { soDienThoai: data.soDienThoai } : {}),
        ...(data.pic !== undefined ? { pic: data.pic } : {})
      };
      // Ghi IDB nền qua debounced timer để tránh đơ giao diện với 200k dòng
      debouncedSaveKthtddToIDB();
      window.dispatchEvent(new CustomEvent('kthtdd_updated'));
    }

    // 2. Gửi sang Google Apps Script
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) return { ok: true, message: 'Đã lưu cục bộ (chưa cấu hình Apps Script)' };
      const payloadData = {
        ...data,
        ...(cleanChi !== undefined ? { chi: cleanChi, bamChi: cleanChi, tinhTrangChi: cleanChi } : {})
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update_kthtdd', data: payloadData })
      });
      const rawText = await response.text();
      try {
        const res = JSON.parse(rawText);
        return { ok: res.status === 'success', message: res.message || 'Cập nhật thành công' };
      } catch {
        return { ok: response.ok, message: 'Đã gửi cập nhật kết quả kiểm tra' };
      }
    } catch (e: any) {
      console.warn('Error updateKthtdd:', e);
      return { ok: false, message: e.message || 'Lỗi kết nối tới máy chủ' };
    }
  },

  applyAssignmentLocally: (data: { maTram: string; tenTram?: string; nguoiThucHien: string; maKhList?: string[]; ngay?: string }) => {
    const cleanTram = (data.maTram || '').trim().toLowerCase();
    const cleanTen = (data.tenTram || '').trim().toLowerCase();
    const khSet = new Set((data.maKhList || []).map(k => String(k).trim().toLowerCase()));

    // Lấy ngày phân công (nếu không truyền thì lấy ngày hiện tại dd/MM/yyyy)
    let assignDate = data.ngay;
    if (!assignDate) {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      assignDate = `${dd}/${mm}/${yyyy}`;
    }

    if (memCacheKthtddList) {
      let changed = false;
      for (let i = 0; i < memCacheKthtddList.length; i++) {
        const item = memCacheKthtddList[i];
        const mMatch = cleanTram && item.maTram && item.maTram.toLowerCase().trim() === cleanTram;
        const nMatch = cleanTen && item.tenTram && item.tenTram.toLowerCase().trim() === cleanTen;
        const kMatch = item.maKh && khSet.has(item.maKh.toLowerCase().trim());
        if (mMatch || nMatch || kMatch) {
          memCacheKthtddList[i] = {
            ...memCacheKthtddList[i],
            nguoiThucHien: data.nguoiThucHien,
            ngay: assignDate
          };
          changed = true;
        }
      }
      if (changed) {
        debouncedSaveKthtddToIDB();
        window.dispatchEvent(new CustomEvent('kthtdd_updated'));
      }
    }
  },

  assignKthtdd: async (
    data: { maTram: string; tenTram?: string; nguoiThucHien: string; maKhList?: string[]; ngay?: string },
    options?: { timeoutSeconds?: number }
  ): Promise<{ ok: boolean; message: string; isTimeout?: boolean; savedLocally?: boolean }> => {
    let assignDate = data.ngay;
    if (!assignDate) {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      assignDate = `${dd}/${mm}/${yyyy}`;
    }
    const payloadData = { ...data, ngay: assignDate };

    // Ưu tiên hàng đầu cho người dùng: LƯU CỤC BỘ NGAY TỨC THÌ (RAM & IDB)
    DataStore.applyAssignmentLocally(payloadData);

    const url = DataStore.getAppScriptUrl();
    if (!url) {
      return { ok: true, savedLocally: true, message: 'Đã lưu phân công an toàn vào máy (chưa cấu hình Google Apps Script).' };
    }

    const timeoutMs = (options?.timeoutSeconds || 45) * 1000;
    let lastError = '';
    let isTimeout = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'assign_kthtdd', data: payloadData }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const rawText = await response.text();
      try {
        const res = JSON.parse(rawText);
        if (res.status === 'success') {
          return {
            ok: true,
            savedLocally: true,
            message: res.message || `Đã phân công ${res.count !== undefined ? res.count + ' KH' : ''} thành công!`
          };
        } else {
          return {
            ok: false,
            savedLocally: true,
            message: res.message || 'Google Sheets phản hồi lỗi không thể cập nhật.'
          };
        }
      } catch {
        if (response.ok) {
          return { ok: true, savedLocally: true, message: 'Đã gửi phân công thành công tới máy chủ Google Sheets.' };
        }
        return { ok: false, savedLocally: true, message: 'Máy chủ phản hồi định dạng không hợp lệ.' };
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        isTimeout = true;
        lastError = `Quá thời gian chờ phản hồi Google Sheets (${Math.round(timeoutMs / 1000)}s)`;
      } else {
        lastError = e.message || 'Lỗi mạng khi kết nối Google Sheets';
      }
    }

    return { ok: false, savedLocally: true, message: lastError || 'Lỗi kết nối tới máy chủ Google Apps Script.', isTimeout };
  },
  // ==========================================
  // ========== DVKH DATA MANAGEMENT ==========
  // ==========================================

  parseDvkhCSVData: (input: string | any[]): DvkhEntry[] => {
    if (!input) return [];
    const normalizeKey = (k: string) => String(k || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s_]+/g, '').replace(/đ/g, 'd');
    
    let rows: any[] = [];
    if (typeof input === 'string') {
      const parsed = Papa.parse(input, { header: false, skipEmptyLines: true });
      const allRows = (parsed.data as any[]) || [];
      if (allRows.length === 0) return [];

      let headerRowIdx = 0;
      for (let r = 0; r < Math.min(10, allRows.length); r++) {
        const rowNorm = (allRows[r] || []).map((c: any) => normalizeKey(String(c || ''))).join(' ');
        if (rowNorm.includes('makh') || (rowNorm.includes('ma') && rowNorm.includes('ten'))) {
          headerRowIdx = r;
          break;
        }
      }

      const headers = (allRows[headerRowIdx] || []).map((c: any) => String(c || '').trim());
      rows = allRows.slice(headerRowIdx + 1).map((r: any[]) => {
        const obj: any = {};
        headers.forEach((h: string, idx: number) => {
          if (h) obj[h] = r[idx];
        });
        return obj;
      });
    } else if (Array.isArray(input)) {
      rows = input;
    } else {
      return [];
    }

    return rows.map((row: any, idx: number) => {
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

      const sttRaw = getVal(['stt', 'so thu tu', 'so_thu_tu', 'sothutu', 'sott', 'tt', 'stt_hs', 'sttkh', 'thu tu']);
      const maKh = getVal(['makh', 'ma khach hang', 'ma kh', 'ma_kh', 'ma']);
      const tenKh = getVal(['tenkh', 'ten khach hang', 'ten kh', 'ho va ten', 'ho ten', 'ten']);
      const diaChi = getVal(['diachi', 'dia chi khach hang', 'dia chi']);
      const loaiYeuCau = getVal(['loai', 'loại', 'loaiyeucau', 'loai yeu cau', 'yeu cau', 'loai hs', 'loaiyeucauhs']);
      const ngayNhan = getVal(['ngaynhan', 'ngay nhan', 'ngay tao', 'ngaytao']);
      const nguoiNhan = getVal(['nguoinhan', 'nguoi nhan']);
      const ngayGiao = getVal(['ngaygiao', 'ngay giao']);
      const nguoiGiao = getVal(['nguoigiao', 'nguoi giao']);
      const nguoiThucHien = getVal(['nguoithuchien', 'nguoi thuc hien', 'nhan vien']);
      const ngayHoanTat = getVal(['ngayhoantat', 'ngay hoan tat', 'ngay xong']);
      const ketQuaRaw = getVal(['ketqua', 'ket qua']);
      let ghiChu = getVal(['ghichu', 'ghi chu', 'noi dung ghi chu', 'tro ngai', 'noidungghichu']);
      const trangThaiRaw = getVal(['trangthai', 'trang thai']);
      const sdt = getVal(['sdt', 'so dien thoai', 'dien thoai', 'phone', 'tel']);
      const pic = getVal(['pic', 'hinhanh', 'hinh anh', 'anh', 'anh chung minh', 'anh tro ngai', 'anhtrongai']);
      const ngayTao = getVal(['ngaytao', 'ngay tao']) || ngayNhan;
      const nguoiTao = getVal(['nguoitao', 'nguoi tao']);

      let ketQua: 'Chưa' | 'Xong' | '' = '';
      if (ketQuaRaw.toLowerCase().includes('xong')) ketQua = 'Xong';
      else if (ketQuaRaw.toLowerCase().includes('chua')) ketQua = 'Chưa';

      // Xử lý chuẩn xác trạng thái và ghi chú
      const normTrangThai = normalizeKey(trangThaiRaw);
      let trangThai: DvkhEntry['trangThai'] = 'Chưa giao';

      if (normTrangThai.includes('xong') || ketQua === 'Xong') {
        trangThai = 'Xong';
      } else if (normTrangThai.includes('trongai') || normTrangThai.includes('tro ngai') || ketQua === 'Chưa') {
        trangThai = 'Trở ngại';
      } else if (normTrangThai.includes('giaothicong') || normTrangThai.includes('da giao') || (ngayGiao && nguoiThucHien)) {
        trangThai = 'Đã Giao thi công';
      } else if (normTrangThai.includes('danhan') || normTrangThai.includes('da nhan') || normTrangThai.includes('datiepnhan') || normTrangThai.includes('da tiep nhan') || (ngayNhan && nguoiNhan)) {
        trangThai = 'Đã Nhận';
      } else if (normTrangThai.includes('chonhan') || normTrangThai.includes('cho nhan') || normTrangThai.includes('chotiepnhan') || normTrangThai.includes('cho tiep nhan')) {
        trangThai = 'Chờ nhận';
      } else if (normTrangThai.includes('chuagiao') || normTrangThai.includes('chua giao')) {
        trangThai = 'Chưa giao';
      } else if (!trangThaiRaw) {
        if (ngayGiao || nguoiThucHien) trangThai = 'Đã Giao thi công';
        else if (ngayNhan && nguoiNhan) trangThai = 'Đã Nhận';
        else trangThai = 'Chưa giao';
      } else {
        // Trường hợp trangThaiRaw chứa nội dung ghi chú bị lưu nhầm vào cột trạng thái trước đó
        if (!ghiChu && trangThaiRaw.length > 0 && !normTrangThai.includes('giao') && !normTrangThai.includes('nhan')) {
          ghiChu = trangThaiRaw;
        }
        trangThai = 'Chưa giao';
      }

      return {
        stt: sttRaw ? (parseInt(String(sttRaw).trim(), 10) || (idx + 1)) : (idx + 1),
        maKh: (maKh && maKh.trim()) ? maKh.trim() : '',
        tenKh: tenKh || 'Khách hàng',
        diaChi: diaChi || '',
        sdt,
        pic,
        ngayNhan,
        nguoiNhan,
        ngayGiao,
        nguoiGiao: '', // Không cần thiết lưu người giao vì luôn là DVKH
        nguoiThucHien: nguoiThucHien || '',
        ngayHoanTat,
        ketQua,
        ghiChu,
        trangThai,
        loaiYeuCau: loaiYeuCau || 'Gắn mới',
        ngayTao,
        nguoiTao
      } as DvkhEntry;
    }).filter(e => e.maKh);
  },

  getLocalDvkhUpdatesMap: (): Record<string, LocalDvkhUpdate> => {
    if (memCacheDvkhUpdatesMap) return memCacheDvkhUpdatesMap;
    try {
      const cached = safeGetItem(LOCAL_DVKH_UPDATES_KEY);
      if (cached) {
        memCacheDvkhUpdatesMap = JSON.parse(cached);
        return memCacheDvkhUpdatesMap || {};
      }
    } catch {}
    memCacheDvkhUpdatesMap = {};
    return {};
  },

  recordLocalDvkhUpdate: (maKh: string, updates: Partial<DvkhEntry>, synced = false) => {
    const key = String(maKh || '').trim().toLowerCase();
    if (!key) return;
    const map = { ...DataStore.getLocalDvkhUpdatesMap() };
    const existing = map[key];
    map[key] = {
      maKh,
      updates: existing ? { ...existing.updates, ...updates } : updates,
      timestamp: Date.now(),
      synced
    };
    memCacheDvkhUpdatesMap = map;
    try {
      safeSetItem(LOCAL_DVKH_UPDATES_KEY, JSON.stringify(map));
      set(LOCAL_DVKH_UPDATES_KEY, map).catch(() => {});
    } catch {}
  },

  markDvkhUpdateSynced: (maKhs: string[]) => {
    const map = { ...DataStore.getLocalDvkhUpdatesMap() };
    let changed = false;
    for (const m of maKhs) {
      const key = String(m || '').trim().toLowerCase();
      if (map[key]) {
        map[key] = { ...map[key], synced: true };
        changed = true;
      }
    }
    if (changed) {
      memCacheDvkhUpdatesMap = map;
      try {
        safeSetItem(LOCAL_DVKH_UPDATES_KEY, JSON.stringify(map));
        set(LOCAL_DVKH_UPDATES_KEY, map).catch(() => {});
      } catch {}
    }
  },

  applyLocalDvkhUpdates: (entries: DvkhEntry[]): DvkhEntry[] => {
    if (!entries || !Array.isArray(entries)) return [];
    const map = DataStore.getLocalDvkhUpdatesMap();
    if (!map || Object.keys(map).length === 0) return entries;
    return entries.map(item => {
      const key = String(item.maKh || '').trim().toLowerCase();
      const upd = map[key];
      if (upd && upd.updates) {
        return { ...item, ...upd.updates };
      }
      return item;
    });
  },

  mergeDvkhEntry: (remoteItem: DvkhEntry, localItem?: DvkhEntry, localUpdate?: LocalDvkhUpdate): DvkhEntry => {
    if (!localItem && !localUpdate) return remoteItem;
    let res: DvkhEntry = { ...remoteItem };

    if (localItem) {
      const remoteWeight = getDvkhStatusWeight(remoteItem.trangThai);
      const localWeight = getDvkhStatusWeight(localItem.trangThai);

      if (localWeight > remoteWeight) {
        // Local has advanced further (e.g. đã nhận, đã giao thi công, xong, trở ngại)
        // Never allow a stale Google Sheet row to revert local progression!
        res.trangThai = localItem.trangThai;
        res.ngayNhan = localItem.ngayNhan || res.ngayNhan;
        res.nguoiNhan = localItem.nguoiNhan || res.nguoiNhan;
        res.ngayGiao = localItem.ngayGiao || res.ngayGiao;
        res.nguoiGiao = localItem.nguoiGiao || res.nguoiGiao;
        res.nguoiThucHien = localItem.nguoiThucHien || res.nguoiThucHien;
        res.ngayHoanTat = localItem.ngayHoanTat || res.ngayHoanTat;
        res.ketQua = localItem.ketQua || res.ketQua;
        res.pic = localItem.pic || res.pic;
        if (localItem.ghiChu) {
          res.ghiChu = localItem.ghiChu;
        }
      } else if (localWeight === remoteWeight) {
        // Equal stages: preserve any details that local has populated
        res.ngayNhan = res.ngayNhan || localItem.ngayNhan;
        res.nguoiNhan = res.nguoiNhan || localItem.nguoiNhan;
        res.ngayGiao = res.ngayGiao || localItem.ngayGiao;
        res.nguoiGiao = res.nguoiGiao || localItem.nguoiGiao;
        res.nguoiThucHien = res.nguoiThucHien || localItem.nguoiThucHien;
        res.ngayHoanTat = res.ngayHoanTat || localItem.ngayHoanTat;
        res.ketQua = res.ketQua || localItem.ketQua;
        res.pic = res.pic || localItem.pic;
        if (localItem.ghiChu && localItem.ghiChu.length > (res.ghiChu || '').length) {
          res.ghiChu = localItem.ghiChu;
        }
      } else {
        // Remote has advanced further: adopt remote status but preserve local assets if remote lacks them
        res.pic = res.pic || localItem.pic;
        res.sdt = res.sdt || localItem.sdt;
      }
    }

    if (localUpdate && localUpdate.updates) {
      res = { ...res, ...localUpdate.updates };
    }

    return res;
  },

  getDeletedDvkhKeys: (): Set<string> => {
    if (memCacheDeletedDvkhKeys) return memCacheDeletedDvkhKeys;
    try {
      const cached = safeGetItem(DELETED_DVKH_KEYS);
      if (cached) {
        const arr = JSON.parse(cached);
        if (Array.isArray(arr)) {
          memCacheDeletedDvkhKeys = new Set(arr.map(k => String(k).trim().toLowerCase()));
          return memCacheDeletedDvkhKeys;
        }
      }
    } catch {}
    memCacheDeletedDvkhKeys = new Set();
    return memCacheDeletedDvkhKeys;
  },

  recordDeletedDvkhKeys: (keys: string[]) => {
    const setKeys = DataStore.getDeletedDvkhKeys();
    keys.forEach(k => {
      const norm = String(k || '').trim().toLowerCase();
      if (norm) setKeys.add(norm);
    });
    memCacheDeletedDvkhKeys = setKeys;
    try {
      const arr = Array.from(setKeys);
      safeSetItem(DELETED_DVKH_KEYS, JSON.stringify(arr));
      set(DELETED_DVKH_KEYS, arr).catch(() => {});
    } catch {}
  },

  unmarkDeletedDvkhKeys: (keys: string[]) => {
    const setKeys = DataStore.getDeletedDvkhKeys();
    let changed = false;
    keys.forEach(k => {
      const norm = String(k || '').trim().toLowerCase();
      if (norm && setKeys.has(norm)) {
        setKeys.delete(norm);
        changed = true;
      }
    });
    if (changed) {
      memCacheDeletedDvkhKeys = setKeys;
      try {
        const arr = Array.from(setKeys);
        safeSetItem(DELETED_DVKH_KEYS, JSON.stringify(arr));
        set(DELETED_DVKH_KEYS, arr).catch(() => {});
      } catch {}
    }
  },

  mergeDvkhList: (remoteList: DvkhEntry[], localList: DvkhEntry[]): DvkhEntry[] => {
    const deletedKeys = DataStore.getDeletedDvkhKeys();
    const localMap = new Map<string, DvkhEntry>();
    for (const item of (localList || [])) {
      if (item.maKh) {
        const key = String(item.maKh).trim().toLowerCase();
        if (!deletedKeys.has(key)) {
          localMap.set(key, item);
        }
      }
    }
    const updateMap = DataStore.getLocalDvkhUpdatesMap();
    const result: DvkhEntry[] = [];
    const seenKeys = new Set<string>();

    for (const remote of (remoteList || [])) {
      const key = String(remote.maKh || '').trim().toLowerCase();
      if (!key || deletedKeys.has(key)) continue; // Không nạp các hồ sơ đã bị xóa
      if (seenKeys.has(key)) {
        // Nếu trùng mã trong remote sheet, merge vào bản ghi đã có thay vì nhân bản dòng
        const existingIdx = result.findIndex(r => String(r.maKh || '').trim().toLowerCase() === key);
        if (existingIdx !== -1) {
          result[existingIdx] = DataStore.mergeDvkhEntry(remote, result[existingIdx]);
        }
        continue;
      }
      seenKeys.add(key);
      const local = localMap.get(key);
      const upd = updateMap[key];
      result.push(DataStore.mergeDvkhEntry(remote, local, upd));
      localMap.delete(key);
    }

    // Preserve local-only records that haven't appeared in Google Sheets yet
    for (const [key, localRemaining] of localMap.entries()) {
      if (deletedKeys.has(key) || seenKeys.has(key)) continue;
      seenKeys.add(key);
      const upd = updateMap[key];
      result.push(upd && upd.updates ? { ...localRemaining, ...upd.updates } : localRemaining);
    }

    return result;
  },

  getDvkhEntries: (): DvkhEntry[] => {
    const deletedKeys = DataStore.getDeletedDvkhKeys();
    const deduplicate = (list: DvkhEntry[]): DvkhEntry[] => {
      const seen = new Set<string>();
      const res: DvkhEntry[] = [];
      for (const item of list) {
        const k = String(item.maKh || '').trim().toLowerCase();
        if (k && !deletedKeys.has(k) && !seen.has(k)) {
          seen.add(k);
          res.push(item);
        }
      }
      return res;
    };

    if (memCacheDvkhList && Array.isArray(memCacheDvkhList)) {
      return deduplicate(memCacheDvkhList);
    }
    try {
      const cached = safeGetItem(DVKH_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const applied = DataStore.applyLocalDvkhUpdates(parsed);
          const filtered = deduplicate(applied);
          memCacheDvkhList = filtered;
          return filtered;
        }
      }
    } catch (e) {}
    memCacheDvkhList = [];
    return [];
  },

  saveDvkhEntries: (entries: DvkhEntry[]) => {
    const deletedKeys = DataStore.getDeletedDvkhKeys();
    const seen = new Set<string>();
    const deduplicated: DvkhEntry[] = [];
    for (const item of (entries || [])) {
      const k = String(item.maKh || '').trim().toLowerCase();
      if (k && !deletedKeys.has(k) && !seen.has(k)) {
        seen.add(k);
        deduplicated.push(item);
      }
    }
    memCacheDvkhList = deduplicated;
    safeSetItem(DVKH_KEY, JSON.stringify(deduplicated));
    try {
      set(DVKH_KEY, deduplicated).catch(err => console.warn('Error saving DVKH to IDB:', err));
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('dvkh_updated'));
  },

  addDvkhEntry: async (entry: DvkhEntry): Promise<DvkhEntry> => {
    const list = [...DataStore.getDvkhEntries()];
    const maxStt = list.reduce((max, item) => Math.max(max, typeof item.stt === 'number' ? item.stt : parseInt(String(item.stt || 0), 10) || 0), 0);
    const parsedStt = typeof entry.stt === 'number' ? entry.stt : parseInt(String(entry.stt || 0), 10);
    if (!parsedStt || isNaN(parsedStt) || parsedStt <= 0) {
      entry.stt = Math.max(maxStt + 1, list.length + 1);
    } else {
      entry.stt = parsedStt;
    }
    if (!entry.ngayNhan) entry.ngayNhan = entry.ngayTao || new Date().toLocaleString('vi-VN');
    entry.nguoiGiao = ''; // Người giao luôn là DVKH nên không cần thiết phải lưu
    if (!entry.trangThai) entry.trangThai = 'Chưa giao';

    // Xóa khỏi danh sách đã xóa nếu tạo mới lại hồ sơ có cùng mã
    DataStore.unmarkDeletedDvkhKeys([entry.maKh]);

    const normKey = String(entry.maKh || '').trim().toLowerCase();
    const existingIdx = list.findIndex(e => String(e.maKh || '').trim().toLowerCase() === normKey);
    if (existingIdx !== -1) {
      list[existingIdx] = { ...list[existingIdx], ...entry };
    } else {
      list.unshift(entry);
    }

    DataStore.saveDvkhEntries(list);
    DataStore.recordLocalDvkhUpdate(entry.maKh, entry, false);
    DataStore.syncDvkhToSheet(entry).then(ok => {
      if (ok) DataStore.markDvkhUpdateSynced([entry.maKh]);
    }).catch(() => {});
    return entry;
  },

  addDvkhEntries: async (entries: DvkhEntry[]): Promise<DvkhEntry[]> => {
    const list = [...DataStore.getDvkhEntries()];
    let maxStt = list.reduce((max, item) => Math.max(max, typeof item.stt === 'number' ? item.stt : parseInt(String(item.stt || 0), 10) || 0), 0);
    if (maxStt === 0) maxStt = list.length;
    const nowStr = new Date().toLocaleString('vi-VN');

    DataStore.unmarkDeletedDvkhKeys(entries.map(e => e.maKh));

    const existingKeyMap = new Map<string, number>();
    list.forEach((item, idx) => {
      const k = String(item.maKh || '').trim().toLowerCase();
      if (k) existingKeyMap.set(k, idx);
    });

    const preparedNewItems: DvkhEntry[] = [];
    const allSyncedItems: DvkhEntry[] = [];

    entries.forEach(e => {
      const k = String(e.maKh || '').trim().toLowerCase();
      if (!k) return;

      let parsedStt = typeof e.stt === 'number' ? e.stt : parseInt(String(e.stt || 0), 10);
      let stt = 0;
      if (parsedStt && !isNaN(parsedStt) && parsedStt > 0) {
        stt = parsedStt;
        if (stt > maxStt) maxStt = stt;
      } else {
        maxStt++;
        stt = maxStt;
      }

      const itemPrepared: DvkhEntry = {
        ...e,
        stt,
        loaiYeuCau: e.loaiYeuCau || (e as any).loai || 'Gắn mới',
        ngayNhan: e.ngayNhan || e.ngayTao || nowStr,
        nguoiGiao: '', // Không cần thiết lưu người giao vì luôn là DVKH
        trangThai: e.trangThai || 'Chưa giao',
        ghiChu: e.ghiChu || ''
      };

      allSyncedItems.push(itemPrepared);

      if (existingKeyMap.has(k)) {
        const idx = existingKeyMap.get(k)!;
        list[idx] = { ...list[idx], ...itemPrepared };
      } else {
        preparedNewItems.push(itemPrepared);
        existingKeyMap.set(k, -1);
      }
    });

    const updatedList = [...preparedNewItems, ...list];
    DataStore.saveDvkhEntries(updatedList);
    allSyncedItems.forEach(item => DataStore.recordLocalDvkhUpdate(item.maKh, item, false));
    DataStore.syncDvkhToSheet(allSyncedItems).then(ok => {
      if (ok) DataStore.markDvkhUpdateSynced(allSyncedItems.map(p => p.maKh));
    }).catch(() => {});
    return allSyncedItems;
  },

  updateDvkhEntry: async (maKh: string, updates: Partial<DvkhEntry>): Promise<DvkhEntry | null> => {
    const list = [...DataStore.getDvkhEntries()];
    const normTarget = String(maKh || '').trim().toLowerCase();
    const idx = list.findIndex(e => String(e.maKh || '').trim().toLowerCase() === normTarget);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      DataStore.saveDvkhEntries(list);
      DataStore.recordLocalDvkhUpdate(maKh, updates, false);
      DataStore.syncDvkhToSheet(list[idx]).then(ok => {
        if (ok) DataStore.markDvkhUpdateSynced([maKh]);
      }).catch(() => {});
      return list[idx];
    }
    return null;
  },

  batchUpdateDvkh: async (maKhs: string[], updates: Partial<DvkhEntry>): Promise<void> => {
    const list = [...DataStore.getDvkhEntries()];
    const setKeys = new Set(maKhs.map(k => String(k || '').trim().toLowerCase()));
    const updatedItems: DvkhEntry[] = [];
    const updatedList = list.map(item => {
      if (setKeys.has(String(item.maKh || '').trim().toLowerCase())) {
        const updated = { ...item, ...updates };
        updatedItems.push(updated);
        return updated;
      }
      return item;
    });
    DataStore.saveDvkhEntries(updatedList);
    maKhs.forEach(k => DataStore.recordLocalDvkhUpdate(k, updates, false));
    if (updatedItems.length > 0) {
      DataStore.syncDvkhToSheet(updatedItems).then(ok => {
        if (ok) DataStore.markDvkhUpdateSynced(maKhs);
      }).catch(() => {});
    }
  },

  syncPendingDvkhUpdates: async (): Promise<void> => {
    try {
      const map = DataStore.getLocalDvkhUpdatesMap();
      const pendingKeys = Object.keys(map).filter(k => !map[k].synced);
      if (pendingKeys.length === 0) return;

      const currentList = DataStore.getDvkhEntries();
      const currentMap = new Map<string, DvkhEntry>();
      for (const item of currentList) {
        if (item.maKh) currentMap.set(String(item.maKh).trim().toLowerCase(), item);
      }

      const itemsToSync: DvkhEntry[] = [];
      const syncedKeys: string[] = [];

      for (const k of pendingKeys) {
        const entry = currentMap.get(k);
        if (entry) {
          itemsToSync.push(entry);
          syncedKeys.push(entry.maKh);
        }
      }

      if (itemsToSync.length > 0) {
        const ok = await DataStore.syncDvkhToSheet(itemsToSync);
        if (ok) {
          DataStore.markDvkhUpdateSynced(syncedKeys);
        }
      }
    } catch (e) {
      console.warn('Error in syncPendingDvkhUpdates:', e);
    }
  },

  syncDvkhToSheet: async (data: DvkhEntry | DvkhEntry[]): Promise<boolean> => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) return false;
      const rawItems = Array.isArray(data) ? data : [data];
      const items = rawItems.map(item => {
        const parsedStt = typeof item.stt === 'number' ? item.stt : parseInt(String(item.stt || 0), 10);
        return {
        stt: (!isNaN(parsedStt) && parsedStt > 0) ? parsedStt : '',
        maKh: item.maKh,
        tenKh: item.tenKh,
        diaChi: item.diaChi || '',
        sdt: item.sdt || '',
        loai: item.loaiYeuCau || (item as any).loai || 'Gắn mới',
        loaiYeuCau: item.loaiYeuCau || (item as any).loai || 'Gắn mới',
        ngayNhan: item.ngayNhan || item.ngayTao || '',
        nguoiNhan: item.nguoiNhan || '',
        ngayGiao: item.ngayGiao || '',
        nguoiGiao: '', // Luôn để trống vì người giao luôn là DVKH
        nguoiThucHien: item.nguoiThucHien || '',
        ngayHoanTat: item.ngayHoanTat || '',
        ketQua: item.ketQua || '',
        trangThai: item.trangThai || 'Chưa giao',
        ghiChu: item.ghiChu || '',
        pic: item.pic || '',
        ngayTao: item.ngayTao || item.ngayNhan || '',
        nguoiTao: item.nguoiTao || ''
      };});

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'save_dvkh',
          sheetName: 'DVKH',
          items: items
        })
      });
      return response.ok;
    } catch (e) {
      console.warn('Could not sync DVKH to sheet:', e);
      return false;
    }
  },

  deleteDvkhEntry: async (maKh: string): Promise<boolean> => {
    return DataStore.batchDeleteDvkh([maKh]);
  },

  batchDeleteDvkh: async (maKhs: string[]): Promise<boolean> => {
    if (!maKhs || maKhs.length === 0) return true;
    const targetSet = new Set(maKhs.map(k => String(k || '').trim().toLowerCase()));

    // 1. Ghi nhận vào danh sách các khóa đã xóa
    DataStore.recordDeletedDvkhKeys(maKhs);

    // 2. Cập nhật danh sách local và in-memory
    const currentList = DataStore.getDvkhEntries();
    const updatedList = currentList.filter(e => !targetSet.has(String(e.maKh || '').trim().toLowerCase()));
    DataStore.saveDvkhEntries(updatedList);

    // 3. Xóa các cập nhật tồn của những mã KH này khỏi LOCAL_DVKH_UPDATES_KEY
    const updateMap = { ...DataStore.getLocalDvkhUpdatesMap() };
    let updateMapChanged = false;
    for (const k of targetSet) {
      if (updateMap[k]) {
        delete updateMap[k];
        updateMapChanged = true;
      }
    }
    if (updateMapChanged) {
      memCacheDvkhUpdatesMap = updateMap;
      try {
        safeSetItem(LOCAL_DVKH_UPDATES_KEY, JSON.stringify(updateMap));
        set(LOCAL_DVKH_UPDATES_KEY, updateMap).catch(() => {});
      } catch {}
    }

    // 4. Đồng bộ xóa dòng trực tiếp trong sheet DVKH trên Google Sheets
    const syncSuccess = await DataStore.syncDeleteDvkhToSheet(maKhs);

    // 5. Bắn sự kiện cập nhật giao diện
    window.dispatchEvent(new CustomEvent('dvkh_updated'));
    return syncSuccess;
  },

  syncDeleteDvkhToSheet: async (maKhs: string[]): Promise<boolean> => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) return false;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'delete_dvkh',
          sheetName: 'DVKH',
          maKhs: maKhs
        })
      });
      return response.ok;
    } catch (e) {
      console.warn('Could not sync delete DVKH to sheet:', e);
      return false;
    }
  },

  getAllowCustomNgayHoanTatDvkh: (): boolean => {
    try {
      const val = safeGetItem(ALLOW_CUSTOM_NGAY_HOAN_TAT_DVKH_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  },

  setAllowCustomNgayHoanTatDvkh: (val: boolean) => {
    safeSetItem(ALLOW_CUSTOM_NGAY_HOAN_TAT_DVKH_KEY, String(val));
    window.dispatchEvent(new CustomEvent('dvkh_config_updated'));
  }

};
