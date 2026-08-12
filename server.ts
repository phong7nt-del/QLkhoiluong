import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API route to proxy Google Sheets requests
  app.get("/api/proxy/gviz", async (req, res) => {
    try {
      const sheet = req.query.sheet as string;
      if (!sheet) {
        res.status(400).send("Missing sheet parameter");
        return;
      }
      
      const url = `https://docs.google.com/spreadsheets/d/1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
      const fetchRes = await fetch(url);
      
      if (!fetchRes.ok) {
        res.status(fetchRes.status).send(await fetchRes.text());
        return;
      }
      
      const text = await fetchRes.text();
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.send(text);
    } catch (e: any) {
      console.error("Proxy error:", e);
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
    app.use(express.static(distPath));
    // Express 4 uses '*'
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
