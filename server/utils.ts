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

  const staticMiddleware = express.static(distPath);

  // Solo servir archivos estáticos si NO es una ruta /api
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }
    staticMiddleware(req, res, next);
  });

  // Catch-all para SPA (solo si no es /api)
  app.use("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
