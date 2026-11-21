import express from "express";
import path from "path";
import fs from "fs";
import Papa from "papaparse";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API route for version info (always no-cache to ensure clients detect new releases immediately)
  const CANONICAL_APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFzMY2hA8LOgPix7FoN0n9nB3LAUlhuppc5KopO_ZD0fYU-uj4gpAZn5FnedGWr5vg2A/exec";
  const CANONICAL_SPREADSHEET_ID = "1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ";

  // Cache for sheet name -> gid mapping to prevent gviz active-filter truncation
  const gidCache = new Map<string, { map: Record<string, string>; timestamp: number }>();

  // Known fallback GIDs for default spreadsheet
  const KNOWN_GIDS: Record<string, string> = {
    'quahan': '934231421',
    'quahan_nam': '1033408965',
    'quahannam': '1033408965',
    'tu': '790591569',
    'tu_nam': '496168149',
    'tunam': '496168149',
    'ti': '602741776',
    'ti_nam': '569727721',
    'tinam': '569727721',
    'tuti': '1705590920',
    'kthtdd': '407625431',
    'tiến độ': '917699178',
    'định mức': '936341266',
    'congtac': '85248088',
    'dvkh': '110014365',
    'khuvuc': '945183392',
    'xulydoxa': '1559330970',
    'dcu': '1436390261',
    'sangtai': '2131392389',
    'kho': '230876420',
    'vttb': '1481390126',
    'cbcnv': '1318742136',
    '963': '1690879549'
  };

  async function getGidForSheet(sheetId: string, sheetName: string): Promise<string | null> {
    const cleanName = sheetName.trim().toLowerCase();
    const cached = gidCache.get(sheetId);
    if (cached && Date.now() - cached.timestamp < 300000 && cached.map[cleanName]) {
      return cached.map[cleanName];
    }
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const text = await res.text();
        const map: Record<string, string> = {};
        const regex = /items\.push\({\s*name:\s*"([^"]+)",[^}]+gid:\s*"([0-9]+)"/g;
        let m;
        while ((m = regex.exec(text)) !== null) {
          map[m[1].toLowerCase()] = m[2];
          map[m[1]] = m[2];
        }
        gidCache.set(sheetId, { map, timestamp: Date.now() });
        if (map[cleanName]) return map[cleanName];
      }
    } catch(e) {}
    return KNOWN_GIDS[cleanName] || null;
  }

  // Shared server configuration (synchronizes Apps Script URL and Spreadsheet ID across all devices)
  const sharedConfigPath = path.join(process.cwd(), 'shared_config.json');

  const getSharedConfig = () => {
    try {
      if (fs.existsSync(sharedConfigPath)) {
        const parsed = JSON.parse(fs.readFileSync(sharedConfigPath, 'utf8'));
        // If config is not explicitly flagged as custom by admin, keep it synchronized with canonical URL
        if (!parsed.isCustom) {
          parsed.appScriptUrl = CANONICAL_APP_SCRIPT_URL;
          parsed.spreadsheetId = CANONICAL_SPREADSHEET_ID;
        }
        parsed.canonicalAppScriptUrl = CANONICAL_APP_SCRIPT_URL;
        parsed.canonicalSpreadsheetId = CANONICAL_SPREADSHEET_ID;
        return parsed;
      }
    } catch (e) {}
    return {
      spreadsheetId: CANONICAL_SPREADSHEET_ID,
      appScriptUrl: CANONICAL_APP_SCRIPT_URL,
      canonicalAppScriptUrl: CANONICAL_APP_SCRIPT_URL,
      canonicalSpreadsheetId: CANONICAL_SPREADSHEET_ID,
      isCustom: false
    };
  };

  // API route for version info (always no-cache to ensure clients detect new releases immediately)
  const getVersionData = () => {
    let data: any = { version: "2026.11.05.1" };
    const candidatePaths = [
      path.join(process.cwd(), 'version.json'),
      path.join(process.cwd(), 'public', 'version.json'),
      path.join(process.cwd(), 'dist', 'version.json'),
    ];
    for (const vPath of candidatePaths) {
      try {
        if (fs.existsSync(vPath)) {
          data = JSON.parse(fs.readFileSync(vPath, 'utf8'));
          break;
        }
      } catch (e) {}
    }
    const cfg = getSharedConfig();
    return {
      ...data,
      appScriptUrl: cfg.appScriptUrl || CANONICAL_APP_SCRIPT_URL,
      spreadsheetId: cfg.spreadsheetId || CANONICAL_SPREADSHEET_ID,
      canonicalAppScriptUrl: CANONICAL_APP_SCRIPT_URL,
      canonicalSpreadsheetId: CANONICAL_SPREADSHEET_ID
    };
  };

  app.get(["/api/version", "/version.json"], (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.json(getVersionData());
  });

  const saveSharedConfig = (data: Partial<{ spreadsheetId: string; appScriptUrl: string; isCustom?: boolean }>) => {
    try {
      const cur = getSharedConfig();
      const updated = {
        ...cur,
        ...(data.spreadsheetId ? { spreadsheetId: data.spreadsheetId } : {}),
        ...(data.appScriptUrl ? { appScriptUrl: data.appScriptUrl } : {}),
        ...(data.isCustom !== undefined ? { isCustom: data.isCustom } : {}),
        canonicalAppScriptUrl: CANONICAL_APP_SCRIPT_URL,
        canonicalSpreadsheetId: CANONICAL_SPREADSHEET_ID,
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(sharedConfigPath, JSON.stringify(updated, null, 2), 'utf8');
      return updated;
    } catch (e) {
      console.warn('Could not save shared config:', e);
      return null;
    }
  };

  app.get("/api/config", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json(getSharedConfig());
  });

  app.post("/api/config", (req, res) => {
    const { spreadsheetId, appScriptUrl, isCustom } = req.body || {};
    const updated = saveSharedConfig({ spreadsheetId, appScriptUrl, isCustom });
    res.json({ success: !!updated, config: updated });
  });

  // Centralized proxy for Google Apps Script to eliminate client CORS and multi-device connection issues
  app.post("/api/proxy/apps-script", async (req, res) => {
    try {
      const cfg = getSharedConfig();
      const targetUrl = (req.body && req.body._targetUrl) || cfg.appScriptUrl;
      if (!targetUrl || !targetUrl.startsWith('http')) {
        res.status(400).json({ success: false, error: 'Chưa cấu hình URL Google Apps Script trên hệ thống' });
        return;
      }

      const payload = { ...req.body };
      delete payload._targetUrl;

      const gRes = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      const text = await gRes.text();
      try {
        const json = JSON.parse(text);
        res.json(json);
      } catch {
        res.send(text);
      }
    } catch (err: any) {
      console.warn("Apps Script proxy error:", err);
      res.status(500).json({ success: false, error: err.message || 'Lỗi kết nối tới Google Apps Script' });
    }
  });

  // =========================================================================
  // REAL-TIME DVKH LIVE STORE & MULTI-DEVICE INSTANT SYNCHRONIZATION HUB
  // =========================================================================
  const dvkhStorePath = path.join(process.cwd(), 'dvkh_live_store.json');

  type CanonicalDvkhStatus = 'Chưa giao' | 'Chờ nhận' | 'Đã Nhận' | 'Đã Giao thi công' | 'Trở ngại' | 'Xong';

  interface PendingDvkhSave {
    item: any;
    ts: number;
    sheetSynced: boolean;
  }

  interface DvkhLiveStore {
    version: number;
    items: any[];
    pendingSaves: Record<string, PendingDvkhSave>;
    deletedTombstones: Record<string, number>;
    lastSheetSyncAt: number;
    updatedAt: string;
  }

  let dvkhStore: DvkhLiveStore = {
    version: 1,
    items: [],
    pendingSaves: {},
    deletedTombstones: {},
    lastSheetSyncAt: 0,
    updatedAt: new Date().toISOString()
  };

  const normKeyServer = (k: any): string =>
    String(k || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/[\s_]+/g, '');

  const normalizeDvkhStatusServer = (
    rawStatus?: string,
    ketQua?: string,
    ngayGiao?: string,
    nguoiThucHien?: string,
    ngayNhan?: string,
    nguoiNhan?: string
  ): CanonicalDvkhStatus => {
    const normStatus = normKeyServer(rawStatus);
    const normKq = normKeyServer(ketQua);

    if (normStatus === 'xong' || normStatus.includes('hoantat') || normStatus.includes('hoanthanh') || normKq === 'xong') {
      return 'Xong';
    }
    if (normStatus.includes('trongai') || normKq === 'chua') {
      return 'Trở ngại';
    }
    if (normStatus.includes('giaothicong') || normStatus === 'dagiao') {
      return 'Đã Giao thi công';
    }
    if (normStatus === 'danhan' || normStatus === 'datiepnhan' || normStatus.includes('datiepnhan')) {
      return 'Đã Nhận';
    }
    if (normStatus === 'chonhan' || normStatus === 'chotiepnhan' || normStatus.includes('chotiepnhan')) {
      return 'Chờ nhận';
    }
    if (normStatus === 'chuagiao' || normStatus === 'chogiao') {
      return 'Chưa giao';
    }
    if (!String(rawStatus || '').trim()) {
      if (String(ngayGiao || '').trim() && String(nguoiThucHien || '').trim()) return 'Đã Giao thi công';
      if (String(ngayNhan || '').trim() && String(nguoiNhan || '').trim()) return 'Đã Nhận';
      if (String(ngayNhan || '').trim()) return 'Chờ nhận';
    }
    return 'Chưa giao';
  };

  const normalizeDvkhRecordServer = (raw: any, fallbackStt?: number): any | null => {
    const maKh = String(raw?.maKh || '').trim();
    if (!maKh) return null;
    const ketQuaRaw = String(raw?.ketQua || '').trim();
    const kqLow = normKeyServer(ketQuaRaw);
    const ketQua: 'Chưa' | 'Xong' | '' = kqLow.includes('xong') ? 'Xong' : (kqLow.includes('chua') ? 'Chưa' : '');
    const ngayNhan = String(raw?.ngayNhan || '').trim();
    const nguoiNhan = String(raw?.nguoiNhan || '').trim();
    const ngayGiao = String(raw?.ngayGiao || '').trim();
    const nguoiThucHien = String(raw?.nguoiThucHien || '').trim();
    const trangThai = normalizeDvkhStatusServer(
      raw?.trangThai,
      ketQua,
      ngayGiao,
      nguoiThucHien,
      ngayNhan,
      nguoiNhan
    );
    const parsedStt = typeof raw?.stt === 'number' ? raw.stt : parseInt(String(raw?.stt || 0).trim(), 10);
    return {
      stt: (!isNaN(parsedStt) && parsedStt > 0) ? parsedStt : (fallbackStt || 1),
      maKh,
      tenKh: String(raw?.tenKh || 'Khách hàng').trim(),
      diaChi: String(raw?.diaChi || '').trim(),
      sdt: String(raw?.sdt || '').trim(),
      pic: String(raw?.pic || '').trim(),
      khuVuc: String(raw?.khuVuc || '').trim(),
      ngayNhan,
      nguoiNhan,
      ngayGiao,
      nguoiGiao: '',
      nguoiThucHien,
      ngayHoanTat: String(raw?.ngayHoanTat || '').trim(),
      ketQua,
      ghiChu: String(raw?.ghiChu || '').trim(),
      trangThai,
      loaiYeuCau: String(raw?.loaiYeuCau || raw?.loai || 'Gắn mới').trim(),
      ngayTao: String(raw?.ngayTao || '').trim(),
      nguoiTao: String(raw?.nguoiTao || '').trim()
    };
  };

  const parseDvkhCsvServer = (csvText: string): any[] => {
    if (!csvText || csvText.includes('<html')) return [];
    const parsed = Papa.parse(csvText, { header: false, skipEmptyLines: true });
    const allRows = (parsed.data as any[]) || [];
    if (allRows.length === 0) return [];

    let headerRowIdx = 0;
    for (let r = 0; r < Math.min(10, allRows.length); r++) {
      const rowNorm = (allRows[r] || []).map((c: any) => normKeyServer(c)).join(' ');
      if (rowNorm.includes('makh') || (rowNorm.includes('ma') && rowNorm.includes('ten'))) {
        headerRowIdx = r;
        break;
      }
    }

    const headers = (allRows[headerRowIdx] || []).map((c: any) => String(c || '').trim());
    const rows = allRows.slice(headerRowIdx + 1);
    const seen = new Set<string>();
    const results: any[] = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const rArr = rows[idx] as any[];
      const rowObj: Record<string, any> = {};
      headers.forEach((h: string, cIdx: number) => {
        if (h) rowObj[h] = rArr[cIdx];
      });
      const keys = Object.keys(rowObj);
      const getVal = (aliases: string[]) => {
        for (const alias of aliases) {
          const normAlias = normKeyServer(alias);
          for (const k of keys) {
            if (normKeyServer(k) === normAlias) {
              return String(rowObj[k] || '').trim();
            }
          }
        }
        return '';
      };

      const maKh = getVal(['makh', 'ma khach hang', 'ma kh', 'ma_kh', 'ma', 'shs', 'so ho so']);
      const key = maKh.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);

      const sttRaw = getVal(['stt', 'so thu tu', 'so_thu_tu', 'sothutu', 'sott', 'tt', 'stt_hs', 'sttkh', 'thu tu']);
      const tenKh = getVal(['tenkh', 'ten khach hang', 'ten kh', 'ho va ten', 'ho ten', 'ten']);
      const diaChi = getVal(['diachi', 'dia chi khach hang', 'dia chi']);
      const loaiYeuCau = getVal(['loai', 'loaiyeucau', 'loai yeu cau', 'yeu cau', 'loai hs', 'loaiyeucauhs']);
      const ngayNhan = getVal(['ngaynhan', 'ngay nhan', 'ngay tiep nhan', 'ngaytiepnhan']);
      const nguoiNhan = getVal(['nguoinhan', 'nguoi nhan', 'nguoi tiep nhan', 'nguoitiepnhan', 'lanh dao nhan', 'lanhdaonhan']);
      const ngayGiao = getVal(['ngaygiao', 'ngay giao', 'ngay phan cong', 'ngayphancong']);
      const nguoiThucHien = getVal(['nguoithuchien', 'nguoi thuc hien', 'nhan vien thuc hien', 'nhanvienthuchien', 'nhan vien', 'nhanvien', 'nguoi thi cong', 'nguoithicong', 'nhan vien thi cong', 'nhanvienthicong', 'ky thuat vien', 'kythuatvien', 'nguoith', 'nvth']);
      const ngayHoanTat = getVal(['ngayhoantat', 'ngay hoan tat', 'ngay xong', 'ngay hoan thanh']);
      const ketQua = getVal(['ketqua', 'ket qua']);
      let ghiChu = getVal(['ghichu', 'ghi chu', 'noi dung ghi chu', 'tro ngai', 'noidungghichu', 'ghi chu tro ngai']);
      const trangThaiRaw = getVal(['trangthai', 'trang thai', 'tinh trang', 'tinhtrang', 'trang thai ho so', 'trangthaihoso']);
      const sdt = getVal(['sdt', 'so dien thoai', 'dien thoai', 'phone', 'tel']);
      const pic = getVal(['pic', 'hinhanh', 'hinh anh', 'anh', 'anh chung minh', 'anh tro ngai', 'anhtrongai']);
      const khuVuc = getVal(['khuvuc', 'khu vuc', 'phuong xa', 'phuongxa', 'dia ban', 'diaban']);
      const ngayTao = getVal(['ngaytao', 'ngay tao']);
      const nguoiTao = getVal(['nguoitao', 'nguoi tao']);

      const normTt = normKeyServer(trangThaiRaw);
      const isRecognizedStatus =
        !trangThaiRaw ||
        normTt.includes('xong') ||
        normTt.includes('hoantat') ||
        normTt.includes('hoanthanh') ||
        normTt.includes('trongai') ||
        normTt.includes('giaothicong') ||
        normTt.includes('dagiao') ||
        normTt.includes('danhan') ||
        normTt.includes('datiepnhan') ||
        normTt.includes('chonhan') ||
        normTt.includes('chotiepnhan') ||
        normTt.includes('chuagiao') ||
        normTt.includes('chogiao');
      if (!isRecognizedStatus && !ghiChu && trangThaiRaw) {
        ghiChu = trangThaiRaw;
      }

      const normalized = normalizeDvkhRecordServer(
        {
          stt: sttRaw,
          maKh,
          tenKh,
          diaChi,
          sdt,
          pic,
          khuVuc,
          ngayNhan,
          nguoiNhan,
          ngayGiao,
          nguoiGiao: '',
          nguoiThucHien,
          ngayHoanTat,
          ketQua,
          ghiChu,
          trangThai: isRecognizedStatus ? trangThaiRaw : '',
          loaiYeuCau,
          ngayTao,
          nguoiTao
        },
        idx + 1
      );
      if (normalized) results.push(normalized);
    }

    return results;
  };

  const loadDvkhStore = () => {
    try {
      if (fs.existsSync(dvkhStorePath)) {
        const raw = fs.readFileSync(dvkhStorePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items)) {
          const seen = new Set<string>();
          const cleaned: any[] = [];
          for (let i = 0; i < parsed.items.length; i++) {
            const norm = normalizeDvkhRecordServer(parsed.items[i], i + 1);
            if (!norm) continue;
            const k = norm.maKh.toLowerCase();
            if (!seen.has(k)) {
              seen.add(k);
              cleaned.push(norm);
            }
          }
          dvkhStore = {
            version: Number(parsed.version) || 1,
            items: cleaned,
            pendingSaves: (parsed.pendingSaves && typeof parsed.pendingSaves === 'object') ? parsed.pendingSaves : {},
            deletedTombstones: (parsed.deletedTombstones && typeof parsed.deletedTombstones === 'object') ? parsed.deletedTombstones : {},
            lastSheetSyncAt: Number(parsed.lastSheetSyncAt) || 0,
            updatedAt: parsed.updatedAt || new Date().toISOString()
          };
        }
      }
    } catch (e) {
      console.warn('Could not load dvkh_live_store.json:', e);
    }
  };
  loadDvkhStore();

  const saveDvkhStore = () => {
    try {
      fs.writeFileSync(dvkhStorePath, JSON.stringify(dvkhStore, null, 2), 'utf8');
    } catch (e) {
      console.warn('Could not write dvkh_live_store.json:', e);
    }
  };

  // Connected SSE clients for instantaneous push to all active browsers
  const sseClients = new Set<express.Response>();

  const broadcastDvkhEvent = (eventData: any) => {
    const dataStr = `data: ${JSON.stringify(eventData)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(dataStr);
      } catch (err) {
        sseClients.delete(client);
      }
    }
  };

  // Fetch canonical DVKH CSV directly from Google Sheets and reconcile dvkhStore
  let dvkhReconcileInFlight: Promise<void> | null = null;
  const reconcileDvkhStoreWithSheet = async (forceRefresh = false): Promise<void> => {
    if (!forceRefresh && dvkhStore.items.length > 0 && Date.now() - dvkhStore.lastSheetSyncAt < 10000) {
      return;
    }
    if (dvkhReconcileInFlight) {
      return dvkhReconcileInFlight;
    }

    dvkhReconcileInFlight = (async () => {
      try {
        const cfg = getSharedConfig();
        const sheetId = cfg.spreadsheetId || CANONICAL_SPREADSHEET_ID;
        const gid = (await getGidForSheet(sheetId, 'DVKH')) || KNOWN_GIDS['dvkh'] || '110014365';

        let csvText = '';
        const candidateUrls = [
          `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}&_t=${Date.now()}`,
          `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=DVKH&_t=${Date.now()}`
        ];

        for (const url of candidateUrls) {
          try {
            const resp = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            if (resp.ok) {
              const txt = await resp.text();
              if (txt && !txt.includes('<html') && txt.trim().length > 20) {
                csvText = txt;
                break;
              }
            }
          } catch {}
        }

        if (!csvText) return;

        const sheetItems = parseDvkhCsvServer(csvText);
        if (sheetItems.length === 0) return;

        const now = Date.now();
        const sheetMap = new Map<string, any>();
        for (const it of sheetItems) {
          sheetMap.set(it.maKh.toLowerCase(), it);
        }

        // 1. Prune tombstones that are already absent from Sheet OR expired (> 120s)
        const nextTombstones: Record<string, number> = {};
        for (const [k, delTs] of Object.entries(dvkhStore.deletedTombstones || {})) {
          if (sheetMap.has(k) && now - Number(delTs) < 120000) {
            nextTombstones[k] = Number(delTs);
          }
        }
        dvkhStore.deletedTombstones = nextTombstones;

        // 2. Reconcile pendingSaves (keep only fresh unpropagated edits within 90s/300s)
        const nextPending: Record<string, PendingDvkhSave> = {};
        for (const [k, p] of Object.entries(dvkhStore.pendingSaves || {})) {
          if (nextTombstones[k]) continue;
          const age = now - Number(p.ts || 0);
          const maxHold = p.sheetSynced ? 25000 : 180000;
          const sItem = sheetMap.get(k);
          if (age < maxHold) {
            // If Sheet already reflects the exact state, we can retire this pending override immediately
            const matchesSheet = sItem &&
              String(sItem.trangThai || '') === String(p.item?.trangThai || '') &&
              String(sItem.nguoiNhan || '') === String(p.item?.nguoiNhan || '') &&
              String(sItem.nguoiThucHien || '') === String(p.item?.nguoiThucHien || '') &&
              String(sItem.ketQua || '') === String(p.item?.ketQua || '');
            if (!matchesSheet) {
              nextPending[k] = p;
            }
          }
        }
        dvkhStore.pendingSaves = nextPending;

        // 3. Build canonical item list: active new pending items + canonical Sheet items (with active pending overlays)
        const finalItems: any[] = [];
        const seen = new Set<string>();

        for (const [k, p] of Object.entries(nextPending)) {
          if (!sheetMap.has(k) && !nextTombstones[k]) {
            const normP = normalizeDvkhRecordServer(p.item);
            if (normP) {
              finalItems.push(normP);
              seen.add(k);
            }
          }
        }

        for (const sItem of sheetItems) {
          const k = sItem.maKh.toLowerCase();
          if (seen.has(k) || nextTombstones[k]) continue;
          seen.add(k);
          const pending = nextPending[k];
          if (pending && pending.item) {
            const merged = normalizeDvkhRecordServer({ ...sItem, ...pending.item }, sItem.stt);
            finalItems.push(merged || sItem);
          } else {
            finalItems.push(sItem);
          }
        }

        const prevSerialized = JSON.stringify(dvkhStore.items);
        const nextSerialized = JSON.stringify(finalItems);
        dvkhStore.lastSheetSyncAt = now;

        if (prevSerialized !== nextSerialized) {
          dvkhStore.items = finalItems;
          dvkhStore.version++;
          dvkhStore.updatedAt = new Date().toISOString();
          saveDvkhStore();
          broadcastDvkhEvent({
            type: 'dvkh_full_sync',
            version: dvkhStore.version,
            items: dvkhStore.items,
            timestamp: now
          });
        } else {
          saveDvkhStore();
        }
      } catch (err) {
        console.warn('reconcileDvkhStoreWithSheet error:', err);
      } finally {
        dvkhReconcileInFlight = null;
      }
    })();

    return dvkhReconcileInFlight;
  };

  // Reconcile immediately on startup (non-blocking) so disk store heals automatically
  reconcileDvkhStoreWithSheet(true).catch(() => {});

  // Asynchronously and safely forward updates to Google Apps Script
  const forwardDvkhToGoogleSheet = async (payload: { action: 'save_dvkh' | 'delete_dvkh'; items?: any[]; maKhs?: any[] }) => {
    try {
      const cfg = getSharedConfig();
      const targetUrl = cfg.appScriptUrl || CANONICAL_APP_SCRIPT_URL;
      if (!targetUrl || !targetUrl.startsWith('http')) {
        return false;
      }
      const bodyData = {
        sheetName: 'DVKH',
        spreadsheetId: cfg.spreadsheetId || CANONICAL_SPREADSHEET_ID,
        ...payload
      };
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(bodyData)
      });
      return res.ok;
    } catch (e) {
      console.warn('Background sync to Google Sheet error:', e);
      return false;
    }
  };

  // 1. SSE Real-time Endpoint
  app.get("/api/dvkh/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    sseClients.add(res);

    // Initial greeting with current version
    res.write(`data: ${JSON.stringify({ type: 'init', version: dvkhStore.version, count: dvkhStore.items.length })}\n\n`);

    // Keepalive ping every 15s to prevent timeouts through proxies and iframes
    const pingTimer = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch {
        clearInterval(pingTimer);
        sseClients.delete(res);
      }
    }, 15000);

    req.on("close", () => {
      clearInterval(pingTimer);
      sseClients.delete(res);
    });
  });

  // 2. Instant Sync Mutation Endpoint (Called whenever any user on any machine adds, edits, assigns, or deletes)
  app.post("/api/dvkh/sync", async (req, res) => {
    try {
      const { action, items, maKhs, senderId, skipSheetForward, sheetSynced } = req.body || {};
      const now = Date.now();

      if (action === 'mark_synced') {
        const keys = Array.isArray(maKhs) ? maKhs : [];
        let touched = false;
        for (const m of keys) {
          const k = String(m || '').trim().toLowerCase();
          if (k && dvkhStore.pendingSaves[k]) {
            dvkhStore.pendingSaves[k].sheetSynced = true;
            dvkhStore.pendingSaves[k].ts = now;
            touched = true;
          }
        }
        if (touched) saveDvkhStore();
        res.json({ success: true, version: dvkhStore.version, count: dvkhStore.items.length });
        return;
      }

      if (action === 'delete') {
        const targetKeys = new Set<string>(
          (Array.isArray(maKhs) ? maKhs : []).map((k: any) => String(k || '').trim().toLowerCase()).filter(Boolean)
        );
        if (targetKeys.size > 0) {
          dvkhStore.items = dvkhStore.items.filter((item: any) => !targetKeys.has(String(item.maKh || '').trim().toLowerCase()));
          for (const k of targetKeys) {
            delete dvkhStore.pendingSaves[k];
            dvkhStore.deletedTombstones[k] = now;
          }
        }
        dvkhStore.version++;
        dvkhStore.updatedAt = new Date().toISOString();
        saveDvkhStore();

        broadcastDvkhEvent({
          type: 'dvkh_change',
          action: 'delete',
          maKhs,
          version: dvkhStore.version,
          senderId,
          timestamp: now
        });

        if (!skipSheetForward) {
          forwardDvkhToGoogleSheet({
            action: 'delete_dvkh',
            maKhs
          }).catch(() => {});
        }

        res.json({ success: true, version: dvkhStore.version, count: dvkhStore.items.length });
        return;
      }

      // Default: 'save' / update
      const incomingItems = Array.isArray(items) ? items : (items ? [items] : []);
      if (incomingItems.length > 0) {
        const itemMap = new Map<string, number>();
        dvkhStore.items.forEach((item: any, idx: number) => {
          const k = String(item.maKh || '').trim().toLowerCase();
          if (k) itemMap.set(k, idx);
        });

        const normalizedIncoming: any[] = [];
        const newItems: any[] = [];
        for (const inc of incomingItems) {
          const normInc = normalizeDvkhRecordServer(inc);
          if (!normInc) continue;
          const k = normInc.maKh.toLowerCase();

          // If explicitly saved/re-added, clear any tombstone
          delete dvkhStore.deletedTombstones[k];
          dvkhStore.pendingSaves[k] = {
            item: normInc,
            ts: now,
            sheetSynced: Boolean(sheetSynced)
          };
          normalizedIncoming.push(normInc);

          if (itemMap.has(k)) {
            const existingIdx = itemMap.get(k)!;
            dvkhStore.items[existingIdx] = normalizeDvkhRecordServer(
              { ...dvkhStore.items[existingIdx], ...normInc },
              dvkhStore.items[existingIdx].stt
            );
          } else {
            newItems.push(normInc);
            itemMap.set(k, -1);
          }
        }

        if (newItems.length > 0) {
          dvkhStore.items = [...newItems, ...dvkhStore.items];
        }

        dvkhStore.version++;
        dvkhStore.updatedAt = new Date().toISOString();
        saveDvkhStore();

        broadcastDvkhEvent({
          type: 'dvkh_change',
          action: 'save',
          items: normalizedIncoming,
          version: dvkhStore.version,
          senderId,
          timestamp: now
        });

        if (!skipSheetForward && normalizedIncoming.length > 0) {
          forwardDvkhToGoogleSheet({
            action: 'save_dvkh',
            items: normalizedIncoming
          }).catch(() => {});
        }
      }

      res.json({ success: true, version: dvkhStore.version, count: dvkhStore.items.length });
    } catch (err: any) {
      console.warn('Error in /api/dvkh/sync:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Get Full Consolidated DVKH Dataset (auto-reconciled with Google Sheets)
  app.get("/api/dvkh/data", async (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const forceRefresh = req.query.refresh === '1' || req.query.force === '1';
    await reconcileDvkhStoreWithSheet(forceRefresh);
    res.json({
      version: dvkhStore.version,
      items: dvkhStore.items,
      updatedAt: dvkhStore.updatedAt,
      lastSheetSyncAt: dvkhStore.lastSheetSyncAt
    });
  });

  // Explicit force refresh endpoint
  app.post("/api/dvkh/refresh", async (req, res) => {
    await reconcileDvkhStoreWithSheet(true);
    res.json({
      success: true,
      version: dvkhStore.version,
      items: dvkhStore.items,
      updatedAt: dvkhStore.updatedAt,
      lastSheetSyncAt: dvkhStore.lastSheetSyncAt
    });
  });

  // 4. Fast Polling Endpoint (Fallback for mobile or reconnecting tabs)
  app.get("/api/dvkh/poll", async (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    await reconcileDvkhStoreWithSheet(false);
    const since = Number(req.query.since) || 0;
    if (dvkhStore.version > since) {
      res.json({
        hasUpdate: true,
        version: dvkhStore.version,
        items: dvkhStore.items,
        updatedAt: dvkhStore.updatedAt
      });
    } else {
      res.json({
        hasUpdate: false,
        version: dvkhStore.version
      });
    }
  });

  // =========================================================================
  // CENTRALIZED NHẬP ĐIỆN KẾ 963 STORE (MULTI-DEVICE INSTANT SYNCHRONIZATION)
  // =========================================================================
  const nhapDkStorePath = path.join(process.cwd(), 'nhap_dk_963_store.json');

  let nhapDkStore: any[] = [];

  const normalizeNhapDkChungLoai = (raw?: string, idHint?: string): string => {
    const s = String(raw || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .trim()
      .toLowerCase();
    const idL = String(idHint || '').trim().toLowerCase();

    const is3P =
      s.includes('3') ||
      s.includes('3p') ||
      idL.includes('3pha') ||
      idL.includes('3p');
    const isGT =
      s.includes('gian tiep') ||
      /\bgt\b/.test(s) ||
      s.includes('giantiep') ||
      idL.includes('gintip') ||
      idL.includes('giantiep') ||
      idL.includes('1pgt') ||
      idL.includes('3pgt');

    if (is3P) {
      if (isGT) {
        if (
          /\btt\b/.test(s) ||
          s.includes('trung') ||
          s.includes('giantieptt') ||
          idL.includes('gintiptt') ||
          idL.includes('giantieptt') ||
          idL.includes('3pgttt')
        ) {
          return '3 Pha Gián Tiếp TT';
        }
        return '3 Pha Gián Tiếp HT';
      }
      return '3 Pha Trực Tiếp';
    }
    return isGT ? '1 Pha Gián Tiếp' : '1 Pha Trực Tiếp';
  };

  // Helper deduplication by ID and compound business key (date + chungLoai + sl)
  const deduplicateNhapDkList = (items: any[]): any[] => {
    if (!Array.isArray(items)) return [];
    const seenId = new Map<string, any>();
    const seenBiz = new Map<string, any>();

    for (const it of items) {
      if (!it) continue;
      const ngay = String(it.ngay || it.Ngay || '').trim();
      const rawChungLoai = String(it.chungLoai || it.ChungLoai || '').trim();
      const sl = Math.max(0, parseInt(String(it.sl !== undefined ? it.sl : (it.SL || 0)).replace(/[^0-9]/g, ''), 10) || 0);
      const ghiChu = String(it.ghiChu || it.GhiChu || '').trim();
      const nguoiNhap = String(it.nguoiNhap || it.NguoiNhap || '').trim();
      let id = String(it.id || it.Id || '').trim();

      if (!ngay && !rawChungLoai && sl === 0) continue;

      const chungLoai = normalizeNhapDkChungLoai(rawChungLoai, id);

      if (!id) {
        const cleanDate = ngay.replace(/[^0-9]/g, '');
        const cleanLoai = chungLoai
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        id = `ndk_${cleanDate}_${cleanLoai}_${sl}`;
      }

      const bizKey = `${ngay}___${chungLoai.toLowerCase()}___${sl}`;

      if (seenId.has(id)) {
        const ex = seenId.get(id);
        if (!ex.nguoiNhap && nguoiNhap) ex.nguoiNhap = nguoiNhap;
        if (!ex.ghiChu && ghiChu) ex.ghiChu = ghiChu;
        continue;
      }

      if (seenBiz.has(bizKey)) {
        const ex = seenBiz.get(bizKey);
        if (!ex.nguoiNhap && nguoiNhap) ex.nguoiNhap = nguoiNhap;
        if (!ex.ghiChu && ghiChu) ex.ghiChu = ghiChu;
        if (id && !ex.id.startsWith('ndk_')) ex.id = id;
        continue;
      }

      const normalizedItem = {
        id,
        ngay,
        chungLoai,
        sl,
        ghiChu,
        nguoiNhap,
        timestamp: it.timestamp || Date.now(),
        isLocal: false
      };

      seenId.set(id, normalizedItem);
      seenBiz.set(bizKey, normalizedItem);
    }

    return Array.from(seenId.values());
  };

  const loadNhapDkStore = () => {
    try {
      if (fs.existsSync(nhapDkStorePath)) {
        const raw = fs.readFileSync(nhapDkStorePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const deduped = deduplicateNhapDkList(parsed);
          const changed = JSON.stringify(parsed.map(p => p?.chungLoai)) !== JSON.stringify(deduped.map(d => d?.chungLoai));
          nhapDkStore = deduped;
          if (changed) {
            fs.writeFileSync(nhapDkStorePath, JSON.stringify(nhapDkStore, null, 2), 'utf8');
          }
        }
      }
    } catch (e) {
      console.warn('Could not load nhap_dk_963_store.json:', e);
    }
  };
  loadNhapDkStore();

  const saveNhapDkStore = () => {
    try {
      nhapDkStore = deduplicateNhapDkList(nhapDkStore);
      fs.writeFileSync(nhapDkStorePath, JSON.stringify(nhapDkStore, null, 2), 'utf8');
    } catch (e) {
      console.warn('Could not write nhap_dk_963_store.json:', e);
    }
  };

  // Asynchronously forward to Google Apps Script
  const forwardNhapDkToGoogleSheet = async (items: any[]) => {
    try {
      const cfg = getSharedConfig();
      const targetUrl = cfg.appScriptUrl || CANONICAL_APP_SCRIPT_URL;
      if (!targetUrl || !targetUrl.startsWith('http')) return false;

      const bodyData = {
        action: 'save_nhap_dk_963',
        sheetName: 'NhapDK963',
        spreadsheetId: cfg.spreadsheetId || CANONICAL_SPREADSHEET_ID,
        items: items
      };

      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(bodyData)
      });
      return res.ok;
    } catch (e) {
      console.warn('Background sync NhapDK963 to Google Sheet error:', e);
      return false;
    }
  };

  app.get("/api/nhap-dk-963", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    loadNhapDkStore();
    res.json({ success: true, items: nhapDkStore });
  });

  app.post("/api/nhap-dk-963", async (req, res) => {
    try {
      const { action, items, item, id } = req.body || {};

      if (action === 'delete' && id) {
        loadNhapDkStore();
        nhapDkStore = nhapDkStore.filter((x: any) => x.id !== id);
        saveNhapDkStore();
        forwardNhapDkToGoogleSheet(nhapDkStore).catch(() => {});
        res.json({ success: true, count: nhapDkStore.length, items: nhapDkStore });
        return;
      }

      if (action === 'set_all' && Array.isArray(items)) {
        nhapDkStore = deduplicateNhapDkList(items);
        saveNhapDkStore();
        forwardNhapDkToGoogleSheet(nhapDkStore).catch(() => {});
        res.json({ success: true, count: nhapDkStore.length, items: nhapDkStore });
        return;
      }

      // Default: save / upsert
      loadNhapDkStore();
      const incoming = Array.isArray(items) ? items : (item ? [item] : []);
      if (incoming.length > 0) {
        for (const inc of incoming) {
          const incNgay = String(inc.ngay || inc.Ngay || '').trim();
          const incId = String(inc.id || inc.Id || '').trim();
          const incChungLoaiNorm = normalizeNhapDkChungLoai(String(inc.chungLoai || inc.ChungLoai || '').trim(), incId);
          const incLoai = incChungLoaiNorm.toLowerCase();
          const incSl = Math.max(0, parseInt(String(inc.sl !== undefined ? inc.sl : (inc.SL || 0)).replace(/[^0-9]/g, ''), 10) || 0);

          // Find by id first
          let idx = nhapDkStore.findIndex((x: any) => x.id === incId);
          // If not found by id, find by exact business match (same date, same type, same quantity)
          if (idx === -1) {
            idx = nhapDkStore.findIndex((x: any) =>
              String(x.ngay || '').trim() === incNgay &&
              normalizeNhapDkChungLoai(String(x.chungLoai || '').trim(), x.id).toLowerCase() === incLoai &&
              (Number(x.sl) || 0) === incSl
            );
          }

          if (idx >= 0) {
            nhapDkStore[idx] = {
              ...nhapDkStore[idx],
              ...inc,
              chungLoai: incChungLoaiNorm,
              nguoiNhap: inc.nguoiNhap || nhapDkStore[idx].nguoiNhap || '',
              ghiChu: inc.ghiChu !== undefined ? inc.ghiChu : (nhapDkStore[idx].ghiChu || '')
            };
          } else {
            nhapDkStore.unshift({ ...inc, chungLoai: incChungLoaiNorm });
          }
        }
        nhapDkStore = deduplicateNhapDkList(nhapDkStore);
        saveNhapDkStore();
        forwardNhapDkToGoogleSheet(nhapDkStore).catch(() => {});
      }

      res.json({ success: true, count: nhapDkStore.length, items: nhapDkStore });
    } catch (err: any) {
      console.warn('Error in /api/nhap-dk-963:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // CENTRALIZED KẾ HOẠCH TUẦN 963 STORE (SHEET KHTuan)
  // =========================================================================
  const khTuanStorePath = path.join(process.cwd(), 'kh_tuan_963_store.json');
  let khTuanStore: any[] = [];

  const normalizeKhTuanDate = (rawNgayIso: any, rawNgay: any): { ngayIso: string; ngay: string } | null => {
    const isoStr = String(rawNgayIso || '').trim();
    const ngayStr = String(rawNgay || '').trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) {
      const [y, m, d] = isoStr.split('-');
      return { ngayIso: isoStr, ngay: `${d}/${m}/${y}` };
    }
    const isoSlashMatch = ngayStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (isoSlashMatch) {
      const d = isoSlashMatch[1].padStart(2, '0');
      const m = isoSlashMatch[2].padStart(2, '0');
      const y = isoSlashMatch[3];
      return { ngayIso: `${y}-${m}-${d}`, ngay: `${d}/${m}/${y}` };
    }
    const isoDashMatch = ngayStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoDashMatch) {
      const y = isoDashMatch[1];
      const m = isoDashMatch[2].padStart(2, '0');
      const d = isoDashMatch[3].padStart(2, '0');
      return { ngayIso: `${y}-${m}-${d}`, ngay: `${d}/${m}/${y}` };
    }
    return null;
  };

  const deduplicateKhTuanList = (items: any[]): any[] => {
    if (!Array.isArray(items)) return [];
    const byDate = new Map<string, any>();
    for (const it of items) {
      if (!it) continue;
      const norm = normalizeKhTuanDate(it.ngayIso || it.NgayIso, it.ngay || it.Ngay);
      if (!norm) continue;
      const p1tt = Math.max(0, Number(it.p1tt ?? it['1P3G_TT'] ?? it['1P3G TT'] ?? 0) || 0);
      const p1gt = Math.max(0, Number(it.p1gt ?? it['1P3G_GT'] ?? it['1P3G GT'] ?? 0) || 0);
      const p3tt = Math.max(0, Number(it.p3tt ?? it['3P3G_TT'] ?? it['3P3G TT'] ?? 0) || 0);
      const p3gt = Math.max(0, Number(it.p3gt ?? it['3P3G_GT'] ?? it['3P3G GT'] ?? 0) || 0);
      const tong = p1tt + p1gt + p3tt + p3gt;
      const capNhatLuc = String(it.capNhatLuc || it.CapNhatLuc || new Date().toISOString());
      const nguoiCapNhat = String(it.nguoiCapNhat || it.NguoiCapNhat || '').trim();

      const existing = byDate.get(norm.ngayIso);
      if (!existing || capNhatLuc >= (existing.capNhatLuc || '')) {
        byDate.set(norm.ngayIso, {
          ngayIso: norm.ngayIso,
          ngay: norm.ngay,
          p1tt,
          p1gt,
          p3tt,
          p3gt,
          tong,
          nguoiCapNhat,
          capNhatLuc
        });
      }
    }
    return Array.from(byDate.values()).sort((a, b) => a.ngayIso.localeCompare(b.ngayIso));
  };

  const loadKhTuanStore = () => {
    try {
      if (fs.existsSync(khTuanStorePath)) {
        const raw = fs.readFileSync(khTuanStorePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          khTuanStore = deduplicateKhTuanList(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not load kh_tuan_963_store.json:', e);
    }
  };
  loadKhTuanStore();

  const saveKhTuanStore = () => {
    try {
      khTuanStore = deduplicateKhTuanList(khTuanStore);
      fs.writeFileSync(khTuanStorePath, JSON.stringify(khTuanStore, null, 2), 'utf8');
    } catch (e) {
      console.warn('Could not write kh_tuan_963_store.json:', e);
    }
  };

  const forwardKhTuanToGoogleSheet = async (items: any[]): Promise<{ ok: boolean; error?: string }> => {
    try {
      const cfg = getSharedConfig();
      const targetUrl = cfg.appScriptUrl || CANONICAL_APP_SCRIPT_URL;
      if (!targetUrl || !targetUrl.startsWith('http')) {
        return { ok: false, error: 'Chưa cấu hình URL Apps Script' };
      }

      const headers = ['Ngay', '1P3G_TT', '1P3G_GT', '3P3G_TT', '3P3G_GT', 'Tong', 'NguoiCapNhat', 'CapNhatLuc', 'NgayIso'];
      const rows = items.map(it => [
        it.ngay,
        it.p1tt,
        it.p1gt,
        it.p3tt,
        it.p3gt,
        it.tong,
        it.nguoiCapNhat || '',
        it.capNhatLuc || '',
        it.ngayIso
      ]);

      const bodyData = {
        action: 'overwrite_sheet',
        sheetName: 'KHTuan',
        spreadsheetId: cfg.spreadsheetId || CANONICAL_SPREADSHEET_ID,
        chunkIndex: 0,
        totalChunks: 1,
        headers,
        rows
      };

      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(bodyData)
      });
      const text = await res.text().catch(() => '');
      try {
        const j = JSON.parse(text);
        if (j && j.status === 'success') return { ok: true };
        return { ok: false, error: j?.message || text };
      } catch {
        return { ok: res.ok && !text.includes('Unknown action'), error: text };
      }
    } catch (e: any) {
      console.warn('Sync KHTuan to Google Sheet error:', e);
      return { ok: false, error: e?.message };
    }
  };

  app.get("/api/kh-tuan-963", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    loadKhTuanStore();
    res.json({ success: true, items: khTuanStore });
  });

  app.post("/api/kh-tuan-963", async (req, res) => {
    try {
      const { action, items, clientTodayIso } = req.body || {};

      if (action === 'set_all' && Array.isArray(items)) {
        khTuanStore = deduplicateKhTuanList(items);
        saveKhTuanStore();
        res.json({ success: true, count: khTuanStore.length, items: khTuanStore });
        return;
      }

      loadKhTuanStore();
      const todayIso = (typeof clientTodayIso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(clientTodayIso))
        ? clientTodayIso
        : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

      const existingMap = new Map<string, any>();
      for (const ex of khTuanStore) {
        existingMap.set(ex.ngayIso, ex);
      }

      const incoming = deduplicateKhTuanList(Array.isArray(items) ? items : []);
      let updatedCount = 0;
      for (const inc of incoming) {
        // Chỉ cho phép thay đổi và lưu các ngày CHƯA TỚI ngày thực hiện (ngayIso > todayIso)
        if (inc.ngayIso > todayIso) {
          existingMap.set(inc.ngayIso, inc);
          updatedCount++;
        } else if (!existingMap.has(inc.ngayIso)) {
          // Bỏ qua tạo mới nếu đã tới hoặc qua ngày thực hiện
        }
      }

      khTuanStore = Array.from(existingMap.values()).sort((a, b) => a.ngayIso.localeCompare(b.ngayIso));
      saveKhTuanStore();

      const sheetRes = await forwardKhTuanToGoogleSheet(khTuanStore);
      res.json({
        success: true,
        updatedCount,
        sheetSynced: sheetRes.ok,
        sheetError: sheetRes.ok ? undefined : sheetRes.error,
        items: khTuanStore
      });
    } catch (err: any) {
      console.warn('Error in /api/kh-tuan-963:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =========================================================================
  // CENTRALIZED USER MANAGEMENT STORE (SHEET CongTac CỘT A -> H)
  // =========================================================================
  const congTacUsersStorePath = path.join(process.cwd(), 'congtac_users_overrides.json');

  interface CongTacUsersOverlayStore {
    upserts: Record<string, any>;
    deletes: Record<string, { name: string; sheetSynced: boolean; updatedAt: string }>;
  }

  let congTacUsersStore: CongTacUsersOverlayStore = { upserts: {}, deletes: {} };

  const normalizeCongTacUserKey = (name: any): string =>
    String(name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase()
      .replace(/\s+/g, '');

  const loadCongTacUsersStore = () => {
    try {
      if (fs.existsSync(congTacUsersStorePath)) {
        const raw = fs.readFileSync(congTacUsersStorePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          congTacUsersStore = {
            upserts: parsed.upserts && typeof parsed.upserts === 'object' ? parsed.upserts : {},
            deletes: parsed.deletes && typeof parsed.deletes === 'object' ? parsed.deletes : {}
          };
        }
      }
    } catch (e) {
      console.warn('Could not load congtac_users_overrides.json:', e);
    }
  };
  loadCongTacUsersStore();

  const saveCongTacUsersStore = () => {
    try {
      fs.writeFileSync(congTacUsersStorePath, JSON.stringify(congTacUsersStore, null, 2), 'utf8');
    } catch (e) {
      console.warn('Could not write congtac_users_overrides.json:', e);
    }
  };

  app.get("/api/congtac-users", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    loadCongTacUsersStore();
    res.json({ success: true, store: congTacUsersStore });
  });

  app.post("/api/congtac-users", async (req, res) => {
    try {
      loadCongTacUsersStore();
      const { subAction, user, originalName, originalMsnv, trangThai, hasDailyReports, pruneUpsertKeys, pruneDeleteKeys } = req.body || {};

      if (subAction === 'prune') {
        let changed = false;
        if (Array.isArray(pruneUpsertKeys)) {
          for (const k of pruneUpsertKeys) {
            if (congTacUsersStore.upserts[k]?.sheetSynced) {
              delete congTacUsersStore.upserts[k];
              changed = true;
            }
          }
        }
        if (Array.isArray(pruneDeleteKeys)) {
          for (const k of pruneDeleteKeys) {
            if (congTacUsersStore.deletes[k]?.sheetSynced) {
              delete congTacUsersStore.deletes[k];
              changed = true;
            }
          }
        }
        if (changed) saveCongTacUsersStore();
        res.json({ success: true, store: congTacUsersStore });
        return;
      }

      if (!['add', 'update', 'toggle_lock', 'delete'].includes(subAction)) {
        res.status(400).json({ success: false, error: 'Thao tác không hợp lệ.' });
        return;
      }

      if (subAction === 'delete' && hasDailyReports) {
        res.json({
          success: false,
          reason: 'has_daily_reports',
          error: `Người dùng "${originalName || user?.name || ''}" đã có dữ liệu báo cáo ngày, không thể xóa!`
        });
        return;
      }

      const cfg = getSharedConfig();
      const targetUrl = cfg.appScriptUrl || CANONICAL_APP_SCRIPT_URL;
      let sheetSynced = false;
      let needsScriptDeploy = false;
      let sheetError = '';

      if (targetUrl && targetUrl.startsWith('http')) {
        try {
          const gRes = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'manage_congtac_user',
              subAction,
              spreadsheetId: cfg.spreadsheetId || CANONICAL_SPREADSHEET_ID,
              user,
              originalName,
              originalMsnv,
              trangThai
            })
          });
          const text = await gRes.text().catch(() => '');
          try {
            const j = JSON.parse(text);
            if (j && j.status === 'success') {
              sheetSynced = true;
            } else if (j && j.reason === 'has_daily_reports') {
              res.json({
                success: false,
                sheetSynced: false,
                reason: 'has_daily_reports',
                error: j.message || 'Người dùng đã có dữ liệu báo cáo ngày trong sheet CongTac, không thể xóa!'
              });
              return;
            } else if (j && j.message && String(j.message).includes('Unknown action')) {
              needsScriptDeploy = true;
              sheetError = j.message;
            } else if (j && j.status === 'error') {
              res.json({
                success: false,
                sheetSynced: false,
                error: j.message || 'Lỗi từ Google Apps Script'
              });
              return;
            } else {
              sheetError = j?.message || text;
            }
          } catch {
            if (text.includes('Unknown action')) needsScriptDeploy = true;
            else sheetError = text;
          }
        } catch (err: any) {
          sheetError = err?.message || 'Không kết nối được Apps Script';
        }
      }

      const nowIso = new Date().toISOString();
      const targetName = String(user?.name || originalName || '').trim();
      const origKey = normalizeCongTacUserKey(originalName || targetName);
      const newKey = normalizeCongTacUserKey(targetName);

      if (subAction === 'add' || subAction === 'update' || subAction === 'toggle_lock') {
        if (subAction === 'update' && origKey && newKey && origKey !== newKey) {
          delete congTacUsersStore.upserts[origKey];
          congTacUsersStore.deletes[origKey] = {
            name: String(originalName || ''),
            sheetSynced,
            updatedAt: nowIso
          };
        }
        if (newKey) {
          delete congTacUsersStore.deletes[newKey];
          const prev = congTacUsersStore.upserts[newKey] || {};
          congTacUsersStore.upserts[newKey] = {
            ...prev,
            ...(user || {}),
            ...(subAction === 'toggle_lock' ? { trangThai: String(trangThai) === '0' ? '0' : '1' } : {}),
            name: targetName || prev.name || originalName,
            originalName: originalName || prev.originalName,
            key: newKey,
            sheetSynced,
            updatedAt: nowIso
          };
        }
      } else if (subAction === 'delete') {
        if (origKey) {
          delete congTacUsersStore.upserts[origKey];
          congTacUsersStore.deletes[origKey] = {
            name: targetName,
            sheetSynced,
            updatedAt: nowIso
          };
        }
      }

      saveCongTacUsersStore();
      res.json({
        success: true,
        sheetSynced,
        needsScriptDeploy,
        sheetError: sheetSynced ? undefined : sheetError,
        store: congTacUsersStore
      });
    } catch (err: any) {
      console.warn('Error in /api/congtac-users:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API route to proxy Google Sheets requests (supports full export by GID to avoid filter truncation)
  app.get("/api/proxy/gviz", async (req, res) => {
    try {
      const sheet = req.query.sheet as string;
      let sheetId = req.query.sheetId as string || "1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ";
      const match = sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        sheetId = match[1];
      }
      if (!sheet) {
        res.status(400).send("Missing sheet parameter");
        return;
      }

      // Priority 1: Fetch via export?format=csv&gid=... if GID is available (bypasses Google Sheets active UI filter views)
      const gid = await getGidForSheet(sheetId, sheet);
      if (gid) {
        try {
          const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}&_t=${Date.now()}`;
          const exportRes = await fetch(exportUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          if (exportRes.ok) {
            const text = await exportRes.text();
            if (text && !text.includes('<html') && text.trim().length > 20) {
              res.setHeader("Content-Type", "text/csv; charset=utf-8");
              res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
              res.send(text);
              return;
            }
          }
        } catch (e) {}
      }
      
      // Priority 2: Fallback to gviz/tq
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}&_t=${Date.now()}`;
      const fetchRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!fetchRes.ok) {
        res.status(fetchRes.status).send(await fetchRes.text());
        return;
      }
      
      const text = await fetchRes.text();
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.send(text);
    } catch (e: any) {
      console.warn("Proxy gviz warning:", e.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use((req, res, next) => {
      if (!req.url.includes('/node_modules/.vite/deps/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      next();
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.json')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    // Express 4 uses '*'
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
