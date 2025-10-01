import express from "express";
import fs from "fs";
import path from "path";

export function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
  console.log(`${formattedTime} [express] ${message}`);
}

export function serveStatic(app: express.Express) {
  const distPath = path.resolve(process.cwd(), "dist/public");

  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find dist folder at ${distPath}`);
  }

  // SPA fallback - solo para rutas que no existen
  app.use((req, res) => {
    // Si ya respondió, skip
    if (res.headersSent) return;

    // Intentar servir archivo estático primero
    const filePath = path.join(distPath, req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return res.sendFile(filePath);
    }

    // Si no es archivo y no empieza con /api o /webhook, servir index.html (SPA)
    if (!req.path.startsWith("/api") && !req.path.startsWith("/webhook")) {
      return res.sendFile(path.resolve(distPath, "index.html"));
    }

    // Para /api y /webhook que no matchearon, 404
    res.status(404).json({ error: "Not found" });
  });
}
