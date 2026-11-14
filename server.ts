import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API route for version info (always no-cache to ensure clients detect new releases immediately)
  const CANONICAL_APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFzMY2hA8LOgPix7FoN0n9nB3LAUlhuppc5KopO_ZD0fYU-uj4gpAZn5FnedGWr5vg2A/exec";
  const CANONICAL_SPREADSHEET_ID = "1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ";

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
  
  interface DvkhLiveStore {
    version: number;
    items: any[];
    updatedAt: string;
  }

  let dvkhStore: DvkhLiveStore = {
    version: 1,
    items: [],
    updatedAt: new Date().toISOString()
  };

  const loadDvkhStore = () => {
    try {
      if (fs.existsSync(dvkhStorePath)) {
        const raw = fs.readFileSync(dvkhStorePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items)) {
          dvkhStore = {
            version: Number(parsed.version) || 1,
            items: parsed.items,
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
      const { action, items, maKhs, senderId } = req.body || {};
      let changed = false;

      if (action === 'delete') {
        const targetKeys = new Set((maKhs || []).map((k: any) => String(k || '').trim().toLowerCase()));
        if (targetKeys.size > 0) {
          const initialLen = dvkhStore.items.length;
          dvkhStore.items = dvkhStore.items.filter((item: any) => !targetKeys.has(String(item.maKh || '').trim().toLowerCase()));
          if (dvkhStore.items.length !== initialLen) {
            changed = true;
          }
        }
        dvkhStore.version++;
        dvkhStore.updatedAt = new Date().toISOString();
        saveDvkhStore();

        // Broadcast to all other devices immediately
        broadcastDvkhEvent({
          type: 'dvkh_change',
          action: 'delete',
          maKhs,
          version: dvkhStore.version,
          senderId,
          timestamp: Date.now()
        });

        // Forward to Google Sheet in background
        forwardDvkhToGoogleSheet({
          action: 'delete_dvkh',
          maKhs: maKhs
        }).catch(() => {});

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

        const newItems: any[] = [];
        for (const inc of incomingItems) {
          const k = String(inc.maKh || '').trim().toLowerCase();
          if (!k) continue;

          if (itemMap.has(k)) {
            const existingIdx = itemMap.get(k)!;
            dvkhStore.items[existingIdx] = { ...dvkhStore.items[existingIdx], ...inc };
          } else {
            newItems.push(inc);
            itemMap.set(k, -1);
          }
          changed = true;
        }

        if (newItems.length > 0) {
          dvkhStore.items = [...newItems, ...dvkhStore.items];
        }

        dvkhStore.version++;
        dvkhStore.updatedAt = new Date().toISOString();
        saveDvkhStore();

        // Broadcast to all other devices immediately (<10ms!)
        broadcastDvkhEvent({
          type: 'dvkh_change',
          action: 'save',
          items: incomingItems,
          version: dvkhStore.version,
          senderId,
          timestamp: Date.now()
        });

        // Forward to Google Sheet in background
        forwardDvkhToGoogleSheet({
          action: 'save_dvkh',
          items: incomingItems
        }).catch(() => {});
      }

      res.json({ success: true, version: dvkhStore.version, count: dvkhStore.items.length });
    } catch (err: any) {
      console.warn('Error in /api/dvkh/sync:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Get Full Consolidated DVKH Dataset
  app.get("/api/dvkh/data", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({
      version: dvkhStore.version,
      items: dvkhStore.items,
      updatedAt: dvkhStore.updatedAt
    });
  });

  // 4. Fast Polling Endpoint (Fallback for mobile or reconnecting tabs)
  app.get("/api/dvkh/poll", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
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

  // Helper deduplication by ID and compound business key (date + chungLoai + sl)
  const deduplicateNhapDkList = (items: any[]): any[] => {
    if (!Array.isArray(items)) return [];
    const seenId = new Map<string, any>();
    const seenBiz = new Map<string, any>();

    for (const it of items) {
      if (!it) continue;
      const ngay = String(it.ngay || it.Ngay || '').trim();
      const chungLoai = String(it.chungLoai || it.ChungLoai || '').trim();
      const sl = Math.max(0, parseInt(String(it.sl !== undefined ? it.sl : (it.SL || 0)).replace(/[^0-9]/g, ''), 10) || 0);
      const ghiChu = String(it.ghiChu || it.GhiChu || '').trim();
      const nguoiNhap = String(it.nguoiNhap || it.NguoiNhap || '').trim();
      let id = String(it.id || it.Id || '').trim();

      if (!ngay && !chungLoai && sl === 0) continue;

      if (!id) {
        const cleanDate = ngay.replace(/[^0-9]/g, '');
        const cleanLoai = chungLoai.toLowerCase().replace(/[^a-z0-9]/g, '');
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
          nhapDkStore = deduplicateNhapDkList(parsed);
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
          const incLoai = String(inc.chungLoai || inc.ChungLoai || '').trim().toLowerCase();
          const incSl = Math.max(0, parseInt(String(inc.sl !== undefined ? inc.sl : (inc.SL || 0)).replace(/[^0-9]/g, ''), 10) || 0);

          // Find by id first
          let idx = nhapDkStore.findIndex((x: any) => x.id === inc.id);
          // If not found by id, find by exact business match (same date, same type, same quantity)
          if (idx === -1) {
            idx = nhapDkStore.findIndex((x: any) =>
              String(x.ngay || '').trim() === incNgay &&
              String(x.chungLoai || '').trim().toLowerCase() === incLoai &&
              (Number(x.sl) || 0) === incSl
            );
          }

          if (idx >= 0) {
            nhapDkStore[idx] = {
              ...nhapDkStore[idx],
              ...inc,
              nguoiNhap: inc.nguoiNhap || nhapDkStore[idx].nguoiNhap || '',
              ghiChu: inc.ghiChu !== undefined ? inc.ghiChu : (nhapDkStore[idx].ghiChu || '')
            };
          } else {
            nhapDkStore.unshift(inc);
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
