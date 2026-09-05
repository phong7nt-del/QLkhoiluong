import Papa from 'papaparse';
import { get, set } from 'idb-keyval';

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
  [key: string]: any;
}

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

const STORAGE_KEY = 'workload_data_v1';
const SCRIPT_URL_KEY = 'app_script_url_v1';
const TEAMS_KEY = 'sheet_teams_v1';
const MEMBERS_KEY = 'sheet_members_v1';
const STATIONS_KEY = 'sheet_stations_v1';
const DINHMUC_KEY = 'sheet_dinhmuc_v1';
const PROGRESS_KEY = 'sheet_progress_v1';
const LOCAL_PROGRESS_UPDATES_KEY = 'local_progress_updates_v1';
const TUTI_KEY = 'sheet_tuti_v1';
const LOCAL_TUTI_UPDATES_KEY = 'local_tuti_updates_v1';

let memCacheKhuVucList: any[] | null = null;
let memCacheMatKetNoiList: any[] | null = null;
let memCacheChiTietMKNList: any[] | null = null;
let memCacheSangTaiList: any[] | null = null;
let memCacheKhoList: any[] | null = null;
let memCacheVTTBList: any[] | null = null;

let memoryCache: Record<string, string | null> = {};

export const initDB = async () => {
    const keys = [
      STORAGE_KEY, SCRIPT_URL_KEY, TEAMS_KEY, MEMBERS_KEY, STATIONS_KEY,
      DINHMUC_KEY, PROGRESS_KEY, LOCAL_PROGRESS_UPDATES_KEY, TUTI_KEY,
      LOCAL_TUTI_UPDATES_KEY, 'sheet_khuvuc_v1', 'sheet_matketnoi_v1',
      'sheet_chitietmkn_v1', 'sheet_sangtai_v1', 'sheet_kho_v1', 'sheet_vttb_v1', 'config_exclude_saturday', 'config_exclude_sunday', 'config_exclude_nghi'
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
    set(key, value).then(() => {
        try { localStorage.removeItem(key); } catch (e) {} // Clean up old copies
    }).catch(e => console.warn('IDB quota exceeded for key', key));
};

const safeGetItem = (key: string): string | null => {
    // Check if we have it in memCache, if not, try to read from localStorage gracefully just in case
    if (memoryCache[key] !== undefined) return memoryCache[key];
    try {
        return localStorage.getItem(key);
    } catch { return null; }
};

export const DataStore = {
  initDB: initDB,
  getAppScriptUrl: () => { 
      const url = safeGetItem(SCRIPT_URL_KEY);
      return url ? url.trim() : 'https://script.google.com/macros/s/AKfycbzpw3SlqJxXYC29qjPRqH8ehfJp764bNvQFUzqIgMW_rMrpitMKvvRvWbbGrP505Sdi/exec';
  },
  setAppScriptUrl: (url: string) => safeSetItem(SCRIPT_URL_KEY, url),

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
  getExcludeNghi: () => {
      const val = safeGetItem('config_exclude_nghi');
      return val !== 'false'; // Default is true (không tính)
  },
  setExcludeNghi: (val: boolean) => safeSetItem('config_exclude_nghi', val ? 'true' : 'false'),

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
         const sheetId = localStorage.getItem('SPREADSHEET_ID') || "1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ";
         const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("DCU")}&_=${Date.now()}`);
         if (!res.ok) return [];
         const text = await res.text();
         if (text.includes('<html')) return [];
         
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
                 user: findKey(['User', 'Người cập nhật', 'user', 'Người thực hiện', 'Nhân viên', 'Người được giao'])
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
  
  uploadImageToDrive: async (base64: string, fileName: string, mimeType: string) => {
     try {
         const url = DataStore.getAppScriptUrl();
         // we need to use cors to get the response JSON, but Apps Script might not return CORS properly if not deployed as Web App with 'Anyone' access.
         // Usually Apps script web apps deployed as "Execute as: me", "Who has access: anyone" do return CORS if configured, but fetch handles follow-redirects.
         // wait, previously we used 'no-cors' for POSTs to Apps Script because of CORS issues.
         // If we use no-cors, we can't read the response to get the URL!
         // Let's try 'cors' first. 
         const res = await fetch(url, {
             method: 'POST',
             // mode: 'cors', // Let's omit mode, let fetch default or use cors
             headers: { 'Content-Type': 'text/plain;charset=utf-8' },
             body: JSON.stringify({
                 action: 'upload_image', base64, fileName, mimeType
             })
         });
         const json = await res.json();
         if (json.status === 'success') return json.url;
         throw new Error(json.message || 'Upload failed');
     } catch(e) {
         console.error('Lỗi upload ảnh:', e);
         throw e;
     }
  },

  getXuLyDoXa: async () => {
     try {
         const sheetId = localStorage.getItem('SPREADSHEET_ID') || "1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ";
         const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("XuLyDoXa")}&_=${Date.now()}`);
         if (!res.ok) return [];
         const text = await res.text();
         if (text.includes('<html')) return [];
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
         const sheetId = json.spreadsheetId || "1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ";
         // Lấy MSNV và Nhóm từ CSV
         try {
            let cbcnvMap = new Map<string, {msnv: string, role: string}>();
            try {
               const cbcnvRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('CBCNV')}`);
               const csvText = await cbcnvRes.text();
               if (!csvText.includes('<html')) {
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
               console.error("Error reading CBCNV sheet for MSNV", e);
            }

            let ctText = '';
            let newMembers: any[] = [];
            let newTeams = new Set<string>();

            // Bắt buộc lấy danh sách tên, nhóm từ sheet CongTac
            try {
               const ctSheets = ['CongTac', 'Cong Tac', 'Công tác', 'Công Tác', 'Con Tác'];
               for (const sheetName of ctSheets) {
                   const ctRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`);
                   const tempText = await ctRes.text();
                   if (!tempText.includes('<html') && tempText.trim() && tempText.length > 50) {
                      ctText = tempText;
                      break;
                   }
               }
               
               if (ctText) {
                   const ctData = Papa.parse(ctText, { header: false }).data;
                   let headerRowIdx = -1;
                   let nameColIdx = -1;
                   let msnvColIdx = -1;
                   let teamColIdx = 5;
                   
                   for(let r=0; r<5; r++) {
                       if(ctData[r]) {
                           const rowData = ctData[r] as string[];
                           for(let c=0; c<rowData.length; c++) {
                               const val = String(rowData[c] || '').toLowerCase().trim();
                               if (val.includes('họ và tên') || val === 'họ tên') {
                                   headerRowIdx = r;
                                   nameColIdx = c;
                               }
                               if (val.includes('mã nhân viên') || val.includes('msnv') || val.includes('mật khẩu') || val.includes('password')) {
                                   msnvColIdx = c;
                               }
                               if(val.includes('khu vực') || val.includes('khu vuc') || val === 'tổ công tác') {
                                   teamColIdx = c;
                               }
                           }
                       }
                       if(headerRowIdx !== -1) break;
                   }

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

                          newMembers.push({
                              name: rawName,
                              team: finalTeam,
                              msnv: memberMsnv,
                              role: cbcnvInfo.role
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
               const progRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("Tiến độ")}`);
               const progText = await progRes.text();
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
            } catch (e) {
               console.error('Error fetching Progress sheet', e);
            }

            // Fetch DinhMuc via CSV
            try {
               const dmSheets = ['DinhMuc', 'Định Mức', 'Dinh muc', 'Định mức'];
               for (const sheetName of dmSheets) {
                  const dmRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`);
                  const dmText = await dmRes.text();
                  if (!dmText.includes('<html') && dmText.trim() && dmText.length > 50) {
                     const dmData: any[] = Papa.parse(dmText, { header: true }).data as any[];
                     const newDinhMuc: any[] = [];
                     if (dmData && dmData.length > 0) {
                         const firstRow = dmData[0];
                         const keys = Object.keys(firstRow);
                         const nameKey = keys.find(k => {
                             const nk = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
                             return nk.includes('noi dung') || nk.includes('ten');
                         });
                         const quotaKey = keys.find(k => {
                             const nk = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
                             return nk.includes('dinh muc') || nk.includes('quota') || nk.includes('diem');
                         });
                         const groupKey = keys.find(k => {
                             const nk = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
                             return nk.includes('chung nhom');
                         });
                         const relationKey = keys.find(k => {
                             const nk = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
                             return nk.includes('quan he');
                         });
                         
                         if (nameKey) {
                             for (const row of dmData) {
                                 const val1 = String(row[nameKey] || '').trim();
                                 let quotaStr = String(row[quotaKey] || '0').replace(/,/g, '.');
                                 let val2 = parseFloat(quotaStr);
                                 if (isNaN(val2)) val2 = 0;
                                 
                                 
                                 let isGroupStr = groupKey ? String(row[groupKey] || '').toLowerCase().trim() : '';
                                 let isGroup = isGroupStr === 'x';
                                 
                                 let history: Record<string, number> = {};
                                 keys.forEach(k => {
                                     if (k.toLowerCase().includes('tháng') || k.toLowerCase().includes('thang') || /\d+\/\d{4}/.test(k)) {
                                         let hVal = parseFloat(String(row[k] || '0').replace(/,/g, '.'));
                                         if (!isNaN(hVal)) history[k.trim()] = hVal;
                                     }
                                 });

                                 let relation = relationKey ? String(row[relationKey] || '').trim() : '';
                                 if (val1 && val1.toLowerCase() !== 'stt') {
                                     newDinhMuc.push({ name: val1, quota: val2, isGroup, history, relation });
                                 }
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
               console.error('Error fetching DinhMuc', e);
            }

            // Fetch TUTI via CSV
            if (!json.tuti || json.tuti.length === 0) {
               try {
                  const tutiRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("TUTI")}`);
                  const tutiText = await tutiRes.text();
                  if (!tutiText.includes('<html') && tutiText.trim()) {
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
                  console.error('Error fetching TUTI', e);
               }
            }

            // Fetch MatKetNoi
            try {
               const mknRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("MatKetNoi")}`);
               const mknText = await mknRes.text();
               if (!mknText.includes('<html')) {
                   const { data, meta } = Papa.parse(mknText, { header: true, skipEmptyLines: true });
                   const keys = meta.fields || [];
                   
                   const normalizeCol = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[\s_]+/g, '');
                   const docKey = keys.find(k => normalizeCol(k).includes('madiemdo') || normalizeCol(k).includes('maddo'));
                   const actualKey = docKey || keys[0];
                   
                   if (actualKey) {
                       const matKetNoiList = data.map((row: any) => {
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
                       try {
                           safeSetItem('sheet_matketnoi_v1', JSON.stringify(matKetNoiList));
                       } catch(e) {
                           console.warn("localStorage quota exceeded for MatKetNoi");
                       }
                   }
               }
            } catch (e) {
               console.error('Error fetching MatKetNoi:', e);
            }

            // Fetch ChiTietMKN
            try {
               const chiTietRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("ChiTietMKN")}`);
               const chiTietText = await chiTietRes.text();
               if (!chiTietText.includes('<html')) {
                   const { data } = Papa.parse(chiTietText, { header: true, skipEmptyLines: true });
                   
                   if (data && data.length > 0) {
                       memCacheChiTietMKNList = data;
                       try {
                           safeSetItem('sheet_chitietmkn_v1', JSON.stringify(data));
                       } catch(e) {
                           console.warn("localStorage quota exceeded for ChiTietMKN");
                       }
                   }
               }
            } catch (e) {
               console.error('Error fetching ChiTietMKN:', e);
            }

            // Fetch KhuVuc
            try {
               const kvRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("KhuVuc")}`);
               const kvText = await kvRes.text();
               if (!kvText.includes('<html')) {
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
                       const khuVucList = data.map((row: any) => ({
                           ...row,
                           MA_DDO: String(row[actualMaDdo] || '').trim(),
                           TO_QL: String(row[actualTql] || '').trim() || 'Khác',
                       })).filter(r => r.MA_DDO);
                       memCacheKhuVucList = khuVucList;
                       try {
                           safeSetItem('sheet_khuvuc_v1', JSON.stringify(khuVucList));
                       } catch(e) {
                           console.warn("localStorage quota exceeded for KhuVuc");
                       }
                   }
               }
            } catch(e) {
               console.error('Error fetching KhuVuc:', e);
            }

            // Fetch SangTai
            try {
               const stRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("SangTai")}`);
               const stText = await stRes.text();
               if (!stText.includes('<html')) {
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
               console.error('Error fetching SangTai:', e);
            }

            // Fetch Kho
            try {
               const khoRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("Kho")}`);
               const khoText = await khoRes.text();
               if (!khoText.includes('<html')) {
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
               console.error('Error fetching Kho:', e);
            }

            // Fetch VTTB
            try {
               const vttbRes = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("VTTB")}`);
               const vttbText = await vttbRes.text();
               if (!vttbText.includes('<html')) {
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
               console.error('Error fetching VTTB:', e);
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
     if (memCacheMatKetNoiList) return memCacheMatKetNoiList;
     try {
       const cached = safeGetItem('sheet_matketnoi_v1');
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
  },

  getChiTietMKN: (): any[] => {
     if (memCacheChiTietMKNList) return memCacheChiTietMKNList;
     try {
       const cached = safeGetItem('sheet_chitietmkn_v1');
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
  },

  getKhuVuc: (): any[] => {
     if (memCacheKhuVucList) return memCacheKhuVucList;
     try {
       const cached = safeGetItem('sheet_khuvuc_v1');
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
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

  getDinhMuc: (): { name: string; quota: number; isGroup?: boolean; history?: Record<string, number>; relation?: string }[] => {
     try {
       const cached = safeGetItem(DINHMUC_KEY);
       return cached ? JSON.parse(cached) : [];
     } catch { return []; }
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
     try {
       localStorage.setItem(TUTI_KEY, JSON.stringify(entries));
     } catch(e) {}
     await DataStore.syncTutiToSheet(entry);
     return entry;
  },

  updateTutiEntry: async (id: string, updates: Partial<TutiEntry>) => {
     const entries = DataStore.getTutiEntries();
     const index = entries.findIndex(e => e.id === id);
     if (index !== -1) {
         entries[index] = { ...entries[index], ...updates };
         try {
           localStorage.setItem(TUTI_KEY, JSON.stringify(entries));
         } catch(e) {}
         await DataStore.syncTutiToSheet(entries[index]);
     }
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
  }
};
