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

  // API route to proxy Google Sheets requests
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
      
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
      const fetchRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!fetchRes.ok) {
        res.status(fetchRes.status).send(await fetchRes.text());
        return;
      }
      
      const text = await fetchRes.text();
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
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
