import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API route for version info (always no-cache to ensure clients detect new releases immediately)
  const getVersionData = () => {
    const candidatePaths = [
      path.join(process.cwd(), 'version.json'),
      path.join(process.cwd(), 'public', 'version.json'),
      path.join(process.cwd(), 'dist', 'version.json'),
    ];
    for (const vPath of candidatePaths) {
      try {
        if (fs.existsSync(vPath)) {
          return JSON.parse(fs.readFileSync(vPath, 'utf8'));
        }
      } catch (e) {}
    }
    return { version: "2026.10.07.1" };
  };

  app.get(["/api/version", "/version.json"], (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.json(getVersionData());
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
    'cbcnv': '1318742136'
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
